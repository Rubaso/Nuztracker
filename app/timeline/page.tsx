'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { SALA_ID, JUGADORES, RUTAS_ANIL, ESTADOS } from '@/lib/constants'
import PokemonSelectModal from '@/components/PokemonSelectModal'

function TimelineContent() {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  const [capturas, setCapturas] = useState<any[]>([])
  const [liveMap, setLiveMap] = useState<Record<number, boolean>>({})
  const [search, setSearch] = useState('')

  // Modales
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ jugadorId: number; jugadorNombre: string; ruta: string } | null>(null)

  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [activePokemon, setActivePokemon] = useState<{
    id: number
    jugadorId: number
    jugadorNombre: string
    ruta: string
    pokemonName: string
    pokemonId?: number
    habilidad?: string
    isShiny?: boolean
    estado: string
  } | null>(null)

  const [inputHabilidad, setInputHabilidad] = useState('')
  const [isShinyInput, setIsShinyInput] = useState(false)

  // Obtener jugador logueado de localStorage
  useEffect(() => {
    const saved = localStorage.getItem('logged_jugador')
    if (saved) {
      setLoggedPlayer(JSON.parse(saved))
    }
  }, [])

  const canEditCell = (jugadorId: number) => {
    return loggedPlayer !== null && loggedPlayer.id === jugadorId
  }

  const fetchCapturas = async () => {
    const { data } = await supabase.from('capturas').select('*').eq('sala_id', SALA_ID)
    if (data) setCapturas(data)
  }

  const fetchDirectos = async () => {
    const { data } = await supabase.from('directos').select('*')
    if (data) {
      const map: Record<number, boolean> = {}
      data.forEach((d: any) => { map[d.jugador_id] = d.is_live })
      setLiveMap(map)
    }
  }

  useEffect(() => {
    fetchCapturas()
    fetchDirectos()

    // Realtime capturas
    const channelCapturas = supabase.channel('realtime_timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capturas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRow = payload.new
          if (newRow.sala_id === SALA_ID) {
            setCapturas(prev => {
              if (prev.some(c => c.id === newRow.id)) return prev
              return [...prev, newRow]
            })
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedRow = payload.new
          setCapturas(prev => prev.map(c => c.id === updatedRow.id ? updatedRow : c))
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old
          setCapturas(prev => prev.filter(c => c.id !== oldRow.id))
        }
      })
      .subscribe()

    // Realtime directos
    const channelDirectos = supabase.channel('realtime_directos_timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directos' }, (payload: any) => {
        const updated = payload.new
        if (updated) {
          setLiveMap(prev => ({ ...prev, [updated.jugador_id]: updated.is_live }))
        }
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(channelCapturas)
      supabase.removeChannel(channelDirectos)
    }
  }, [])

  const addEntry = async (
    jugadorId: number, 
    ruta: string, 
    pokemonName: string, 
    pokemonId?: number
  ) => {
    if (!canEditCell(jugadorId)) return

    const newPokemon = {
      sala_id: SALA_ID,
      jugador_id: jugadorId,
      ruta: ruta,
      pokemon_name: pokemonName.toLowerCase().trim(),
      pokemon_id: pokemonId || null,
      estado: 'VIVO',
      habilidad: null,
      is_shiny: false
    }

    const { data, error } = await supabase.from('capturas').insert([newPokemon]).select()
    
    if (error) {
      console.error("Error al insertar captura:", error)
      return
    }

    if (data && data.length > 0) {
      setCapturas(prev => [...prev, data[0]])
    }
  }

  const updatePokemonStatus = async (
    id: number,
    estado: string,
    habilidad?: string,
    isShiny?: boolean
  ) => {
    const payload: any = {
      estado: estado,
      habilidad: habilidad || null,
      is_shiny: !!isShiny
    }

    setCapturas(prev => prev.map(c => c.id === id ? { ...c, ...payload } : c))

    await supabase.from('capturas').update(payload).eq('id', id)
  }

  const deleteEntry = async (id: number) => {
    setCapturas(prev => prev.filter(c => c.id !== id))
    setActionMenuOpen(false)
    setActivePokemon(null)

    await supabase.from('capturas').delete().eq('id', id)
  }

  const handleOpenSelectModal = (jugadorId: number, jugadorNombre: string, ruta: string) => {
    if (!canEditCell(jugadorId)) return
    setSelectedCell({ jugadorId, jugadorNombre, ruta })
    setModalOpen(true)
  }

  const handleSelectPokemon = (pokemonName: string, pokemonId: number) => {
    if (!selectedCell || !canEditCell(selectedCell.jugadorId)) return
    addEntry(selectedCell.jugadorId, selectedCell.ruta, pokemonName, pokemonId)
  }

  const handleOpenActionMenu = (reg: any, jugadorNombre: string) => {
    if (!canEditCell(reg.jugador_id)) return
    setActivePokemon({
      id: reg.id,
      jugadorId: reg.jugador_id,
      jugadorNombre,
      ruta: reg.ruta,
      pokemonName: reg.pokemon_name,
      pokemonId: reg.pokemon_id,
      habilidad: reg.habilidad || '',
      isShiny: !!reg.is_shiny,
      estado: reg.estado || 'VIVO'
    })
    setInputHabilidad(reg.habilidad || '')
    setIsShinyInput(!!reg.is_shiny)
    setActionMenuOpen(true)
  }

  const handleSavePokemonDetails = async () => {
    if (!activePokemon) return
    await updatePokemonStatus(
      activePokemon.id,
      activePokemon.estado,
      inputHabilidad,
      isShinyInput
    )
    setActionMenuOpen(false)
    setActivePokemon(null)
  }

  const getSpriteUrl = (id?: number, shiny?: boolean) => {
    if (!id) return null
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
  }

  const rutasFiltradas = RUTAS_ANIL.filter(r => r.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 w-full px-2 py-4">
      {/* Modal de Selección de Pokémon */}
      {selectedCell && canEditCell(selectedCell.jugadorId) && (
        <PokemonSelectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleSelectPokemon}
          jugadorNombre={selectedCell.jugadorNombre}
          ruta={selectedCell.ruta}
        />
      )}

      {/* Modal de Opciones */}
      {actionMenuOpen && activePokemon && canEditCell(activePokemon.jugadorId) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 capitalize flex items-center gap-2">
                  {activePokemon.pokemonName}
                  {isShinyInput && <span>✨</span>}
                </h3>
                <p className="text-xs text-slate-400">
                  {activePokemon.jugadorNombre} • {activePokemon.ruta}
                </p>
              </div>
              <button 
                onClick={() => setActionMenuOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-xl p-3 border border-slate-800 overflow-hidden">
              {activePokemon.pokemonId && (
                <img
                  src={getSpriteUrl(activePokemon.pokemonId, isShinyInput) || ''}
                  alt={activePokemon.pokemonName}
                  className="w-32 h-32 object-contain drop-shadow-md scale-125"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Habilidad del Pokémon
              </label>
              <input
                type="text"
                placeholder="Ej: Intimidación, Adaptable..."
                value={inputHabilidad}
                onChange={(e) => setInputHabilidad(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>✨</span> Variante Shiny
              </span>
              <button
                type="button"
                onClick={() => setIsShinyInput(!isShinyInput)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isShinyInput
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                {isShinyInput ? 'SÍ (SHINY)' : 'NO'}
              </button>
            </div>

            <button
              onClick={handleSavePokemonDetails}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-lg cursor-pointer"
            >
              Guardar Cambios
            </button>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => deleteEntry(activePokemon.id)}
                className="w-full py-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                Borrar Pokémon de este tramo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controles Superiores */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-white/10">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar tramo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d131f] text-zinc-100 text-sm rounded-xl pl-9 pr-4 py-2.5 border border-white/10 focus:outline-none focus:border-white/30 transition-all placeholder:text-zinc-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold tracking-wider uppercase text-zinc-300">
          {ESTADOS.map(st => (
            <div key={st.id} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${st.color}`}></span>
              <span>{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla Timeline */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0f17]/90 backdrop-blur-sm shadow-2xl">
        <table className="w-full text-left border-collapse min-w-[1300px]">
          <thead>
            <tr className="text-xs font-bold tracking-widest uppercase text-zinc-400 border-b border-white/10 bg-black/40">
              <th className="py-4 px-6 w-56 text-sm">Tramo</th>
              {JUGADORES.map(j => {
                const isMyColumn = loggedPlayer?.id === j.id
                const isLive = liveMap[j.id] || false

                return (
                  <th key={j.id} className={`py-4 px-4 text-center text-sm ${isMyColumn ? 'text-amber-400 font-extrabold bg-amber-500/5' : ''}`}>
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <span>{j.name}</span>
                        {isMyColumn && <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded">TÚ</span>}
                      </div>

                      {/* Insignia EN VIVO si el jugador transmite */}
                      {isLive && (
                        <a
                          href={(j as any).twitchUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 flex items-center gap-1 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.6)] hover:scale-105 transition-all"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          <span>EN VIVO</span>
                        </a>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-sm">
            {rutasFiltradas.map(ruta => (
              <tr key={ruta} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-5 px-6 font-semibold text-zinc-200 whitespace-nowrap text-sm align-top">{ruta}</td>

                {JUGADORES.map(j => {
                  const canEditThisCell = canEditCell(j.id)
                  const playerCapturas = capturas.filter(c => c.jugador_id === j.id && c.ruta === ruta)

                  return (
                    <td key={j.id} className={`py-4 px-3 text-center align-top ${loggedPlayer?.id === j.id ? 'bg-amber-500/[0.02]' : ''}`}>
                      <div className="flex flex-col items-center gap-3">
                        
                        {playerCapturas.map((reg) => {
                          const pkmn = reg.pokemon_name || ''
                          const rawStatus = reg.estado || 'VIVO'
                          const currentStatus = (rawStatus === 'PENDIENTE' || rawStatus === 'EN_BOX') ? 'VIVO' : rawStatus
                          const activeState = ESTADOS.find(e => e.id === currentStatus) || ESTADOS[0]
                          const spriteUrl = getSpriteUrl(reg.pokemon_id, reg.is_shiny)

                          return (
                            <div key={reg.id} className="flex flex-col items-center justify-center gap-1.5 group w-full max-w-[160px] bg-black/40 p-2 rounded-2xl border border-white/10 shadow-md">
                              {/* Tarjeta con overflow-hidden para recortar bordes vacíos al hacer zoom */}
                              <div 
                                className={`relative flex flex-col items-center justify-center w-28 h-28 bg-white/[0.03] rounded-xl border overflow-hidden transition-all ${
                                  canEditThisCell 
                                    ? 'cursor-pointer hover:bg-white/[0.08] border-white/10 hover:border-amber-500/50' 
                                    : 'cursor-default border-white/5 opacity-80'
                                }`}
                                onClick={() => canEditThisCell && handleOpenActionMenu(reg, j.name)}
                              >
                                {reg.is_shiny && (
                                  <span className="absolute top-1 left-1 text-sm z-10" title="Shiny">✨</span>
                                )}

                                {/* Sprite ampliado con scale-135 para rellenar la caja casi al 100% */}
                                {spriteUrl ? (
                                  <img
                                    src={spriteUrl}
                                    alt={pkmn}
                                    referrerPolicy="no-referrer"
                                    className={`w-full h-full object-contain scale-135 transition-transform ${
                                      canEditThisCell ? 'group-hover:scale-150' : ''
                                    } ${
                                      currentStatus === 'MUERTO' 
                                        ? 'grayscale opacity-35' 
                                        : currentStatus === 'ESCAPADO' || currentStatus === 'INTERCAMBIADO'
                                        ? 'opacity-25 grayscale' 
                                        : 'opacity-100'
                                    }`}
                                  />
                                ) : (
                                  <span className="text-xs text-zinc-400 capitalize">{pkmn}</span>
                                )}

                                {currentStatus === 'MUERTO' && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-rose-500 font-bold text-4xl z-10">✕</span>
                                  </div>
                                )}

                                {currentStatus === 'ESCAPADO' && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-amber-400 text-xl z-10">💨</span>
                                  </div>
                                )}

                                {currentStatus === 'INTERCAMBIADO' && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-purple-400 text-xl z-10">🔄</span>
                                  </div>
                                )}
                              </div>

                              <span className="text-xs font-bold text-zinc-200 capitalize truncate max-w-full">{pkmn}</span>

                              {reg.habilidad && (
                                <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                                  {reg.habilidad}
                                </span>
                              )}

                              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${activeState?.color || 'bg-emerald-500'}`}></span>
                                
                                {canEditThisCell ? (
                                  <select
                                    value={currentStatus}
                                    onChange={(e) => updatePokemonStatus(
                                      reg.id, 
                                      e.target.value, 
                                      reg.habilidad,
                                      reg.is_shiny
                                    )}
                                    className="bg-transparent text-[11px] font-semibold text-zinc-400 uppercase focus:outline-none cursor-pointer hover:text-zinc-200 transition-colors"
                                  >
                                    {ESTADOS.map(s => (
                                      <option key={s.id} value={s.id} className="bg-[#0b0f17] text-zinc-200">
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">
                                    {activeState?.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {canEditThisCell && (
                          <button
                            type="button"
                            onClick={() => handleOpenSelectModal(j.id, j.name, ruta)}
                            className="w-full py-2 px-2 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 text-amber-400 flex items-center justify-center transition-all font-bold text-xs cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 gap-1 max-w-[160px]"
                            title="Añadir otro Pokémon a este tramo"
                          >
                            <span className="text-sm">+</span>
                            <span className="text-[10px] uppercase font-bold">Añadir</span>
                          </button>
                        )}

                        {!canEditThisCell && playerCapturas.length === 0 && (
                          <span className="text-zinc-600 text-xs font-mono pt-2">-</span>
                        )}

                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500 text-sm">Cargando Nuztracker...</div>}>
      <TimelineContent />
    </Suspense>
  )
}