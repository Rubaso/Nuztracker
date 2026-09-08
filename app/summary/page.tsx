'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { SALA_ID, JUGADORES } from '@/lib/constants'

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

function SummaryContent() {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draggedPlayer, setDraggedPlayer] = useState<{
    roundIndex: number
    matchIndex: number
    slot: 'player1' | 'player2'
  } | null>(null)

  // 1. Obtener la sesión activa del jugador desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('logged_jugador')
    if (saved) {
      setLoggedPlayer(JSON.parse(saved))
    }
  }, [])

  // Cualquier jugador autenticado (loggedPlayer != null) puede editar el torneo
  const canEdit = loggedPlayer !== null

  const fetchTorneo = async () => {
    const { data } = await supabase
      .from('torneo')
      .select('bracket_data, is_locked')
      .eq('sala_id', SALA_ID)
      .single()

    if (data?.bracket_data) {
      setRounds(data.bracket_data)
      setIsLocked(Boolean(data.is_locked))
    } else {
      generarEstructuraInicial(JUGADORES.map((j) => j.name))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTorneo()

    const channel = supabase
      .channel('realtime_torneo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneo' }, (payload) => {
        const newData = payload.new as { bracket_data?: Round[]; is_locked?: boolean } | null

        if (newData) {
          if (newData.bracket_data) setRounds(newData.bracket_data)
          if (newData.is_locked !== undefined) setIsLocked(Boolean(newData.is_locked))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const saveBracket = async (newRounds: Round[], lockedStatus = isLocked) => {
    if (!canEdit) return

    setRounds(newRounds)
    setIsLocked(lockedStatus)
    await supabase.from('torneo').upsert({
      id: 1,
      sala_id: SALA_ID,
      bracket_data: newRounds,
      is_locked: lockedStatus,
      updated_at: new Date().toISOString(),
    })
  }

  const generarEstructuraInicial = (listaJugadores: string[]) => {
    const numJugadores = listaJugadores.length
    let numRondas = Math.ceil(Math.log2(numJugadores))
    if (numRondas < 1) numRondas = 1

    const nuevasRondas: Round[] = []
    let partidosEnRonda = Math.pow(2, numRondas - 1)

    for (let r = 0; r < numRondas; r++) {
      const nombreRonda =
        partidosEnRonda === 1
          ? 'Gran Final'
          : partidosEnRonda === 2
          ? 'Semifinales'
          : `Ronda de ${partidosEnRonda * 2}`

      const matches: Match[] = []
      for (let m = 0; m < partidosEnRonda; m++) {
        let p1: string | null = null
        let p2: string | null = null

        if (r === 0) {
          p1 = listaJugadores[m * 2] || null
          p2 = listaJugadores[m * 2 + 1] || null
        }

        matches.push({
          id: `r${r}-m${m}`,
          player1: p1,
          player2: p2,
          winner: null,
        })
      }

      nuevasRondas.push({ name: nombreRonda, matches })
      partidosEnRonda /= 2
    }

    if (canEdit) {
      saveBracket(nuevasRondas, false)
    } else {
      setRounds(nuevasRondas)
    }
  }

  const handleRandomize = () => {
    if (!canEdit || isLocked) return
    const jugadoresShuffled = [...JUGADORES.map((j) => j.name)].sort(
      () => Math.random() - 0.5
    )
    generarEstructuraInicial(jugadoresShuffled)
  }

  const handleLockTorneo = () => {
    if (!canEdit) return
    saveBracket(rounds, !isLocked)
  }

  // Lógica Drag and Drop para reorganizar la Ronda 1
  const handleDragStart = (roundIndex: number, matchIndex: number, slot: 'player1' | 'player2') => {
    if (!canEdit || isLocked || roundIndex !== 0) return
    setDraggedPlayer({ roundIndex, matchIndex, slot })
  }

  const handleDrop = (targetMatchIndex: number, targetSlot: 'player1' | 'player2') => {
    if (!canEdit || isLocked || !draggedPlayer || draggedPlayer.roundIndex !== 0) return

    const newRounds = JSON.parse(JSON.stringify(rounds)) as Round[]
    const sourceMatch = newRounds[0].matches[draggedPlayer.matchIndex]
    const targetMatch = newRounds[0].matches[targetMatchIndex]

    const sourceValue = sourceMatch[draggedPlayer.slot]
    const targetValue = targetMatch[targetSlot]

    sourceMatch[draggedPlayer.slot] = targetValue
    targetMatch[targetSlot] = sourceValue

    setDraggedPlayer(null)
    saveBracket(newRounds, false)
  }

  // Avanzar / Desmarcar Ganador
  const handleSelectWinner = async (roundIndex: number, matchIndex: number, winnerName: string) => {
    if (!canEdit || !isLocked) return

    const newRounds = JSON.parse(JSON.stringify(rounds)) as Round[]
    const currentMatch = newRounds[roundIndex].matches[matchIndex]

    if (!currentMatch.player1 || !currentMatch.player2) return

    const normalizedWinner = winnerName.trim()
    const currentWinnerNormalized = currentMatch.winner?.trim()

    // 1. Desmarcar si se vuelve a hacer clic en el mismo
    if (currentWinnerNormalized === normalizedWinner) {
      currentMatch.winner = null

      for (let r = roundIndex + 1; r < newRounds.length; r++) {
        newRounds[r].matches.forEach((m) => {
          if (m.player1?.trim() === normalizedWinner) m.player1 = null
          if (m.player2?.trim() === normalizedWinner) m.player2 = null
          if (m.winner?.trim() === normalizedWinner) m.winner = null
        })
      }
    } 
    // 2. Marcar Nuevo Ganador y promocionar a la siguiente ronda
    else {
      const prevWinner = currentMatch.winner
      currentMatch.winner = winnerName

      if (prevWinner) {
        const prevNormalized = prevWinner.trim()
        for (let r = roundIndex + 1; r < newRounds.length; r++) {
          newRounds[r].matches.forEach((m) => {
            if (m.player1?.trim() === prevNormalized) m.player1 = null
            if (m.player2?.trim() === prevNormalized) m.player2 = null
            if (m.winner?.trim() === prevNormalized) m.winner = null
          })
        }
      }

      if (roundIndex + 1 < newRounds.length) {
        const nextMatchIndex = Math.floor(matchIndex / 2)
        const nextMatch = newRounds[roundIndex + 1].matches[nextMatchIndex]

        if (matchIndex % 2 === 0) {
          nextMatch.player1 = winnerName
        } else {
          nextMatch.player2 = winnerName
        }
      }
    }

    setRounds(newRounds)
    await saveBracket(newRounds, isLocked)
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-bold">Cargando Torneo...</div>
  }

  return (
    <div className="p-6 max-w-[98vw] mx-auto space-y-8">
      {/* Controles Superiores */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-wider uppercase text-amber-400 flex items-center gap-2">
            🏆 Cuadro del Torneo {isLocked && <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold">🔒 BLOQUEADO</span>}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {!canEdit
              ? 'Modo espectador: Solo lectura.'
              : !isLocked
              ? 'Arrastra los jugadores en la primera ronda para ordenar los enfrentamientos. Pulsa "Empezar Torneo" al terminar.'
              : 'Haz clic sobre un jugador para marcarlo como ganador. Si vuelves a pulsar sobre él, lo desmarcarás.'}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            {!isLocked && (
              <button
                type="button"
                onClick={handleRandomize}
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                🎲 Aleatorizar
              </button>
            )}

            <button
              type="button"
              onClick={handleLockTorneo}
              className={`font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg cursor-pointer ${
                isLocked
                  ? 'bg-rose-950/40 border border-rose-800 text-rose-300 hover:bg-rose-900/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 uppercase tracking-wider'
              }`}
            >
              {isLocked ? '🔓 Desbloquear Cuadro' : '🚀 Empezar Torneo'}
            </button>
          </div>
        )}
      </div>

      {/* Bracket / Cuadro visual */}
      <div className="flex gap-8 overflow-x-auto pb-8 custom-scrollbar items-center justify-start min-h-[500px]">
        {rounds.map((round, rIndex) => (
          <div key={round.name} className="flex flex-col gap-6 min-w-[240px] flex-1">
            <h3 className="text-center text-xs font-black tracking-widest uppercase text-sky-400 bg-sky-950/40 border border-sky-800/50 py-2 rounded-xl">
              {round.name}
            </h3>

            <div className="flex flex-col justify-around flex-1 gap-6">
              {round.matches.map((match, mIndex) => (
                <div
                  key={match.id}
                  className="bg-[#0d1322] border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-col gap-2 relative"
                >
                  {/* Jugador 1 */}
                  <div
                    draggable={canEdit && !isLocked && rIndex === 0 && Boolean(match.player1)}
                    onDragStart={() => handleDragStart(rIndex, mIndex, 'player1')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(mIndex, 'player1')}
                    onClick={() => match.player1 && handleSelectWinner(rIndex, mIndex, match.player1)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                      match.winner === match.player1 && match.player1
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                        : match.player1
                        ? 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                        : 'bg-slate-900/20 border-slate-800/40 text-slate-600'
                    } ${
                      canEdit && !isLocked && rIndex === 0
                        ? 'cursor-grab active:cursor-grabbing hover:border-amber-400/50'
                        : canEdit && isLocked
                        ? 'cursor-pointer hover:border-amber-500/30'
                        : 'cursor-default'
                    }`}
                  >
                    <span className="truncate">{match.player1 || 'Por determinar'}</span>
                    {match.winner === match.player1 && match.player1 && <span>👑</span>}
                  </div>

                  <span className="text-[10px] font-black text-center text-slate-600 uppercase tracking-widest">
                    VS
                  </span>

                  {/* Jugador 2 */}
                  <div
                    draggable={canEdit && !isLocked && rIndex === 0 && Boolean(match.player2)}
                    onDragStart={() => handleDragStart(rIndex, mIndex, 'player2')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(mIndex, 'player2')}
                    onClick={() => match.player2 && handleSelectWinner(rIndex, mIndex, match.player2)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                      match.winner === match.player2 && match.player2
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                        : match.player2
                        ? 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                        : 'bg-slate-900/20 border-slate-800/40 text-slate-600'
                    } ${
                      canEdit && !isLocked && rIndex === 0
                        ? 'cursor-grab active:cursor-grabbing hover:border-amber-400/50'
                        : canEdit && isLocked
                        ? 'cursor-pointer hover:border-amber-500/30'
                        : 'cursor-default'
                    }`}
                  >
                    <span className="truncate">{match.player2 || 'Por determinar'}</span>
                    {match.winner === match.player2 && match.player2 && <span>👑</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500 font-bold">Cargando Torneo...</div>}>
      <SummaryContent />
    </Suspense>
  )
}