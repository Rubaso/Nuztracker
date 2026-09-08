'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { SALA_ID, JUGADORES } from '@/lib/constants'
import EvolveModal from '@/components/EvolveModal'

function BoxContent() {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  const [capturas, setCapturas] = useState<any[]>([])
  const [selectedJugadorId, setSelectedJugadorId] = useState<number>(JUGADORES[0].id)
  const [search, setSearch] = useState('')

  const [evolveModalOpen, setEvolveModalOpen] = useState(false)
  const [selectedEvolvePkmn, setSelectedEvolvePkmn] = useState<any | null>(null)

  // 1. Obtener la sesión activa del jugador desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('logged_jugador')
    if (saved) {
      const parsed = JSON.parse(saved)
      setLoggedPlayer(parsed)
      if (parsed?.id) {
        setSelectedJugadorId(parsed.id)
      }
    }
  }, [])

  // Comprobar si el usuario logueado puede editar la caja activa
  const canEditCurrentBox = loggedPlayer !== null && loggedPlayer.id === selectedJugadorId

  const fetchCapturas = async () => {
    const { data } = await supabase.from('capturas').select('*').eq('sala_id', SALA_ID)
    if (data) setCapturas(data)
  }

  useEffect(() => {
    fetchCapturas()
    const channel = supabase.channel('realtime_box')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capturas' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setCapturas(prev => {
            const idx = prev.findIndex(c => c.id === payload.new.id)
            if (idx !== -1) {
              const copy = [...prev]
              copy[idx] = payload.new
              return copy
            }
            return [...prev, payload.new]
          })
        } else if (payload.eventType === 'DELETE') {
          setCapturas(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleEvolve = async (evolvedName: string, evolvedId: number, nuevaHabilidad?: string) => {
    if (!canEditCurrentBox || !selectedEvolvePkmn) return

    const updates = {
      is_evolved: true,
      evolved_name: evolvedName.toLowerCase().trim(),
      evolved_id: evolvedId,
      evolved_habilidad: nuevaHabilidad || null,
    }

    setCapturas(prev => prev.map(c => c.id === selectedEvolvePkmn.id ? { ...c, ...updates } : c))
    setEvolveModalOpen(false)
    setSelectedEvolvePkmn(null)

    await supabase.from('capturas').update(updates).eq('id', selectedEvolvePkmn.id)
  }

  const handleRevertEvolve = async () => {
    if (!canEditCurrentBox || !selectedEvolvePkmn) return

    const updates = {
      is_evolved: false,
      evolved_name: null,
      evolved_id: null,
      evolved_habilidad: null,
    }

    setCapturas(prev => prev.map(c => c.id === selectedEvolvePkmn.id ? { ...c, ...updates } : c))
    setEvolveModalOpen(false)
    setSelectedEvolvePkmn(null)

    await supabase.from('capturas').update(updates).eq('id', selectedEvolvePkmn.id)
  }

  const toggleTeam = async (pkmn: any) => {
    if (!canEditCurrentBox) return

    const isCurrentlyTeam = !!pkmn.is_team

    if (!isCurrentlyTeam) {
      const equipoActualCount = capturas.filter(
        c => c.jugador_id === pkmn.jugador_id && c.is_team && c.estado !== 'MUERTO'
      ).length

      if (equipoActualCount >= 6) {
        alert('¡Ya tienes 6 Pokémon en tu equipo! Desmarca uno primero.')
        return
      }
    }

    const newTeamState = !isCurrentlyTeam

    setCapturas(prev =>
      prev.map(c => (c.id === pkmn.id ? { ...c, is_team: newTeamState } : c))
    )

    await supabase.from('capturas').update({ is_team: newTeamState }).eq('id', pkmn.id)
  }

  const jugadoresFiltrados = JUGADORES.filter(j => 
    j.name.toLowerCase().includes(search.toLowerCase())
  )

  const capturasJugador = capturas.filter(c => c.jugador_id === selectedJugadorId)

  const boxPokemon = capturasJugador.filter(c => c.estado !== 'MUERTO')
  const gravePokemon = capturasJugador.filter(c => c.estado === 'MUERTO')

  const jugadorActivo = JUGADORES.find(j => j.id === selectedJugadorId)

  const getSpriteUrl = (id: number, shiny: boolean) => {
    if (!id) return ''
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
  }

  const ACCENT_COLORS = [
    'from-sky-500 to-indigo-600',
    'from-pink-500 to-rose-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-purple-500 to-violet-600',
  ]

  return (
    <div className="space-y-8 p-6 max-w-[95vw] mx-auto">
      {canEditCurrentBox && selectedEvolvePkmn && (
        <EvolveModal
          isOpen={evolveModalOpen}
          onClose={() => {
            setEvolveModalOpen(false)
            setSelectedEvolvePkmn(null)
          }}
          onEvolve={handleEvolve}
          onRevert={handleRevertEvolve}
          basePokemon={{
            name: selectedEvolvePkmn.pokemon_name,
            id: selectedEvolvePkmn.pokemon_id,
            isShiny: selectedEvolvePkmn.is_shiny,
            isEvolved: selectedEvolvePkmn.is_evolved,
            evolvedName: selectedEvolvePkmn.evolved_name,
            habilidadActual: selectedEvolvePkmn.evolved_habilidad || selectedEvolvePkmn.habilidad || ''
          }}
        />
      )}

      {/* BARRA SUPERIOR DE BÚSQUEDA Y NOMBRE DE JUGADOR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#121c31] text-slate-200 text-base rounded-lg px-4 py-2 border border-slate-700/80 focus:outline-none"
          />
        </div>

        <h2 className="text-base font-black tracking-widest uppercase text-slate-300">
          Caja de {jugadorActivo?.name}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LISTA DE JUGADORES (IZQUIERDA) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-black tracking-widest uppercase text-pink-500">JUGADORES</h3>

          <div className="flex flex-col gap-3">
            {jugadoresFiltrados.map((j, idx) => {
              const isSelected = j.id === selectedJugadorId
              const isMyPlayer = loggedPlayer?.id === j.id
              
              const pokemonEstrella = capturas.filter(
                (c) => c.jugador_id === j.id && c.estado !== 'MUERTO' && c.is_team
              ).slice(0, 6)

              const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length]

              return (
                <button
                  key={j.id}
                  onClick={() => setSelectedJugadorId(j.id)}
                  className={`w-full text-left pl-7 pr-4 py-3 rounded-2xl border font-bold text-base cursor-pointer transition-all flex items-center justify-between gap-3 relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-900/80 to-indigo-950/80 border-sky-500/50 text-white shadow-lg'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b ${accentColor}`} />

                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate shrink-0 text-base font-black">{j.name}</span>
                    {isMyPlayer && (
                      <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                        TÚ
                      </span>
                    )}
                  </div>

                  <div className="flex items-center -space-x-3 overflow-hidden py-1 min-h-[56px]">
                    {pokemonEstrella.map((pkmn) => {
                      const id = pkmn.is_evolved && pkmn.evolved_id ? pkmn.evolved_id : pkmn.pokemon_id
                      const url = getSpriteUrl(id, pkmn.is_shiny)
                      if (!url) return null

                      return (
                        <img
                          key={pkmn.id}
                          src={url}
                          alt={pkmn.pokemon_name}
                          className="w-14 h-14 object-contain shrink-0 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]"
                        />
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* BOX CENTRAL */}
        <div className="lg:col-span-7 space-y-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-widest uppercase text-sky-400">CAJA</h3>
              {!canEditCurrentBox && (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  🔒 Modo Lectura
                </span>
              )}
            </div>

            {boxPokemon.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">Ningún Pokémon en la caja</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {boxPokemon.map((c) => {
                  const baseSpriteUrl = getSpriteUrl(c.pokemon_id, c.is_shiny)
                  const evolvedSpriteUrl = c.evolved_id ? getSpriteUrl(c.evolved_id, c.is_shiny) : null

                  return (
                    <div 
                      key={c.id}
                      className={`flex flex-col items-center bg-[#0d1322] border p-4 rounded-2xl min-w-[200px] relative transition-all shadow-xl ${
                        c.is_team
                          ? 'border-yellow-500/60 ring-1 ring-yellow-500/30'
                          : c.is_evolved 
                            ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-[#0d1322]' 
                            : 'border-slate-800/80'
                      }`}
                    >
                      {/* Botón de ESTRELLA */}
                      <button
                        type="button"
                        onClick={() => toggleTeam(c)}
                        disabled={!canEditCurrentBox}
                        title={
                          !canEditCurrentBox
                            ? 'Solo el propietario puede editar'
                            : c.is_team
                            ? 'Quitar del equipo'
                            : 'Añadir al equipo (máx 6)'
                        }
                        className={`absolute top-3 left-3 text-base transition-transform active:scale-125 ${
                          canEditCurrentBox ? 'cursor-pointer' : 'cursor-default opacity-20'
                        } ${
                          c.is_team
                            ? 'opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                            : 'hover:opacity-80 grayscale'
                        }`}
                      >
                        ⭐
                      </button>

                      {c.is_shiny && (
                        <span className="absolute top-3 left-9 text-sm" title="Shiny">✨</span>
                      )}

                      {/* Botón de Evolución */}
                      {canEditCurrentBox && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvolvePkmn(c)
                            setEvolveModalOpen(true)
                          }}
                          className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            c.is_evolved 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-amber-400 hover:border-amber-400/50'
                          }`}
                        >
                          ⚡ {c.is_evolved ? 'Evolucionado' : 'Evolucionar'}
                        </button>
                      )}

                      {c.is_evolved && c.evolved_name ? (
                        <div className="flex items-center justify-center gap-3 mt-7 mb-2">
                          <div className="flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity">
                            <img src={baseSpriteUrl} alt={c.pokemon_name} className="w-10 h-10 object-contain" />
                            <span className="text-[10px] font-semibold text-slate-400 capitalize">{c.pokemon_name}</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="text-amber-400 font-black text-base animate-pulse">➔</span>
                          </div>

                          <div className="flex flex-col items-center bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                            <img src={evolvedSpriteUrl!} alt={c.evolved_name} className="w-16 h-16 object-contain drop-shadow-md" />
                            <span className="text-xs font-bold text-amber-300 capitalize mt-1">{c.evolved_name}</span>
                            {c.evolved_habilidad && (
                              <span className="text-[10px] text-amber-200 font-semibold bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-800/60 mt-1 truncate max-w-[100px]">
                                {c.evolved_habilidad}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center mt-6">
                          <img src={baseSpriteUrl} alt={c.pokemon_name} className="w-20 h-20 object-contain" />
                          <span className="text-sm font-bold text-slate-200 capitalize mt-1">
                            {c.pokemon_name}
                          </span>
                          {c.habilidad && (
                            <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800/40 mt-1.5 truncate max-w-[120px]">
                              {c.habilidad}
                            </span>
                          )}
                        </div>
                      )}

                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px] mt-3 border-t border-slate-800/60 pt-1.5 w-full text-center">
                        {c.ruta}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* CEMENTERIO */}
          <div className="space-y-4">
            <h3 className="text-xs font-black tracking-widest uppercase text-rose-500">MUELTOS</h3>
            {gravePokemon.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">Ninguno</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {gravePokemon.map((c) => {
                  const pkmnId = c.is_evolved && c.evolved_id ? c.evolved_id : c.pokemon_id
                  const pkmnName = c.is_evolved && c.evolved_name ? c.evolved_name : c.pokemon_name
                  const spriteUrl = getSpriteUrl(pkmnId, c.is_shiny)

                  return (
                    <div key={c.id} className="flex flex-col items-center bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl min-w-[120px] relative">
                      <img src={spriteUrl} alt={pkmnName} className="w-16 h-16 object-contain grayscale opacity-40" />
                      <span className="text-rose-500 font-black text-3xl absolute top-3">✕</span>
                      <span className="text-xs font-bold text-slate-400 capitalize mt-1">{pkmnName}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BoxPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-slate-500">Cargando BOX...</div>}>
      <BoxContent />
    </Suspense>
  )
}