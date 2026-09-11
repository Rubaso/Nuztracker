'use client'

import './globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { JUGADORES } from '@/lib/constants'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  const [liveMap, setLiveMap] = useState<Record<number, boolean>>({})

  const pathname = usePathname()
  const isLandingPage = pathname === '/'

  useEffect(() => {
    // 1. Sincronizar sesión del jugador
    const checkSession = () => {
      const saved = localStorage.getItem('logged_jugador')
      if (saved) {
        setLoggedPlayer(JSON.parse(saved))
      } else {
        setLoggedPlayer(null)
      }
    }

    checkSession()
    window.addEventListener('storage', checkSession)

    // 2. Cargar estado inicial de directos desde Supabase
    const fetchDirectos = async () => {
      const { data } = await supabase.from('directos').select('*')
      if (data) {
        const map: Record<number, boolean> = {}
        data.forEach((d: any) => { map[d.jugador_id] = d.is_live })
        setLiveMap(map)
      }
    }
    fetchDirectos()

    // 3. Escuchar cambios de directos en tiempo real
    const channel = supabase.channel('realtime_directos_layout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directos' }, (payload: any) => {
        const updated = payload.new
        if (updated) {
          setLiveMap(prev => ({ ...prev, [updated.jugador_id]: updated.is_live }))
        }
      })
      .subscribe()

    return () => {
      window.removeEventListener('storage', checkSession)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('logged_jugador')
    setLoggedPlayer(null)
    window.location.href = '/'
  }

  const renderNavLink = (href: string, label: string) => {
    if (isLandingPage) {
      return (
        <span
          key={href}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 cursor-not-allowed select-none opacity-50"
          title="Selecciona una opción en pantalla para continuar"
        >
          {label}
        </span>
      )
    }

    return (
      <Link
        key={href}
        href={href}
        className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
      >
        {label}
      </Link>
    )
  }

  const jugadoresEnVivo = JUGADORES.filter(j => liveMap[j.id])

  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-[98vw] mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* BRANDING Y INDICADOR EN DIRECTO */}
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold tracking-tight text-amber-400 uppercase">
                  NUZTRACKER
                </h1>
              </Link>

              {/* Ticker de Jugadores en Directo */}
              {!isLandingPage && (
                <div className="flex items-center gap-2 text-xs border-l border-slate-800 pl-4 py-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">En directo:</span>
                  {jugadoresEnVivo.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {jugadoresEnVivo.map(j => (
                        <a
                          key={j.id}
                          href={j.twitchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/40 text-rose-400 px-2.5 py-0.5 rounded-lg hover:bg-rose-500/20 transition-all text-xs font-bold animate-pulse"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>{j.name}</span>
                          <span className="text-[10px] opacity-60">↗</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs italic">Nadie emitiendo</span>
                  )}
                </div>
              )}
            </div>

            {/* NAVEGACIÓN Y PERFIL DE JUGADOR */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
              <nav className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {renderNavLink('/timeline', 'Capturas')}
                {renderNavLink('/box', 'Nuestro PC')}
                {renderNavLink('/summary', 'TORNEO')}
              </nav>

              {/* BOTONERA SAVE Y POKEPASTE (Solo en /timeline para jugadores logueados) */}
              {loggedPlayer && pathname === '/timeline' && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black px-3 py-2 rounded-xl cursor-pointer shadow-lg transition-all hover:scale-105 active:scale-95">
                    <span>📂</span>
                    <span>Cargar Save</span>
                    <input
                      type="file"
                      accept=".rxdata,.sav"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          window.dispatchEvent(new CustomEvent('upload_save_file', { detail: file }))
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => window.dispatchEvent(new Event('open_pokepaste_modal'))}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all hover:border-amber-500/50 cursor-pointer"
                  >
                    <span>📋</span>
                    <span>PokéPaste</span>
                  </button>
                </div>
              )}

              {/* Badge Perfil */}
              {loggedPlayer ? (
                <div className="flex items-center gap-2 bg-slate-950 p-1 pl-3 rounded-xl border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300">🎮 {loggedPlayer.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] font-bold bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 px-2.5 py-1 rounded-lg transition-all cursor-pointer ml-1"
                    title="Cerrar sesión"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 px-3 py-2 rounded-xl">
                  <span className="text-xs font-bold text-sky-400">👀 Espectador</span>
                </div>
              )}
            </div>

          </div>
        </header>
        <main className="max-w-[98vw] mx-auto p-4">{children}</main>
      </body>
    </html>
  )
}