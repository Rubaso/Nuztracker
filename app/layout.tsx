'use client'

import './globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation' // 1. Importamos usePathname

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  
  // 2. Obtenemos la ruta actual y comprobamos si es la Home
  const pathname = usePathname()
  const isLandingPage = pathname === '/'

  useEffect(() => {
    // Función para sincronizar la sesión del jugador activa
    const checkSession = () => {
      const saved = localStorage.getItem('logged_jugador')
      if (saved) {
        setLoggedPlayer(JSON.parse(saved))
      } else {
        setLoggedPlayer(null)
      }
    }

    checkSession()

    // Sincronizar en tiempo real si cambia la sesión o el perfil
    window.addEventListener('storage', checkSession)
    return () => window.removeEventListener('storage', checkSession)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('logged_jugador')
    setLoggedPlayer(null)
    window.location.href = '/'
  }

  // 3. Helper para Renderizar Enlaces (Activos o Deshabilitados)
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

  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            
            {/* BRANDING */}
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-xl font-bold tracking-tight text-amber-400 uppercase">
                NUZTRACKER
              </h1>
            </Link>

            {/* NAVEGACIÓN Y SESIÓN DE JUGADOR */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
              <nav className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {renderNavLink('/timeline', 'Timeline')}
                {renderNavLink('/box', 'BOX / Estado')}
                {renderNavLink('/summary', 'Summary / VS')}
              </nav>

              {/* BADGE DEL PERFIL A LA DERECHA */}
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
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  )
}