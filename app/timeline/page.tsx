'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { SALA_ID, JUGADORES, RUTAS_ANIL, ESTADOS } from '@/lib/constants'
import PokemonSelectModal from '@/components/PokemonSelectModal'

function TimelineContent() {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  const [capturas, setCapturas] = useState<any[]>([])
  const [search, setSearch] = useState('')

  // Modales
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ jugadorId: number; jugadorNombre: string; ruta: string } | null>(null)

  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [activePokemon, setActivePokemon] = useState<{
    id?: number
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

  // Comprobar si el jugador logueado tiene permiso para editar la columna específica
  const canEditCell = (jugadorId: number) => {
    return loggedPlayer !== null && loggedPlayer.id === jugadorId
  }

  const fetchCapturas = async () => {
    const { data } = await supabase.from('capturas').select('*').eq('sala_id', SALA_ID)
    if (data) setCapturas(data)
  }

  useEffect(() => {
    fetchCapturas()

    const channel = supabase.channel('realtime_timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capturas' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newRow = payload.new
          if (newRow.sala_id === SALA_ID) {
            setCapturas(prev => {
              const index = prev.findIndex(c => c.jugador_id === newRow.jugador_id && c.ruta === newRow.ruta)
              if (index !== -1) {
                const updated = [...prev]
                updated[index] = newRow
                return updated
              }
              return [...prev, newRow]
            })
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old
          setCapturas(prev => prev.filter(c => c.id !== oldRow.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const updateEntry = async (
    jugadorId: number, 
    ruta: string, 
    pokemonName: string, 
    estado: string, 
    pokemonId?: number, 
    habilidad?: string,
    isShiny?: boolean
  ) => {
    if (!canEditCell(jugadorId)) return

    const payload: any = {
      sala_id: SALA_ID,
      jugador_id: jugadorId,
      ruta: ruta,
      pokemon_name: pokemonName.toLowerCase().trim(),
      estado: estado,
      habilidad: habilidad || null,
      is_shiny: !!isShiny
    }

    if (pokemonId) payload.pokemon_id = pokemonId

    setCapturas(prev => {
      const exists = prev.some(c => c.jugador_id === jugadorId && c.ruta === ruta)
      if (exists) {
        return prev.map(c => (c.jugador_id === jugadorId && c.ruta === ruta) ? { ...c, ...payload } : c)
      }
      return [...prev, payload]
    })

    await supabase.from('capturas').upsert(payload, { onConflict: 'sala_id,jugador_id,ruta' })
  }

  const deleteEntry = async (jugadorId: number, ruta: string) => {
    if (!canEditCell(jugadorId)) return
    setCapturas(prev => prev.filter(c => !(c.jugador_id === jugadorId && c.ruta === ruta)))
    setActionMenuOpen(false)
    setActivePokemon(null)

    await supabase.from('capturas').delete().match({
      sala_id: SALA_ID,
      jugador_id: jugadorId,
      ruta: ruta
    })
  }

  const handleOpenSelectModal = (jugadorId: number, jugadorNombre: string, ruta: string) => {
    if (!canEditCell(jugadorId)) return
    setSelectedCell({ jugadorId, jugadorNombre, ruta })
    setModalOpen(true)
  }

  const handleSelectPokemon = (pokemonName: string, pokemonId: number) => {
    if (!selectedCell || !canEditCell(selectedCell.jugadorId)) return
    updateEntry(selectedCell.jugadorId, selectedCell.ruta, pokemonName, 'VIVO', pokemonId, '', false)
  }

  const handleOpenActionMenu = (reg: any, jugadorId: number, jugadorNombre: string, ruta: string) => {
    if (!canEditCell(jugadorId)) return
    setActivePokemon({
      id: reg.id,
      jugadorId,
      jugadorNombre,
      ruta,
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
    if (!activePokemon || !canEditCell(activePokemon.jugadorId)) return
    await updateEntry(
      activePokemon.jugadorId,
      activePokemon.ruta,
      activePokemon.pokemonName,
      activePokemon.estado,
      activePokemon.pokemonId,
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
    <div className="space-y-8 max-w-[95vw] mx-auto px-4 py-8">
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

            <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-xl p-3 border border-slate-800">
              {activePokemon.pokemonId && (
                <img
                  src={getSpriteUrl(activePokemon.pokemonId, isShinyInput) || ''}
                  alt={activePokemon.pokemonName}
                  className="w-20 h-20 object-contain drop-shadow-md"
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

            <div className="pt-2 flex flex-col gap-2 border-t border-slate-800/80">
              <button
                onClick={() => {
                  setActionMenuOpen(false)
                  handleOpenSelectModal(activePokemon.jugadorId, activePokemon.jugadorNombre, activePokemon.ruta)
                }}
                className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cambiar Pokémon por otro
              </button>

              <button
                onClick={() => deleteEntry(activePokemon.jugadorId, activePokemon.ruta)}
                className="w-full py-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                Borrar Pokémon de la casilla
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
            placeholder="Buscar ruta..."
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
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="text-xs font-bold tracking-widest uppercase text-zinc-400 border-b border-white/10 bg-black/40">
              <th className="py-4 px-6 w-64 text-sm">Ruta</th>
              {JUGADORES.map(j => {
                const isMyColumn = loggedPlayer?.id === j.id
                return (
                  <th key={j.id} className={`py-4 px-4 text-center text-sm ${isMyColumn ? 'text-amber-400 font-extrabold bg-amber-500/5' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <span>{j.name}</span>
                      {isMyColumn && <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded">TÚ</span>}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-sm">
            {rutasFiltradas.map(ruta => (
              <tr key={ruta} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-4 px-6 font-semibold text-zinc-200 whitespace-nowrap text-sm">{ruta}</td>

                {JUGADORES.map(j => {
                  const canEditThisCell = canEditCell(j.id)
                  const reg = capturas.find(c => c.jugador_id === j.id && c.ruta === ruta) || {}
                  const pkmn = reg.pokemon_name || ''
                  const currentStatus = reg.estado || 'PENDIENTE'
                  const activeState = ESTADOS.find(e => e.id === currentStatus) || ESTADOS[0]

                  const spriteUrl = getSpriteUrl(reg.pokemon_id, reg.is_shiny)

                  return (
                    <td key={j.id} className={`py-4 px-3 text-center align-middle ${loggedPlayer?.id === j.id ? 'bg-amber-500/[0.02]' : ''}`}>
                      {pkmn && currentStatus !== 'PENDIENTE' ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 group">
                          <div 
                            className={`relative flex flex-col items-center justify-center w-16 h-16 bg-white/[0.02] rounded-xl border transition-all p-1 ${
                              canEditThisCell 
                                ? 'cursor-pointer hover:bg-white/[0.06] border-white/10 hover:border-amber-500/50' 
                                : 'cursor-default border-white/5 opacity-80'
                            }`}
                            onClick={() => canEditThisCell && handleOpenActionMenu(reg, j.id, j.name, ruta)}
                          >
                            {reg.is_shiny && (
                              <span className="absolute top-1 left-1 text-xs" title="Shiny">✨</span>
                            )}

                            {spriteUrl ? (
                              <img
                                src={spriteUrl}
                                alt={pkmn}
                                referrerPolicy="no-referrer"
                                className={`w-12 h-12 object-contain transition-all ${
                                  canEditThisCell ? 'group-hover:scale-110' : ''
                                } ${
                                  currentStatus === 'MUERTO' 
                                    ? 'grayscale opacity-35' 
                                    : currentStatus === 'ESCAPADO' 
                                    ? 'opacity-25 grayscale' 
                                    : 'opacity-100'
                                }`}
                              />
                            ) : (
                              <span className="text-xs text-zinc-400 capitalize">{pkmn}</span>
                            )}

                            {currentStatus === 'MUERTO' && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-rose-500 font-bold text-2xl">✕</span>
                              </div>
                            )}

                            {currentStatus === 'ESCAPADO' && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-amber-400 text-sm">💨</span>
                              </div>
                            )}
                          </div>

                          <span className="text-xs font-semibold text-zinc-200 capitalize">{pkmn}</span>

                          {reg.habilidad && (
                            <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/40 px-1.5 py-0.5 rounded truncate max-w-[90px]">
                              {reg.habilidad}
                            </span>
                          )}

                          <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${activeState.color}`}></span>
                            
                            {canEditThisCell ? (
                              <select
                                value={currentStatus}
                                onChange={(e) => updateEntry(
                                  j.id, 
                                  ruta, 
                                  pkmn, 
                                  e.target.value, 
                                  reg.pokemon_id, 
                                  reg.habilidad,
                                  reg.is_shiny
                                )}
                                className="bg-transparent text-[11px] font-semibold text-zinc-400 uppercase focus:outline-none cursor-pointer tracking-wider hover:text-zinc-200 transition-colors"
                              >
                                {ESTADOS.map(s => (
                                  <option key={s.id} value={s.id} className="bg-[#0b0f17] text-zinc-200">
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                {activeState.label}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        canEditThisCell ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSelectModal(j.id, j.name, ruta)}
                            className="w-10 h-10 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 text-amber-400 flex items-center justify-center mx-auto transition-all font-medium text-base cursor-pointer bg-amber-500/5 hover:bg-amber-500/10"
                            title="Seleccionar Pokémon"
                          >
                            +
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-xs font-mono">-</span>
                        )
                      )}
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