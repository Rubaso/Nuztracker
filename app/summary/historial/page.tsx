'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import history from '@/data/torneo_historial.json'

type Match = {
  id: string
  player1: string | null
  player2: string | null
  winner: string | null
}
type Round = { name: string; matches: Match[] }
type Tournament = (typeof history)[number] & {
  bracket_data: Round[]
  equipos: Record<string, string>
}

export default function HistorialTorneosPage() {
  const tournaments = history as Tournament[]
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<{ name: string; text: string } | null>(null)

  const ranking = useMemo(() => {
    const counts: Record<string, number> = {}
    tournaments.forEach((tournament) => {
      counts[tournament.campeon] = (counts[tournament.campeon] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [tournaments])

  const participants = (rounds: Round[]) => {
    const names = new Set<string>()
    rounds[0]?.matches.forEach((match) => {
      if (match.player1 && match.player1 !== 'BYE') names.add(match.player1)
      if (match.player2 && match.player2 !== 'BYE') names.add(match.player2)
    })
    return Array.from(names)
  }

  return (
    <div className="p-6 max-w-[98vw] mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black tracking-wider uppercase text-amber-400">📜 Historial de torneos</h1>
            <Link href="/summary" className="text-xs bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 px-3 py-1.5 rounded-lg font-bold transition-all">← Volver al torneo</Link>
          </div>
          <p className="text-xs text-slate-400 mt-1">Instantánea estática de los torneos exportados. Solo lectura.</p>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-lg font-black text-slate-200">No hay torneos exportados</h2>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Torneos guardados</div>
              <div className="text-3xl font-black text-slate-100 mt-2">{tournaments.length}</div>
            </div>
            <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-5 md:col-span-2">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">Palmarés</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {ranking.map(([player, wins], index) => (
                  <div key={player} className="bg-slate-900/80 border border-slate-700/60 px-3 py-2 rounded-xl text-xs font-bold text-slate-200">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆'} {player} <span className="text-amber-300">×{wins}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {tournaments.map((tournament) => (
              <button
                key={tournament.id}
                type="button"
                onClick={() => setSelectedTournament(tournament)}
                className="text-left bg-[#0d1322] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-xl transition-all hover:-translate-y-0.5"
              >
                <div className="text-xs text-slate-500 uppercase tracking-widest font-black">{tournament.nombre}</div>
                <div className="text-lg text-amber-300 font-black mt-1">🏆 {tournament.campeon}</div>
                <div className="text-[10px] text-slate-500 mt-2">{new Date(tournament.fecha).toLocaleDateString('es-ES')}</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-black">Participantes</div>
                    <div className="text-base text-slate-200 font-black mt-1">{participants(tournament.bracket_data || []).length}</div>
                  </div>
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-black">Equipos guardados</div>
                    <div className="text-base text-slate-200 font-black mt-1">{Object.keys(tournament.equipos || {}).length}</div>
                  </div>
                </div>
                <div className="text-[10px] text-sky-400 font-bold mt-4">👁️ Ver bracket y equipos →</div>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTournament(null)}>
          <div className="w-full max-w-7xl max-h-[92vh] overflow-y-auto bg-[#08101e] border border-slate-800 rounded-3xl shadow-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-black text-slate-500">{selectedTournament.nombre}</div>
                <h2 className="text-2xl font-black text-amber-300 mt-1">🏆 {selectedTournament.campeon}</h2>
                <p className="text-xs text-slate-400 mt-1">{new Date(selectedTournament.fecha).toLocaleString('es-ES')} · {selectedTournament.max_participants} plazas</p>
              </div>
              <button type="button" onClick={() => setSelectedTournament(null)} className="text-slate-400 hover:text-white bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl font-bold">✕ Cerrar</button>
            </div>

            <div className="mt-6 flex gap-8 overflow-x-auto pb-6">
              {selectedTournament.bracket_data.map((round) => (
                <section key={round.name} className="min-w-[250px] flex-1">
                  <h3 className="text-center text-xs font-black tracking-widest uppercase text-sky-400 bg-sky-950/40 border border-sky-800/50 py-2 rounded-xl">{round.name}</h3>
                  <div className="mt-5 flex flex-col justify-around gap-5 min-h-[300px]">
                    {round.matches.map((match) => (
                      <article key={match.id} className="bg-[#0d1322] border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
                        {[match.player1, match.player2].map((player, index) => (
                          <div key={`${match.id}-${index}`} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${player && match.winner === player ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900/80 border-slate-700/60 text-slate-200'}`}>
                            {player || '—'}{player && match.winner === player && ' 👑'}
                          </div>
                        ))}
                        <div className="text-[10px] font-black text-center text-slate-600 uppercase tracking-widest">VS</div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-2 border-t border-slate-800 pt-5">
              <h3 className="text-xs font-black tracking-widest uppercase text-amber-400 mb-3">Equipos de este torneo</h3>
              <div className="flex flex-wrap gap-2">
                {participants(selectedTournament.bracket_data || []).map((player) => (
                  <button
                    key={player}
                    type="button"
                    disabled={!selectedTournament.equipos?.[player]}
                    onClick={() => setSelectedTeam({ name: player, text: selectedTournament.equipos[player] || '' })}
                    className="bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-slate-200 hover:text-sky-300 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ⚔️ {player}
                  </button>
                ))}
              </div>
              {selectedTeam && (
                <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-sky-300">{selectedTeam.name}</h4>
                    <button type="button" onClick={() => setSelectedTeam(null)} className="text-slate-500 hover:text-white">✕</button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-slate-300">{selectedTeam.text}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
