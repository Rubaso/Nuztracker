import Link from 'next/link'
import torneo from '@/data/torneo.json'

type Round = {
  name: string
  matches: {
    id: string
    player1: string | null
    player2: string | null
    winner: string | null
  }[]
}

const snapshot = torneo[0]
const rounds = (snapshot?.bracket_data || []) as Round[]
const finalMatch = rounds.at(-1)?.matches[0]
const champion = finalMatch?.winner

export default function SummaryPage() {
  return (
    <div className="p-6 max-w-[98vw] mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-amber-400">🏆 Cuadro del Torneo</h1>
          <p className="text-xs text-slate-400 mt-1">
            {snapshot ? `Instantánea del ${new Date(snapshot.updated_at || '').toLocaleDateString('es-ES')}.` : 'No hay datos de torneo.'} Solo lectura.
          </p>
        </div>
        <Link href="/summary/historial" className="text-xs bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 px-3 py-2 rounded-lg font-bold transition-all">
          📜 Historial
        </Link>
      </div>

      {champion && (
        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 px-4 py-4">
          <div className="text-[10px] uppercase tracking-widest font-black text-amber-400">🏆 Final en la instantánea</div>
          <div className="text-lg font-black text-amber-200 mt-1">{finalMatch?.player1} vs {finalMatch?.player2}</div>
          <div className="text-xs text-slate-400 mt-1">Ganador registrado: {champion}</div>
        </div>
      )}

      {rounds.length === 0 ? (
        <p className="text-center py-12 text-slate-500">No hay cuadro de torneo en los datos exportados.</p>
      ) : (
        <div className="flex gap-8 overflow-x-auto pb-8 items-start">
          {rounds.map((round) => (
            <section key={round.name} className="flex flex-col gap-5 min-w-[260px] flex-1">
              <h2 className="text-center text-xs font-black tracking-widest uppercase text-sky-400 bg-sky-950/40 border border-sky-800/50 py-2 rounded-xl">{round.name}</h2>
              <div className="flex flex-col justify-around flex-1 gap-5">
                {round.matches.map((match) => (
                  <article key={match.id} className="bg-[#0d1322] border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2">
                    {[match.player1, match.player2].map((player, index) => (
                      <div key={`${match.id}-${index}`} className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold ${match.winner && match.winner === player ? 'bg-amber-500/20 border-amber-500 text-amber-300' : player === 'BYE' ? 'bg-slate-950/50 border-slate-900 text-slate-600 italic' : 'bg-slate-900/80 border-slate-700/60 text-slate-200'}`}>
                        {player || '—'}{match.winner === player && player && ' 👑'}
                      </div>
                    ))}
                    <span className="text-[10px] font-black text-center text-slate-600 uppercase tracking-widest">VS</span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
