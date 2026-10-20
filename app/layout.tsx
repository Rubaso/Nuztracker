import './globals.css'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-[98vw] mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-xl font-bold tracking-tight text-amber-400 uppercase">NUZTRACKER</h1>
            </Link>
            <nav className="flex flex-wrap justify-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <Link href="/timeline" className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">Capturas</Link>
              <Link href="/box" className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">Nuestro PC</Link>
              <Link href="/summary" className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">TORNEO</Link>
            </nav>
            <span className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 px-3 py-2 rounded-xl text-xs font-bold text-sky-400">
              📦 Instantánea estática · Solo lectura
            </span>
          </div>
        </header>
        <main className="max-w-[98vw] mx-auto p-4">{children}</main>
      </body>
    </html>
  )
}
