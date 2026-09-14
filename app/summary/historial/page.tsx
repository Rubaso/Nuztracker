'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SALA_ID, JUGADORES } from '@/lib/constants'
import TeamViewerModal from '@/components/TeamViewerModal'

interface Match {
  id: string
  player1: string | null
  player2: string | null
  winner: string | null
}

interface Round {
  name: string
  matches: Match[]
}

interface TournamentHistory {
  id: number
  sala_id: string
  nombre: string
  fecha: string
  campeon: string
  max_participants: number
  bracket_data: Round[]
  equipos: Record<string, string>
  torneo_hash: string
}

function getParticipantNames(rounds: Round[]) {
  const names = new Set<string>()

  rounds[0]?.matches.forEach((match) => {
    if (match.player1 && match.player1 !== 'BYE') names.add(match.player1)
    if (match.player2 && match.player2 !== 'BYE') names.add(match.player2)
  })

  return Array.from(names)
}

export default function HistorialTorneosPage() {
  const [torneos, setTorneos] = useState<TournamentHistory[]>([])
  const [selectedTournament, setSelectedTournament] = useState<TournamentHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<{ name: string; pokepaste: string } | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('torneo_historial')
      .select('id, sala_id, nombre, fecha, campeon, max_participants, bracket_data, equipos, torneo_hash')
      .eq('sala_id', SALA_ID)
      .order('fecha', { ascending: false })

    if (error) {
      console.error(error)
      setErrorMessage('No se pudo cargar el historial. ¿Has ejecutado el SQL de torneo_historial?')
      setTorneos([])
    } else {
      setErrorMessage(null)
      setTorneos((data || []) as TournamentHistory[])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()

    const channel = supabase
      .channel('realtime_torneo_historial')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneo_historial' }, () => {
        fetchHistory()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const ranking = useMemo(() => {
    const counts: Record<string, number> = {}

    torneos.forEach((torneo) => {
      counts[torneo.campeon] = (counts[torneo.campeon] || 0) + 1
    })

    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [torneos])

  const openHistoricTeam = (playerName: string) => {
    if (!selectedTournament) return

    const pokepaste = selectedTournament.equipos?.[playerName] || ''

    setSelectedPlayer({
      name: playerName,
      pokepaste,
    })
    setTeamModalOpen(true)
  }

  const getPlayerDisplayName = (name: string) => {
    return JUGADORES.find((j) => j.name === name)?.name || name
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-bold">Cargando historial...</div>
  }

  return (
    <div className="p-6 max-w-[98vw] mx-auto space-y-8">
      {selectedPlayer && (
        <TeamViewerModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          jugadorNombre={selectedPlayer.name}
          pokepasteText={selectedPlayer.pokepaste}
          isPublished
          isEditable={false}
          onSavePokepaste={() => {}}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-wider uppercase text-amber-400">📜 Historial de torneos</h1>
            <Link
              href="/summary"
              className="text-xs bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 px-3 py-1.5 rounded-lg font-bold transition-all"
            >
              ← Volver al torneo
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Todos los torneos guardados quedan congelados con su bracket y sus equipos originales.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs px-4 py-3 rounded-xl text-center font-bold">
          ⚠️ {errorMessage}
        </div>
      )}

      {torneos.length === 0 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-lg font-black text-slate-200">Todavía no hay torneos guardados</h2>
          <p className="text-xs text-slate-500 mt-2">Cuando termine el primer torneo, pulsa «🏆 Guardar torneo» en el bracket.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Torneos jugados</div>
              <div className="text-3xl font-black text-slate-100 mt-2">{torneos.length}</div>
            </div>
            <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 md:col-span-2">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Palmarés</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {ranking.map(([player, wins], index) => (
                  <div key={player} className="bg-slate-900/80 border border-slate-700/60 px-3 py-2 rounded-xl text-xs font-bold text-slate-200">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆'} {getPlayerDisplayName(player)} <span className="text-amber-300">×{wins}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {torneos.map((torneo) => {
              const participants = getParticipantNames(torneo.bracket_data || [])

              return (
                <button
                  key={torneo.id}
                  type="button"
                  onClick={() => setSelectedTournament(torneo)}
                  className="text-left bg-[#0d1322] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-xl transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-widest font-black">{torneo.nombre}</div>
                      <div className="text-lg text-amber-300 font-black mt-1">🏆 {torneo.campeon}</div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                      {new Date(torneo.fecha).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-black">Participantes</div>
                      <div className="text-base text-slate-200 font-black mt-1">{participants.length}</div>
                    </div>
                    <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-black">Equipos</div>
                      <div className="text-base text-slate-200 font-black mt-1">{Object.keys(torneo.equipos || {}).length}</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-sky-400 font-bold mt-4">👁️ Ver bracket y equipos →</div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-7xl max-h-[92vh] overflow-y-auto bg-[#08101e] border border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">{selectedTournament.nombre}</div>
                <h2 className="text-2xl font-black text-amber-300 mt-1">🏆 {selectedTournament.campeon}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(selectedTournament.fecha).toLocaleString('es-ES')} • {selectedTournament.max_participants} plazas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTournament(null)}
                className="text-slate-400 hover:text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl font-bold"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="mt-6 flex gap-8 overflow-x-auto pb-6 custom-scrollbar">
              {(selectedTournament.bracket_data || []).map((round) => (
                <div key={round.name} className="min-w-[250px] flex-1">
                  <h3 className="text-center text-xs font-black tracking-widest uppercase text-sky-400 bg-sky-950/40 border border-sky-800/50 py-2 rounded-xl">
                    {round.name}
                  </h3>

                  <div className="mt-5 flex flex-col justify-around gap-5 min-h-[380px]">
                    {round.matches.map((match) => (
                      <div key={match.id} className="bg-[#0d1322] border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
                        <div className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold ${
                          match.winner === match.player1 && match.player1
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : match.player1 === 'BYE'
                            ? 'bg-slate-950/50 border-slate-900 text-slate-600 italic'
                            : 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{match.player1 || '—'}</span>
                            {match.player1 && match.player1 !== 'BYE' && (
                              <button
                                type="button"
                                onClick={() => openHistoricTeam(match.player1!)}
                                disabled={!selectedTournament.equipos?.[match.player1!]}
                                className="text-[11px] hover:scale-125 transition-transform disabled:opacity-30"
                                title={selectedTournament.equipos?.[match.player1!] ? 'Ver equipo de este torneo' : 'No hay PokéPaste guardado'}
                              >
                                ⚔️
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] font-black text-center text-slate-600 uppercase tracking-widest">VS</div>

                        <div className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold ${
                          match.winner === match.player2 && match.player2
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : match.player2 === 'BYE'
                            ? 'bg-slate-950/50 border-slate-900 text-slate-600 italic'
                            : 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{match.player2 || '—'}</span>
                            {match.player2 && match.player2 !== 'BYE' && (
                              <button
                                type="button"
                                onClick={() => openHistoricTeam(match.player2!)}
                                disabled={!selectedTournament.equipos?.[match.player2!]}
                                className="text-[11px] hover:scale-125 transition-transform disabled:opacity-30"
                                title={selectedTournament.equipos?.[match.player2!] ? 'Ver equipo de este torneo' : 'No hay PokéPaste guardado'}
                              >
                                ⚔️
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 border-t border-slate-800 pt-5">
              <h3 className="text-xs font-black tracking-widest uppercase text-amber-400 mb-3">Equipos de este torneo</h3>
              <div className="flex flex-wrap gap-2">
                {getParticipantNames(selectedTournament.bracket_data || []).map((player) => (
                  <button
                    key={player}
                    type="button"
                    onClick={() => openHistoricTeam(player)}
                    disabled={!selectedTournament.equipos?.[player]}
                    className="bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-slate-200 hover:text-sky-300 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ⚔️ {player}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
