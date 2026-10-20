import Link from 'next/link'

const pages = [
  { href: '/timeline', icon: '📍', title: 'Capturas', description: 'Explora las capturas registradas de todos los jugadores.' },
  { href: '/box', icon: '📦', title: 'Nuestro PC', description: 'Consulta los equipos actuales y el cementerio.' },
  { href: '/summary', icon: '🏆', title: 'Torneo', description: 'Revisa el cuadro del torneo y su historial.' },
]

export default function HomePage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-[#0d1322] border border-slate-800 p-8 rounded-3xl max-w-3xl w-full space-y-8 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-amber-400 uppercase tracking-wider">⚔️ Nuztracker</h1>
          <p className="text-sm text-slate-400">Archivo estático de la partida. Los datos son una instantánea y no se actualizan.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl transition-colors text-center"
            >
              <span className="text-3xl">{page.icon}</span>
              <h2 className="font-black text-amber-300 mt-3">{page.title}</h2>
              <p className="text-xs text-slate-400 mt-2">{page.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
