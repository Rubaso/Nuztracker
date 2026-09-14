'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { SALA_ID, JUGADORES, ESTADOS } from '@/lib/constants'
import { MAP_ANIL_41 } from '@/lib/mapAnil'
import PokemonSelectModal from '@/components/PokemonSelectModal'
import TeamViewerModal from '@/components/TeamViewerModal'

// JSON con la estructura de tramos, gimnasios y zonas
const TRAMOS_DATA = [
  {
    tramo: 1,
    gimnasio: "Brock",
    capturas: 10,
    capturas_acumuladas: 10,
    zonas: [
      "Pueblo Paleta",
      "Ruta 1",
      "Ciudad Verde",
      "Ruta 22",
      "Ruta 2 Sur",
      "Ruta 2 Norte",
      "Bosque Verde",
      "Ciudad Plateada",
      "Pikachu",
      "Magikarp"
    ]
  },
  {
    tramo: 2,
    gimnasio: "Misty",
    capturas: 5,
    capturas_acumuladas: 15,
    zonas: [
      "Ruta 3",
      "Monte Moon",
      "Monte Moon Exterior",
      "Ruta 4",
      "Ciudad Celeste"
    ]
  },
  {
    tramo: 3,
    gimnasio: "Lt. Surge",
    capturas: 6,
    capturas_acumuladas: 21,
    zonas: [
      "Ruta 5",
      "Ruta 6",
      "Ciudad Carmín",
      "Ruta 15",
      "Túnel Diglett",
      "Ruta 11"
    ]
  },
  {
    tramo: 4,
    gimnasio: "Erika",
    capturas: 13,
    capturas_acumuladas: 34,
    zonas: [
      "Ruta 9",
      "Ruta 10 Norte",
      "Ruta 10 Sur",
      "Túnel Roca",
      "Pueblo Lavanda",
      "Torre Pokémon",
      "Ruta 8",
      "Ruta 7",
      "Ciudad Azulona",
      "Ruta 16",
      "Ruta 17",
      "Camino de Bicis",
      "Eevee"
    ]
  },
  {
    tramo: 5,
    gimnasio: "Koga",
    capturas: 6,
    capturas_acumuladas: 40,
    zonas: [
      "Ruta 12",
      "Pueblo Marengo",
      "Ruta 13",
      "Ruta 14",
      "Ciudad Fucsia",
      "Zona Safari"
    ]
  },
  {
    tramo: 6,
    gimnasio: "Sabrina",
    capturas: 3,
    capturas_acumuladas: 43,
    zonas: [
      "Ciudad Azafrán",
      "Dojo Pokémon",
      "Lapras"
    ]
  },
  {
    tramo: 7,
    gimnasio: "Blaine",
    capturas: 9,
    capturas_acumuladas: 52,
    zonas: [
      "Ruta 18",
      "Ruta 19",
      "Ruta 20",
      "Ruta 21",
      "Islas Espuma",
      "Isla Canela",
      "Mansión Quemada",
      "Volcán Canela",
      "Central Energía"
    ]
  },
  {
    tramo: 8,
    gimnasio: "Giovanni",
    capturas: 0,
    capturas_acumuladas: 52,
    zonas: []
  },
  {
    tramo: 9,
    gimnasio: "Liga Pokémon",
    capturas: 1,
    capturas_acumuladas: 53,
    zonas: [
      "Ruta 23"
    ]
  }
]

function TimelineContent() {
  const [loggedPlayer, setLoggedPlayer] = useState<{ id: number; name: string } | null>(null)
  const [capturas, setCapturas] = useState<any[]>([])
  const [liveMap, setLiveMap] = useState<Record<number, boolean>>({})
  const [search, setSearch] = useState('')
  const [openTramos, setOpenTramos] = useState<Record<number, boolean>>({ 1: true })

  // Modales
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ jugadorId: number; jugadorNombre: string; ruta: string } | null>(null)

  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [activePokemon, setActivePokemon] = useState<{
    id: number
    jugadorId: number
    jugadorNombre: string
    ruta: string
    pokemonName: string
    pokemonId?: number
    habilidad?: string
    isShiny?: boolean
    estado: string
  } | null>(null)

  const [inputHabilidad, setInputHabilidad] = useState('')
  const [isShinyInput, setIsShinyInput] = useState(false)

  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [pokepasteText, setPokepasteText] = useState<string>('')

  useEffect(() => {
    const saved = localStorage.getItem('logged_jugador')
    if (saved) {
      setLoggedPlayer(JSON.parse(saved))
    }
  }, [])

  const canEditCell = (jugadorId: number) => {
    return loggedPlayer !== null && loggedPlayer.id === jugadorId
  }

  const fetchCapturas = useCallback(async () => {
    const { data } = await supabase.from('capturas').select('*').eq('sala_id', SALA_ID)
    if (data) setCapturas(data)
  }, [])

  const fetchDirectos = async () => {
    const { data } = await supabase.from('directos').select('*')
    if (data) {
      const map: Record<number, boolean> = {}
      data.forEach((d: any) => { map[d.jugador_id] = d.is_live })
      setLiveMap(map)
    }
  }

  // --- LÓGICA DE PROCESAMIENTO DEL SAVE (.rxdata / .sav) ---
  const handleProcessSaveFile = useCallback(async (file: File) => {
    if (!loggedPlayer) {
      alert("Debes iniciar sesión para subir tu partida.")
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const fileString = new TextDecoder("latin1").decode(bytes)

      // Expresión regular ajustada para leer las cadenas/IDs de Pokémon en el buffer de partida guardada
      const matches = [...fileString.matchAll(/(?:species|pokemon)[\s\S]*?:([A-Z0-9_]+)[\s\S]*?(?:map|zone)_?id[\s\S]*?:([0-9]+)/gi)]

      if (matches.length === 0) {
        // Fallback de búsqueda si los patrones específicos varían en la codificación RPGMaker
        const altMatches = [...fileString.matchAll(/species\x00i([0-9]+)[\s\S]*?time_received\x00i([0-9]+)/g)]
        if (altMatches.length > 0) {
          matches.push(...altMatches)
        }
      }

      const capturasNuevas: any[] = []

      for (const match of matches) {
        const speciesVal = match[1]
        const mapId = match[2]
        const zonaNombre = MAP_ANIL_41[mapId]

        if (zonaNombre) {
          const speciesId = parseInt(speciesVal, 10)
          capturasNuevas.push({
            sala_id: SALA_ID,
            jugador_id: loggedPlayer.id,
            ruta: zonaNombre,
            pokemon_name: isNaN(speciesId) ? speciesVal.toLowerCase() : `pokemon_${speciesId}`,
            pokemon_id: isNaN(speciesId) ? null : speciesId,
            estado: 'VIVO',
            habilidad: null,
            is_shiny: false
          })
        }
      }

      if (capturasNuevas.length > 0) {
        const { error } = await supabase.from('capturas').insert(capturasNuevas)

        if (!error) {
          alert(`¡Se han importado ${capturasNuevas.length} capturas desde tu partida!`)
          fetchCapturas()
        } else {
          console.error("Error al actualizar Supabase:", error)
          alert("Error al intentar guardar en la base de datos.")
        }
      } else {
        alert("Se leyó la partida correctamente pero no se encontraron zonas coincidentes registradas.")
      }
    } catch (err) {
      console.error("Error procesando Save:", err)
      alert("Error leyendo el archivo de guardado.")
    }
  }, [loggedPlayer, fetchCapturas])

  // Escuchar eventos globales del Header (Cargar Save / PokePaste)
  const handleSavePokepaste = async (newText: string) => {
    if (!loggedPlayer) return

    const { error } = await supabase.from('directos').upsert({
      jugador_id: loggedPlayer.id,
      pokepaste_text: newText,
    })

    if (error) {
      console.error('Error guardando el PokéPaste:', error)
      alert('No se pudo guardar el PokéPaste.')
      return
    }

    setPokepasteText(newText)
  }

  useEffect(() => {
    const handleSaveUploadEvent = (e: Event) => {
      const customEvent = e as CustomEvent<File>
      if (customEvent.detail) {
        handleProcessSaveFile(customEvent.detail)
      }
    }

    const handlePokepasteEvent = async () => {
      if (!loggedPlayer) {
        alert('Debes iniciar sesión para gestionar tu PokéPaste.')
        return
      }

      const { data, error } = await supabase
        .from('directos')
        .select('pokepaste_text')
        .eq('jugador_id', loggedPlayer.id)
        .maybeSingle()

      if (error) {
        console.error('Error cargando el PokéPaste:', error)
        alert('No se pudo cargar tu PokéPaste.')
        return
      }

      setPokepasteText(data?.pokepaste_text || '')
      setTeamModalOpen(true)
    }

    window.addEventListener('upload_save_file', handleSaveUploadEvent)
    window.addEventListener('open_pokepaste_modal', handlePokepasteEvent)

    return () => {
      window.removeEventListener('upload_save_file', handleSaveUploadEvent)
      window.removeEventListener('open_pokepaste_modal', handlePokepasteEvent)
    }
  }, [handleProcessSaveFile])

  useEffect(() => {
    fetchCapturas()
    fetchDirectos()

    const channelCapturas = supabase.channel('realtime_timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capturas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRow = payload.new
          if (newRow.sala_id === SALA_ID) {
            setCapturas(prev => {
              if (prev.some(c => c.id === newRow.id)) return prev
              return [...prev, newRow]
            })
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedRow = payload.new
          setCapturas(prev => prev.map(c => c.id === updatedRow.id ? updatedRow : c))
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old
          setCapturas(prev => prev.filter(c => c.id !== oldRow.id))
        }
      })
      .subscribe()

    const channelDirectos = supabase.channel('realtime_directos_timeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'directos' }, (payload: any) => {
        const updated = payload.new
        if (updated) {
          setLiveMap(prev => ({ ...prev, [updated.jugador_id]: updated.is_live }))
        }
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(channelCapturas)
      supabase.removeChannel(channelDirectos)
    }
  }, [fetchCapturas])

  const toggleTramo = (tramoNum: number) => {
    setOpenTramos(prev => ({ ...prev, [tramoNum]: !prev[tramoNum] }))
  }

  const addEntry = async (
    jugadorId: number, 
    ruta: string, 
    pokemonName: string, 
    pokemonId?: number
  ) => {
    if (!canEditCell(jugadorId)) return

    const newPokemon = {
      sala_id: SALA_ID,
      jugador_id: jugadorId,
      ruta: ruta,
      pokemon_name: pokemonName.toLowerCase().trim(),
      pokemon_id: pokemonId || null,
      estado: 'VIVO',
      habilidad: null,
      is_shiny: false
    }

    const { data, error } = await supabase.from('capturas').insert([newPokemon]).select()
    
    if (error) {
      console.error("Error al insertar captura:", error)
      return
    }

    if (data && data.length > 0) {
      setCapturas(prev => [...prev, data[0]])
    }
  }

  const updatePokemonStatus = async (
    id: number,
    estado: string,
    habilidad?: string,
    isShiny?: boolean
  ) => {
    const payload: any = {
      estado: estado,
      habilidad: habilidad || null,
      is_shiny: !!isShiny
    }

    setCapturas(prev => prev.map(c => c.id === id ? { ...c, ...payload } : c))
    await supabase.from('capturas').update(payload).eq('id', id)
  }

  const deleteEntry = async (id: number) => {
    setCapturas(prev => prev.filter(c => c.id !== id))
    setActionMenuOpen(false)
    setActivePokemon(null)

    await supabase.from('capturas').delete().eq('id', id)
  }

  const handleOpenSelectModal = (jugadorId: number, jugadorNombre: string, ruta: string) => {
    if (!canEditCell(jugadorId)) return
    setSelectedCell({ jugadorId, jugadorNombre, ruta })
    setModalOpen(true)
  }

  const handleSelectPokemon = (pokemonName: string, pokemonId: number) => {
    if (!selectedCell || !canEditCell(selectedCell.jugadorId)) return
    addEntry(selectedCell.jugadorId, selectedCell.ruta, pokemonName, pokemonId)
  }

  const handleOpenActionMenu = (reg: any, jugadorNombre: string) => {
    if (!canEditCell(reg.jugador_id)) return
    setActivePokemon({
      id: reg.id,
      jugadorId: reg.jugador_id,
      jugadorNombre,
      ruta: reg.ruta,
      pokemonName: reg.pokemon_name,
      pokemonId: reg.pokemon_id,
      habilidad: reg.habilidad || '',
      isShiny: !!reg.is_shiny,
      estado: reg.estado || 'VIVO'
    })
    setInputHabilidad(reg.habilidad || '')
    setIsShinyInput(!!reg.is_shiny)
    setActionMenuOpen(true)
  }

  const handleSavePokemonDetails = async () => {
    if (!activePokemon) return
    await updatePokemonStatus(
      activePokemon.id,
      activePokemon.estado,
      inputHabilidad,
      isShinyInput
    )
    setActionMenuOpen(false)
    setActivePokemon(null)
  }

  const getSpriteUrl = (id?: number, shiny?: boolean) => {
    if (!id) return null
    return shiny
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
  }

  const tramosFiltrados = TRAMOS_DATA.filter(t => 
    t.gimnasio.toLowerCase().includes(search.toLowerCase()) ||
    `tramo ${t.tramo}`.includes(search.toLowerCase()) ||
    t.zonas.some(z => z.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6 w-full px-2 py-4">
      {loggedPlayer && (
        <TeamViewerModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          jugadorNombre={loggedPlayer.name}
          pokepasteText={pokepasteText}
          isEditable
          onSavePokepaste={handleSavePokepaste}
        />
      )}

      {/* Modal de Selección de Pokémon */}
      {selectedCell && canEditCell(selectedCell.jugadorId) && (
        <PokemonSelectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleSelectPokemon}
          jugadorNombre={selectedCell.jugadorNombre}
          ruta={selectedCell.ruta}
        />
      )}

      {/* Modal de Opciones */}
      {actionMenuOpen && activePokemon && canEditCell(activePokemon.jugadorId) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 capitalize flex items-center gap-2">
                  {activePokemon.pokemonName}
                  {isShinyInput && <span>✨</span>}
                </h3>
                <p className="text-xs text-slate-400">
                  {activePokemon.jugadorNombre} • {activePokemon.ruta}
                </p>
              </div>
              <button 
                onClick={() => setActionMenuOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-xl p-3 border border-slate-800 overflow-hidden">
              {activePokemon.pokemonId && (
                <img
                  src={getSpriteUrl(activePokemon.pokemonId, isShinyInput) || ''}
                  alt={activePokemon.pokemonName}
                  className="w-32 h-32 object-contain drop-shadow-md scale-125"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Habilidad del Pokémon
              </label>
              <input
                type="text"
                placeholder="Ej: Intimidación, Adaptable..."
                value={inputHabilidad}
                onChange={(e) => setInputHabilidad(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>✨</span> Variante Shiny
              </span>
              <button
                type="button"
                onClick={() => setIsShinyInput(!isShinyInput)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isShinyInput
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                }`}
              >
                {isShinyInput ? 'SÍ (SHINY)' : 'NO'}
              </button>
            </div>

            <button
              onClick={handleSavePokemonDetails}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-lg cursor-pointer"
            >
              Guardar Cambios
            </button>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => deleteEntry(activePokemon.id)}
                className="w-full py-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                Borrar Pokémon de esta zona
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controles Superiores */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-white/10">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar gimnasio o zona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d131f] text-zinc-100 text-sm rounded-xl pl-9 pr-4 py-2.5 border border-white/10 focus:outline-none focus:border-white/30 transition-all placeholder:text-zinc-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold tracking-wider uppercase text-zinc-300">
          {ESTADOS.map(st => (
            <div key={st.id} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${st.color}`}></span>
              <span>{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Tramos con Tabla Integrada */}
      <div className="space-y-6">
        {tramosFiltrados.map((item) => {
          const isExpanded = openTramos[item.tramo] ?? true

          return (
            <div key={item.tramo} className="rounded-2xl border border-white/10 bg-[#0b0f17]/90 backdrop-blur-sm shadow-2xl overflow-hidden">
              {/* Header del Tramo */}
              <div 
                onClick={() => toggleTramo(item.tramo)}
                className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-950/30 via-black/40 to-black/60 border-b border-white/10 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg text-amber-400">{isExpanded ? '▼' : '►'}</span>
                  <div>
                    <h3 className="text-base font-extrabold text-amber-400 flex items-center gap-2">
                      <span>Tramo {item.tramo}:</span> 
                      <span className="text-white">Gimnasio {item.gimnasio}</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Capturas tramo: <span className="text-zinc-200 font-bold">{item.capturas}</span> | Acumuladas: <span className="text-amber-300 font-bold">{item.capturas_acumuladas}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                    {item.zonas.length} Zonas
                  </span>
                </div>
              </div>

              {/* Zonas y Capturas (Desplegable) */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="text-xs font-bold tracking-widest uppercase text-zinc-400 border-b border-white/10 bg-black/40">
                        <th className="py-3 px-6 w-56 text-xs">Zona / Encuentro</th>
                        {JUGADORES.map(j => {
                          const isMyColumn = loggedPlayer?.id === j.id
                          const isLive = liveMap[j.id] || false

                          return (
                            <th key={j.id} className={`py-3 px-4 text-center text-xs ${isMyColumn ? 'text-amber-400 font-extrabold bg-amber-500/5' : ''}`}>
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span>{j.name}</span>
                                  {isMyColumn && <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded">TÚ</span>}
                                </div>

                                {isLive && (
                                  <a
                                    href={(j as any).twitchUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-0.5 flex items-center gap-1 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.6)]"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                    <span>EN VIVO</span>
                                  </a>
                                )}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-sm">
                      {item.zonas.length === 0 ? (
                        <tr>
                          <td colSpan={JUGADORES.length + 1} className="py-6 text-center text-xs text-zinc-500 italic">
                            Sin zonas de captura en este tramo.
                          </td>
                        </tr>
                      ) : (
                        item.zonas.map(zona => (
                          <tr key={zona} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-6 font-semibold text-zinc-200 whitespace-nowrap text-xs align-top">
                              <span className="flex items-center gap-2">
                                <span className="text-amber-500/60">📍</span>
                                {zona}
                              </span>
                            </td>

                            {JUGADORES.map(j => {
                              const canEditThisCell = canEditCell(j.id)
                              const playerCapturas = capturas.filter(c => c.jugador_id === j.id && c.ruta === zona)

                              return (
                                <td key={j.id} className={`py-3 px-3 text-center align-top ${loggedPlayer?.id === j.id ? 'bg-amber-500/[0.02]' : ''}`}>
                                  <div className="flex flex-col items-center gap-3">
                                    
                                    {playerCapturas.map((reg) => {
                                      const pkmn = reg.pokemon_name || ''
                                      const rawStatus = reg.estado || 'VIVO'
                                      const currentStatus = (rawStatus === 'PENDIENTE' || rawStatus === 'EN_BOX') ? 'VIVO' : rawStatus
                                      const activeState = ESTADOS.find(e => e.id === currentStatus) || ESTADOS[0]
                                      const spriteUrl = getSpriteUrl(reg.pokemon_id, reg.is_shiny)

                                      return (
                                        <div key={reg.id} className="flex flex-col items-center justify-center gap-1.5 group w-full max-w-[140px] bg-black/40 p-2 rounded-2xl border border-white/10 shadow-md">
                                          <div 
                                            className={`relative flex flex-col items-center justify-center w-24 h-24 bg-white/[0.03] rounded-xl border overflow-hidden transition-all ${
                                              canEditThisCell 
                                                ? 'cursor-pointer hover:bg-white/[0.08] border-white/10 hover:border-amber-500/50' 
                                                : 'cursor-default border-white/5 opacity-80'
                                            }`}
                                            onClick={() => canEditThisCell && handleOpenActionMenu(reg, j.name)}
                                          >
                                            {reg.is_shiny && (
                                              <span className="absolute top-1 left-1 text-xs z-10" title="Shiny">✨</span>
                                            )}

                                            {spriteUrl ? (
                                              <img
                                                src={spriteUrl}
                                                alt={pkmn}
                                                referrerPolicy="no-referrer"
                                                className={`w-full h-full object-contain scale-125 transition-transform ${
                                                  canEditThisCell ? 'group-hover:scale-135' : ''
                                                } ${
                                                  currentStatus === 'MUERTO' 
                                                    ? 'grayscale opacity-35' 
                                                    : currentStatus === 'ESCAPADO' || currentStatus === 'INTERCAMBIADO'
                                                    ? 'opacity-25 grayscale' 
                                                    : 'opacity-100'
                                                }`}
                                              />
                                            ) : (
                                              <span className="text-xs text-zinc-400 capitalize">{pkmn}</span>
                                            )}

                                            {currentStatus === 'MUERTO' && (
                                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-rose-500 font-bold text-3xl z-10">✕</span>
                                              </div>
                                            )}

                                            {currentStatus === 'ESCAPADO' && (
                                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-amber-400 text-lg z-10">💨</span>
                                              </div>
                                            )}

                                            {currentStatus === 'INTERCAMBIADO' && (
                                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-purple-400 text-lg z-10">🔄</span>
                                              </div>
                                            )}
                                          </div>

                                          <span className="text-xs font-bold text-zinc-200 capitalize truncate max-w-full">{pkmn}</span>

                                          {reg.habilidad && (
                                            <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                                              {reg.habilidad}
                                            </span>
                                          )}

                                          <div className="flex items-center justify-center gap-1 mt-0.5">
                                            <span className={`w-2 h-2 rounded-full ${activeState?.color || 'bg-emerald-500'}`}></span>
                                            
                                            {canEditThisCell ? (
                                              <select
                                                value={currentStatus}
                                                onChange={(e) => updatePokemonStatus(
                                                  reg.id, 
                                                  e.target.value, 
                                                  reg.habilidad,
                                                  reg.is_shiny
                                                )}
                                                className="bg-transparent text-[10px] font-semibold text-zinc-400 uppercase focus:outline-none cursor-pointer hover:text-zinc-200"
                                              >
                                                {ESTADOS.map(s => (
                                                  <option key={s.id} value={s.id} className="bg-[#0b0f17] text-zinc-200">
                                                    {s.label}
                                                  </option>
                                                ))}
                                              </select>
                                            ) : (
                                              <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                                                {activeState?.label}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {canEditThisCell && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenSelectModal(j.id, j.name, zona)}
                                        className="w-full py-1.5 px-2 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 text-amber-400 flex items-center justify-center transition-all font-bold text-xs cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 gap-1 max-w-[140px]"
                                        title="Registrar Pokémon asignado a esta zona"
                                      >
                                        <span className="text-xs">+</span>
                                        <span className="text-[10px] uppercase font-bold">Captura</span>
                                      </button>
                                    )}

                                    {!canEditThisCell && playerCapturas.length === 0 && (
                                      <span className="text-zinc-600 text-xs font-mono pt-1">-</span>
                                    )}

                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-500 text-sm">Cargando Nuztracker...</div>}>
      <TimelineContent />
    </Suspense>
  )
}