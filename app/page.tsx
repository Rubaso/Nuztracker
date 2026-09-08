'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { JUGADORES } from '@/lib/constants'

export default function HomePage() {
  const [selectedJugadorId, setSelectedJugadorId] = useState<number>(
    JUGADORES.length > 0 ? JUGADORES[0].id : 1
  )
  const [pin, setPin] = useState('')
  const [activeJugador, setActiveJugador] = useState<{ id: number; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPlayerForm, setShowPlayerForm] = useState(false)

  useEffect(() => {
    const savedJugador = localStorage.getItem('logged_jugador')
    if (savedJugador) {
      setActiveJugador(JSON.parse(savedJugador))
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJugadorId || !pin) return

    setLoading(true)

    // Validar directamente en el servidor
    const { data: isValid, error } = await supabase.rpc('validar_pin_jugador', {
      p_jugador_id: selectedJugadorId,
      p_pin: pin.trim()
    })

    setLoading(false)

    if (error) {
      alert('Error al validar el PIN: ' + error.message)
      return
    }

    if (isValid) {
      const jugadorObj = JUGADORES.find((j) => j.id === selectedJugadorId)
      const sessionData = { id: selectedJugadorId, name: jugadorObj?.name || 'Jugador' }

      localStorage.setItem('logged_jugador', JSON.stringify(sessionData))
      setActiveJugador(sessionData)
      window.location.href = '/box'
    } else {
      alert('PIN incorrecto para este jugador.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('logged_jugador')
    setActiveJugador(null)
  }

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex items-center justify-center p-4">
      <div className="bg-[#0d1322] border border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-8 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-amber-400 uppercase tracking-wider">
            ⚔️ Nuztracker
          </h1>
          <p className="text-xs text-slate-400">
            Selecciona tu modo de acceso para continuar.
          </p>
        </div>

        {/* MODO ESPECTADOR */}
        <div className="space-y-3">
          <a
            href="/box"
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-base py-5 px-6 rounded-2xl transition-all cursor-pointer shadow-lg shadow-sky-500/20 uppercase tracking-widest text-center"
          >
            Entrar como Espectador
          </a>
          <p className="text-[11px] text-slate-500 text-center">
            Modo solo lectura para ver las boxes en directo.
          </p>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            o participantes
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* MODO JUGADOR */}
        {!activeJugador ? (
          <div>
            {!showPlayerForm ? (
              <button
                onClick={() => setShowPlayerForm(true)}
                className="w-full bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                🎮 Acceso Jugador (Editar Box)
              </button>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Panel de Jugador
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPlayerForm(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">¿Quién eres?</label>
                  <select
                    value={selectedJugadorId}
                    onChange={(e) => setSelectedJugadorId(Number(e.target.value))}
                    className="w-full bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    {JUGADORES.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">PIN de acceso</label>
                  <input
                    type="password"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder=""
                    autoComplete="new-password"
                    className="w-full bg-slate-950 text-slate-200 text-center font-mono text-base tracking-[0.3em] rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Entrar a Mi Box'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-amber-500/30 space-y-3 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Sesión Activa
              </span>
              <p className="text-sm font-black text-amber-400">{activeJugador.name}</p>
            </div>

            <div className="flex gap-2">
              <a
                href="/box"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 rounded-xl transition-all cursor-pointer uppercase tracking-wider block text-center"
              >
                Ir a Mi Box ➔
              </a>
              <button
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}