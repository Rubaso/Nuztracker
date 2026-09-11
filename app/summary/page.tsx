'use client'

import { useEffect, useState, Suspense } from 'react'
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

function TorneoContent() {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [maxParticipants, setMaxParticipants] = useState<number>(5)
  const [inputParticipants, setInputParticipants] = useState<string>('5')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [directosData, setDirectosData] = useState<Record<string, string>>({})

  // Estado para el modal de Pokepaste
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [selectedPlayerForTeam, setSelectedPlayerForTeam] = useState<{ id?: number; name: string; pokepaste_text: string } | null>(null)

  // Drag state
  const [draggedFromSidebar, setDraggedFromSidebar] = useState<string | null>(null)
  const [draggedFromBracket, setDraggedFromBracket] = useState<{
    roundIndex: number
    matchIndex: number
    slot: 'player1' | 'player2'
  } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('logged_jugador')
    if (saved) {
      setLoggedPlayer(JSON.parse(saved))
    }
  }, [])

  const canEdit = loggedPlayer !== null

  const fetchDirectos = async () => {
    const { data } = await supabase.from('directos').select('jugador_id, pokepaste_text')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((d) => {
        const j = JUGADORES.find((jug) => jug.id === d.jugador_id)
        if (j && d.pokepaste_text) {
          map[j.name] = d.pokepaste_text
        }
      })
      setDirectosData(map)
    }
  }

  const fetchTorneo = async () => {
    const { data } = await supabase
      .from('torneo')
      .select('bracket_data, is_locked, max_participants')
      .eq('sala_id', SALA_ID)
      .single()

    if (data?.bracket_data) {
      setRounds(data.bracket_data)
      setIsLocked(Boolean(data.is_locked))
      if (data.max_participants) {
        setMaxParticipants(data.max_participants)
        setInputParticipants(data.max_participants.toString())
      }
    } else {
      generarEstructuraDinamica(5, [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTorneo()
    fetchDirectos()

    const channel = supabase
      .channel('realtime_torneo_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneo' }, (payload) => {
        const newData = payload.new as { bracket_data?: Round[]; is_locked?: boolean; max_participants?: number } | null
        if (newData) {
          if (newData.bracket_data) setRounds(newData.bracket_data)
          if (newData.is_locked !== undefined) setIsLocked(Boolean(newData.is_locked))
          if (newData.max_participants) {
            setMaxParticipants(newData.max_participants)
            setInputParticipants(newData.max_participants.toString())
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directos' }, () => {
        fetchDirectos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const saveBracket = async (newRounds: Round[], lockedStatus = isLocked, size = maxParticipants) => {
    if (!canEdit) return

    setRounds(newRounds)
    setIsLocked(lockedStatus)
    setMaxParticipants(size)

    await supabase.from('torneo').upsert({
      id: 1,
      sala_id: SALA_ID,
      bracket_data: newRounds,
      is_locked: lockedStatus,
      max_participants: size,
      updated_at: new Date().toISOString(),
    })
  }

  const getNextPowerOfTwo = (num: number) => {
    let p = 2
    while (p < num) p *= 2
    return p
  }

  // Genera un orden de slots entrelazado para repartir los BYE equitativamente
  const buildInterleavedSlots = (cantJugadores: number, tamanoBracket: number, listaInicial: string[]) => {
    const totalByes = tamanoBracket - cantJugadores
    const slots: (string | null)[] = new Array(tamanoBracket).fill(null)

    // Entrelazamos asignando huecos para BYEs alternados
    let playerIdx = 0
    let byeCount = 0

    for (let i = 0; i < tamanoBracket; i++) {
      // Si necesitamos meter BYEs, los colocamos en posiciones impares distribuidas
      if (byeCount < totalByes && i % 2 !== 0) {
        slots[i] = 'BYE'
        byeCount++
      } else {
        slots[i] = listaInicial[playerIdx] || null
        playerIdx++
      }
    }

    // Si aún quedan BYEs por repartir (en casos raros), los ponemos en los huecos sobrantes
    for (let i = 0; i < tamanoBracket && byeCount < totalByes; i++) {
      if (slots[i] === null) {
        slots[i] = 'BYE'
        byeCount++
      }
    }

    return slots
  }

  const generarEstructuraDinamica = (cantJugadores: number, listaInicial: string[] = []) => {
    const tamanoBracket = getNextPowerOfTwo(cantJugadores)
    const numRondas = Math.log2(tamanoBracket)
    const nuevasRondas: Round[] = []
    let partidosEnRonda = tamanoBracket / 2

    const slotsDistribuidos = buildInterleavedSlots(cantJugadores, tamanoBracket, listaInicial)

    for (let r = 0; r < numRondas; r++) {
      const nombreRonda =
        partidosEnRonda === 1
          ? 'Gran Final'
          : partidosEnRonda === 2
          ? 'Semifinales'
          : partidosEnRonda === 4
          ? 'Cuartos de Final'
          : partidosEnRonda === 8
          ? 'Octavos de Final'
          : `Ronda de ${partidosEnRonda * 2}`

      const matches: Match[] = []
      for (let m = 0; m < partidosEnRonda; m++) {
        let p1: string | null = null
        let p2: string | null = null
        let winner: string | null = null

        if (r === 0) {
          p1 = slotsDistribuidos[m * 2]
          p2 = slotsDistribuidos[m * 2 + 1]

          // Pasa automáticamente si se enfrenta a un BYE
          if (p1 && p1 !== 'BYE' && p2 === 'BYE') winner = p1
          if (p2 && p2 !== 'BYE' && p1 === 'BYE') winner = p2
          if (p1 === 'BYE' && p2 === 'BYE') winner = 'BYE'
        }

        matches.push({
          id: `r${r}-m${m}`,
          player1: p1,
          player2: p2,
          winner: winner,
        })
      }

      nuevasRondas.push({ name: nombreRonda, matches })
      partidosEnRonda /= 2
    }

    // Promocionar automáticos por BYE a la siguiente ronda
    nuevasRondas[0].matches.forEach((m, mIndex) => {
      if (m.winner && nuevasRondas[1]) {
        const nextMatchIndex = Math.floor(mIndex / 2)
        const nextMatch = nuevasRondas[1].matches[nextMatchIndex]
        if (mIndex % 2 === 0) nextMatch.player1 = m.winner
        else nextMatch.player2 = m.winner
      }
    })

    saveBracket(nuevasRondas, false, cantJugadores)
  }

  const handleNumParticipantsChange = (valStr: string) => {
    setInputParticipants(valStr)
    const val = parseInt(valStr, 10)

    if (isNaN(val) || val < 2) {
      setErrorMessage('El mínimo de participantes es 2.')
      return
    }

    if (val > 16) {
      setErrorMessage('El límite máximo del torneo es de 16 participantes.')
      return
    }

    setErrorMessage(null)
    setMaxParticipants(val)
    generarEstructuraDinamica(val, [])
  }

  const handleRandomize = () => {
    if (!canEdit || isLocked) return
    const jugadoresShuffled = [...JUGADORES.map((j) => j.name)]
      .sort(() => Math.random() - 0.5)
      .slice(0, maxParticipants)

    generarEstructuraDinamica(maxParticipants, jugadoresShuffled)
  }

  const handleLockTorneo = () => {
    if (!canEdit) return
    saveBracket(rounds, !isLocked)
  }

  const jugadoresEnBracket = new Set<string>()
  if (rounds[0]) {
    rounds[0].matches.forEach((m) => {
      if (m.player1 && m.player1 !== 'BYE') jugadoresEnBracket.add(m.player1)
      if (m.player2 && m.player2 !== 'BYE') jugadoresEnBracket.add(m.player2)
    })
  }

  const jugadoresDisponibles = JUGADORES.filter((j) => !jugadoresEnBracket.has(j.name))

  // Drag & Drop
  const handleDragSidebarStart = (nombre: string) => {
    if (!canEdit || isLocked) return
    setDraggedFromSidebar(nombre)
    setDraggedFromBracket(null)
  }

  const handleDragBracketStart = (roundIndex: number, matchIndex: number, slot: 'player1' | 'player2') => {
    if (!canEdit || isLocked || roundIndex !== 0) return
    setDraggedFromBracket({ roundIndex, matchIndex, slot })
    setDraggedFromSidebar(null)
  }

  const handleDropSlot = (targetMatchIndex: number, targetSlot: 'player1' | 'player2') => {
    if (!canEdit || isLocked) return

    const newRounds = JSON.parse(JSON.stringify(rounds)) as Round[]
    const targetMatch = newRounds[0].matches[targetMatchIndex]

    if (draggedFromSidebar) {
      targetMatch[targetSlot] = draggedFromSidebar
      setDraggedFromSidebar(null)
    } else if (draggedFromBracket && draggedFromBracket.roundIndex === 0) {
      const sourceMatch = newRounds[0].matches[draggedFromBracket.matchIndex]
      const sourceValue = sourceMatch[draggedFromBracket.slot]
      const targetValue = targetMatch[targetSlot]

      sourceMatch[draggedFromBracket.slot] = targetValue
      targetMatch[targetSlot] = sourceValue
      setDraggedFromBracket(null)
    }

    saveBracket(newRounds, false)
  }

  const handleRemoveFromSlot = (matchIndex: number, slot: 'player1' | 'player2', e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit || isLocked) return

    const newRounds = JSON.parse(JSON.stringify(rounds)) as Round[]
    newRounds[0].matches[matchIndex][slot] = null
    saveBracket(newRounds, false)
  }

  const handleSelectWinner = async (roundIndex: number, matchIndex: number, winnerName: string) => {
    if (!canEdit || !isLocked) return

    const newRounds = JSON.parse(JSON.stringify(rounds)) as Round[]
    const currentMatch = newRounds[roundIndex].matches[matchIndex]

    if (!currentMatch.player1 || !currentMatch.player2) return

    const normalizedWinner = winnerName.trim()
    const currentWinnerNormalized = currentMatch.winner?.trim()

    if (currentWinnerNormalized === normalizedWinner) {
      currentMatch.winner = null

      for (let r = roundIndex + 1; r < newRounds.length; r++) {
        newRounds[r].matches.forEach((m) => {
          if (m.player1?.trim() === normalizedWinner) m.player1 = null
          if (m.player2?.trim() === normalizedWinner) m.player2 = null
          if (m.winner?.trim() === normalizedWinner) m.winner = null
        })
      }
    } else {
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

  const handleSavePokepaste = async (newText: string) => {
    if (!selectedPlayerForTeam?.id) return

    await supabase.from('directos').upsert({
      jugador_id: selectedPlayerForTeam.id,
      pokepaste_text: newText,
    })

    setDirectosData((prev) => ({
      ...prev,
      [selectedPlayerForTeam.name]: newText,
    }))

    setSelectedPlayerForTeam((prev) => (prev ? { ...prev, pokepaste_text: newText } : null))
  }

  const openTeamModal = (playerName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const j = JUGADORES.find((jug) => jug.name === playerName)
    const text = directosData[playerName] || ''

    setSelectedPlayerForTeam({
      id: j?.id,
      name: playerName,
      pokepaste_text: text,
    })
    setTeamModalOpen(true)
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-bold">Cargando Torneo...</div>
  }

  return (
    <div className="p-6 max-w-[98vw] mx-auto space-y-8">
      {/* Modal Pokepaste */}
      {selectedPlayerForTeam && (
        <TeamViewerModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          jugadorNombre={selectedPlayerForTeam.name}
          pokepasteText={selectedPlayerForTeam.pokepaste_text}
          isEditable={loggedPlayer?.name === selectedPlayerForTeam.name}
          onSavePokepaste={handleSavePokepaste}
        />
      )}

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
              ? 'Arrastra los jugadores desde el panel lateral al bracket. Haz clic en ⚔️ para ver/editar equipos.'
              : 'Haz clic sobre un jugador o BYE para marcarlo como ganador y promocionarlo.'}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            {!isLocked && (
              <>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold">Jugadores (Max 16):</span>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={inputParticipants}
                    onChange={(e) => handleNumParticipantsChange(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 text-amber-400 font-black text-xs text-center rounded-lg py-1 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRandomize}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  🎲 Aleatorizar
                </button>
              </>
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

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs px-4 py-2 rounded-xl text-center font-bold">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PANEL LATERAL DE JUGADORES */}
        {!isLocked && canEdit && (
          <div className="lg:col-span-3 bg-[#0d1322] border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-black tracking-widest uppercase text-amber-400 border-b border-slate-800 pb-2">
              JUGADORES DISPONIBLES ({jugadoresDisponibles.length})
            </h3>
            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
              {jugadoresDisponibles.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium">Todos asignados al bracket</p>
              ) : (
                jugadoresDisponibles.map((j) => (
                  <div
                    key={j.id}
                    draggable
                    onDragStart={() => handleDragSidebarStart(j.name)}
                    className="bg-slate-900/80 border border-slate-700/60 hover:border-amber-400/50 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold cursor-grab active:cursor-grabbing flex items-center justify-between transition-all"
                  >
                    <span>{j.name}</span>
                    <button
                      onClick={(e) => openTeamModal(j.name, e)}
                      className="text-[10px] bg-slate-800 hover:bg-sky-950 hover:text-sky-300 border border-slate-700 px-2 py-0.5 rounded"
                    >
                      ⚔️ Equipo
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* BRACKET VISUAL */}
        <div className={`${!isLocked && canEdit ? 'lg:col-span-9' : 'lg:col-span-12'} flex gap-8 overflow-x-auto pb-8 custom-scrollbar items-center justify-start min-h-[500px]`}>
          {rounds.map((round, rIndex) => (
            <div key={round.name} className="flex flex-col gap-6 min-w-[260px] flex-1">
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
                      draggable={canEdit && !isLocked && rIndex === 0 && Boolean(match.player1) && match.player1 !== 'BYE'}
                      onDragStart={() => handleDragBracketStart(rIndex, mIndex, 'player1')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropSlot(mIndex, 'player1')}
                      onClick={() => match.player1 && handleSelectWinner(rIndex, mIndex, match.player1)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                        match.winner === match.player1 && match.player1
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                          : match.player1 === 'BYE'
                          ? 'bg-slate-950/50 border-slate-900 text-slate-600 font-normal italic'
                          : match.player1
                          ? 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                          : 'bg-slate-900/20 border-slate-800/40 text-slate-600 border-dashed'
                      } ${
                        canEdit && !isLocked && rIndex === 0 && match.player1 !== 'BYE'
                          ? 'cursor-grab active:cursor-grabbing hover:border-amber-400/50'
                          : canEdit && isLocked
                          ? 'cursor-pointer hover:border-amber-500/30'
                          : 'cursor-default'
                      }`}
                    >
                      <span className="truncate">{match.player1 || 'Arrastrar jugador'}</span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {match.player1 && match.player1 !== 'BYE' && (
                          <button
                            onClick={(e) => openTeamModal(match.player1!, e)}
                            className="text-[11px] hover:scale-125 transition-transform"
                          >
                            ⚔️
                          </button>
                        )}
                        {match.winner === match.player1 && match.player1 && <span>👑</span>}
                        {canEdit && !isLocked && rIndex === 0 && match.player1 && match.player1 !== 'BYE' && (
                          <button
                            onClick={(e) => handleRemoveFromSlot(mIndex, 'player1', e)}
                            className="text-rose-500 hover:text-rose-300 text-xs ml-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-black text-center text-slate-600 uppercase tracking-widest">
                      VS
                    </span>

                    {/* Jugador 2 */}
                    <div
                      draggable={canEdit && !isLocked && rIndex === 0 && Boolean(match.player2) && match.player2 !== 'BYE'}
                      onDragStart={() => handleDragBracketStart(rIndex, mIndex, 'player2')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropSlot(mIndex, 'player2')}
                      onClick={() => match.player2 && handleSelectWinner(rIndex, mIndex, match.player2)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border font-bold text-xs transition-all ${
                        match.winner === match.player2 && match.player2
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                          : match.player2 === 'BYE'
                          ? 'bg-slate-950/50 border-slate-900 text-slate-600 font-normal italic'
                          : match.player2
                          ? 'bg-slate-900/80 border-slate-700/60 text-slate-200'
                          : 'bg-slate-900/20 border-slate-800/40 text-slate-600 border-dashed'
                      } ${
                        canEdit && !isLocked && rIndex === 0 && match.player2 !== 'BYE'
                          ? 'cursor-grab active:cursor-grabbing hover:border-amber-400/50'
                          : canEdit && isLocked
                          ? 'cursor-pointer hover:border-amber-500/30'
                          : 'cursor-default'
                      }`}
                    >
                      <span className="truncate">{match.player2 || 'Arrastrar jugador'}</span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {match.player2 && match.player2 !== 'BYE' && (
                          <button
                            onClick={(e) => openTeamModal(match.player2!, e)}
                            className="text-[11px] hover:scale-125 transition-transform"
                          >
                            ⚔️
                          </button>
                        )}
                        {match.winner === match.player2 && match.player2 && <span>👑</span>}
                        {canEdit && !isLocked && rIndex === 0 && match.player2 && match.player2 !== 'BYE' && (
                          <button
                            onClick={(e) => handleRemoveFromSlot(mIndex, 'player2', e)}
                            className="text-rose-500 hover:text-rose-300 text-xs ml-1"
                          >
                            ✕
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
      </div>
    </div>
  )
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500 font-bold">Cargando Torneo...</div>}>
      <TorneoContent />
    </Suspense>
  )
}