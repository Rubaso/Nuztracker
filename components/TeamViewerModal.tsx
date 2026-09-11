'use client'

import { useState } from 'react'

interface TeamViewerModalProps {
  isOpen: boolean
  onClose: () => void
  jugadorNombre: string
  pokepasteText: string | null
  isEditable?: boolean
  onSavePokepaste?: (newText: string) => Promise<void>
}

interface PokemonData {
  species: string
  nickname: string
  item: string
  ability: string
  teraType?: string
  shiny: boolean
  nature: string
  moves: string[]
  evs: Record<string, number>
}

// Colores por tipo para los ataques
const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-stone-500/20 text-stone-300 border-stone-500/40',
  fire: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  water: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  grass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  electric: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  ice: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  fighting: 'bg-orange-600/20 text-orange-300 border-orange-500/40',
  poison: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  ground: 'bg-amber-700/20 text-amber-200 border-amber-600/40',
  flying: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/40',
  psychic: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  bug: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
  rock: 'bg-yellow-700/20 text-yellow-200 border-yellow-600/40',
  ghost: 'bg-violet-600/20 text-violet-300 border-violet-500/40',
  dragon: 'bg-indigo-600/20 text-indigo-200 border-indigo-500/40',
  dark: 'bg-zinc-700/20 text-zinc-300 border-zinc-600/40',
  steel: 'bg-slate-400/20 text-slate-300 border-slate-400/40',
  fairy: 'bg-pink-400/20 text-pink-200 border-pink-400/40',
}

function parsePokepaste(text: string): PokemonData[] {
  if (!text) return []

  const blocks = text.trim().split(/\n\s*\n/)

  return blocks.map(block => {
    const lines = block.split('\n').map(l => l.trim())
    if (!lines[0]) return null

    // Parsear Primera Línea: Nickname (Species) (M) @ Item  O  Species @ Item
    const firstLine = lines[0]
    let nickname = ''
    let species = ''
    let item = ''

    const itemSplit = firstLine.split('@')
    if (itemSplit.length > 1) {
      item = itemSplit[1].trim()
    }

    const namePart = itemSplit[0].trim()
    const speciesMatch = namePart.match(/^(.*?)\s*\(([^)]+)\)\s*(\([MF]\))?$/)

    if (speciesMatch) {
      nickname = speciesMatch[1].trim()
      species = speciesMatch[2].trim()
    } else {
      species = namePart.replace(/\s*\([MF]\)$/, '').trim()
    }

    let ability = ''
    let teraType = ''
    let shiny = false
    let nature = ''
    const moves: string[] = []
    const evs: Record<string, number> = {}

    lines.slice(1).forEach(line => {
      if (line.startsWith('Ability:')) ability = line.replace('Ability:', '').trim()
      if (line.startsWith('Tera Type:')) teraType = line.replace('Tera Type:', '').trim()
      if (line.startsWith('Shiny:')) shiny = line.toLowerCase().includes('yes')
      if (line.endsWith('Nature')) nature = line.replace('Nature', '').trim()
      if (line.startsWith('-')) moves.push(line.replace('-', '').trim())

      if (line.startsWith('EVs:')) {
        const evParts = line.replace('EVs:', '').split('/')
        evParts.forEach(part => {
          const [val, stat] = part.trim().split(' ')
          if (val && stat) evs[stat.toLowerCase()] = parseInt(val, 10)
        })
      }
    })

    return { species, nickname, item, ability, teraType, shiny, nature, moves, evs }
  }).filter(Boolean) as PokemonData[]
}

// Normalizar nombres para cargar imágenes desde la PokeAPI
function getPokemonImage(species: string, shiny: boolean) {
  const cleanName = species
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace('-mega', '')
    .replace('-gmax', '')

  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${cleanName}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${cleanName}.png`
}

export default function TeamViewerModal({
  isOpen,
  onClose,
  jugadorNombre,
  pokepasteText,
  isEditable = false,
  onSavePokepaste
}: TeamViewerModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputText, setInputText] = useState(pokepasteText || '')

  if (!isOpen) return null

  const team = parsePokepaste(pokepasteText || '')

  const handleSave = async () => {
    if (onSavePokepaste) {
      await onSavePokepaste(inputText)
      setIsEditing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl p-6 w-full max-w-5xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
              ⚔️ Equipo de {jugadorNombre}
            </h2>
            <p className="text-xs text-slate-400">Torneo Nuzlocke • Lista de Combate</p>
          </div>

          <div className="flex items-center gap-3">
            {isEditable && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                {isEditing ? 'Ver Tarjetas' : '📝 Importar Pokepaste'}
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer px-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modo Edición de Texto */}
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pega aquí el texto exportado de Showdown / Pokepaste..."
              className="w-full h-80 bg-slate-900/80 border border-slate-700 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
            >
              Guardar Equipo
            </button>
          </div>
        ) : team.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="text-4xl">🎒</span>
            <p className="text-slate-400 text-sm font-medium">Este jugador aún no ha registrado su Pokepaste para el torneo.</p>
          </div>
        ) : (
          /* Grid de 6 Tarjetas Estilo Carta */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {team.map((pkmn, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-b from-[#111827] to-[#0d131f] border border-slate-800 hover:border-sky-500/50 p-5 rounded-2xl flex flex-col justify-between relative shadow-xl hover:shadow-sky-500/10 transition-all group"
              >
                {/* Shiny Badge */}
                {pkmn.shiny && (
                  <span className="absolute top-3 left-3 text-sm z-10" title="Shiny">✨</span>
                )}

                {/* Tera Type Badge */}
                {pkmn.teraType && (
                  <span className="absolute top-3 right-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 z-10">
                    Tera: {pkmn.teraType}
                  </span>
                )}

                {/* Sprite & Nombres */}
                <div className="flex flex-col items-center mt-2">
                  <img
                    src={getPokemonImage(pkmn.species, pkmn.shiny)}
                    alt={pkmn.species}
                    className="w-28 h-28 object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      // Sprite de reserva si falla la url limpia
                      (e.target as HTMLElement).setAttribute('src', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png')
                    }}
                  />
                  <h3 className="text-base font-extrabold text-slate-100 capitalize mt-1">
                    {pkmn.nickname || pkmn.species}
                  </h3>
                  {pkmn.nickname && (
                    <span className="text-[11px] font-semibold text-slate-400 capitalize">
                      ({pkmn.species})
                    </span>
                  )}
                </div>

                {/* Objeto & Habilidad */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-semibold">
                  <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-xl flex flex-col items-center text-center">
                    <span className="text-[9px] uppercase text-slate-500 font-bold">Objeto</span>
                    <span className="text-slate-300 truncate w-full">{pkmn.item || 'Ninguno'}</span>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-xl flex flex-col items-center text-center">
                    <span className="text-[9px] uppercase text-slate-500 font-bold">Habilidad</span>
                    <span className="text-sky-400 truncate w-full">{pkmn.ability || 'Desconocida'}</span>
                  </div>
                </div>

                {/* Movimientos */}
                <div className="mt-4 space-y-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Movimientos</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {pkmn.moves.slice(0, 4).map((move, mIdx) => (
                      <div
                        key={mIdx}
                        className="bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-200 truncate hover:border-slate-700"
                      >
                        {move}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Naturaleza */}
                {pkmn.nature && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>Naturaleza</span>
                    <span className="text-amber-400 font-bold">{pkmn.nature}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}