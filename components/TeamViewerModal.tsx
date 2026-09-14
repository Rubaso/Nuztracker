'use client'

import { useEffect, useState } from 'react'

interface TeamViewerModalProps {
  isOpen: boolean
  onClose: () => void
  jugadorNombre: string
  pokepasteText: string | null
  isPublished?: boolean
  isEditable?: boolean
  onSavePokepaste?: (newText: string) => Promise<void>
}

interface MoveData {
  original: string
  name: string
  type: string
  description: string
  power: number | null
  accuracy: number | null
  pp: number | null
}

interface PokemonData {
  species: string
  nickname: string
  gender: string
  level: number | null
  item: string
  ability: string
  teraType: string
  shiny: boolean
  nature: string
  moves: string[]
  evs: Record<string, number>
  ivs: Record<string, number>
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
}

const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

function parsePokepaste(text: string): PokemonData[] {
  if (!text.trim()) return []

  const blocks = text.trim().split(/\r?\n\s*\r?\n/).filter(Boolean)

  return blocks
    .map((block): PokemonData | null => {
      const lines = block.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
      if (lines.length === 0) return null

      const firstLine = lines[0]
      let nickname = ''
      let species = ''
      let gender = ''
      let item = ''

      const atIndex = firstLine.indexOf('@')
      const namePart = atIndex >= 0 ? firstLine.slice(0, atIndex).trim() : firstLine.trim()
      if (atIndex >= 0) item = firstLine.slice(atIndex + 1).trim()

      const nicknameMatch = namePart.match(/^(.+?)\s*\(([^)]+)\)\s*(?:\(([MF])\))?$/)

      if (nicknameMatch) {
        nickname = nicknameMatch[1].trim()
        species = nicknameMatch[2].trim()
        gender = nicknameMatch[3] ?? ''
      } else {
        const speciesGenderMatch = namePart.match(/^(.+?)\s*\(([MF])\)$/)
        if (speciesGenderMatch) {
          species = speciesGenderMatch[1].trim()
          gender = speciesGenderMatch[2]
        } else {
          species = namePart.trim()
        }
      }

      let ability = ''
      let teraType = ''
      let shiny = false
      let nature = ''
      let level: number | null = null
      const moves: string[] = []
      const evs: Record<string, number> = {}
      const ivs: Record<string, number> = {}

      for (const line of lines.slice(1)) {
        if (line.startsWith('Ability:')) {
          ability = line.replace('Ability:', '').trim()
          continue
        }
        if (line.startsWith('Tera Type:')) {
          teraType = line.replace('Tera Type:', '').trim()
          continue
        }
        if (line.startsWith('Level:')) {
          const value = parseInt(line.replace('Level:', '').trim(), 10)
          if (Number.isFinite(value)) level = value
          continue
        }
        if (line.startsWith('Shiny:')) {
          shiny = line.replace('Shiny:', '').trim().toLowerCase() === 'yes'
          continue
        }
        if (line.endsWith('Nature')) {
          nature = line.replace(/\s+Nature$/, '').trim()
          continue
        }
        if (line.startsWith('EVs:')) {
          const evParts = line.replace('EVs:', '').split('/')
          for (const part of evParts) {
            const match = part.trim().match(/^(\d+)\s+(.+)$/)
            if (!match) continue
            const value = parseInt(match[1], 10)
            const stat = match[2].trim().toLowerCase()
            if (Number.isFinite(value)) evs[stat] = value
          }
          continue
        }
        if (line.startsWith('IVs:')) {
          const ivParts = line.replace('IVs:', '').split('/')
          for (const part of ivParts) {
            const match = part.trim().match(/^(\d+)\s+(.+)$/)
            if (!match) continue
            const value = parseInt(match[1], 10)
            const stat = match[2].trim().toLowerCase()
            if (Number.isFinite(value)) ivs[stat] = value
          }
          continue
        }
        if (line.startsWith('-')) {
          const move = line.replace(/^-+\s*/, '').trim()
          if (move) moves.push(move)
        }
      }

      return { species, nickname, gender, level, item, ability, teraType, shiny, nature, moves, evs, ivs }
    })
    .filter((pokemon): pokemon is PokemonData => pokemon !== null)
}

function getPokemonImage(species: string, shiny: boolean) {
  const cleanName = species.toLowerCase().trim().replace(/[\'.:]/g, '').replace(/\s+/g, '-').replace(/♀/g, '-f').replace(/♂/g, '-m')
  const spriteName = shiny ? 'ani-shiny' : 'ani'
  return `https://play.pokemonshowdown.com/sprites/${spriteName}/${cleanName}.gif`
}

function getEvTotal(evs: Record<string, number>) {
  return Object.values(evs).reduce((total, value) => total + value, 0)
}

function getEvEntries(evs: Record<string, number>) {
  return STAT_ORDER.filter(stat => evs[stat] !== undefined).map(stat => ({ stat, label: STAT_LABELS[stat], value: evs[stat] }))
}

function getIvEntries(ivs: Record<string, number>) {
  return STAT_ORDER.filter(stat => ivs[stat] !== undefined).map(stat => ({ stat, label: STAT_LABELS[stat], value: ivs[stat] }))
}

function getLocalizedName(data: any) {
  return data?.names?.find((entry: any) => entry.language?.name === 'es')?.name ?? null
}

function getSpanishFlavorText(data: any) {
  const entries = data?.flavor_text_entries ?? []
  const spanish = entries.find((entry: any) => entry.language?.name === 'es')
  return spanish?.flavor_text?.replace(/\f/g, ' ').replace(/\n/g, ' ') ?? ''
}

export default function TeamViewerModal({
  isOpen,
  onClose,
  jugadorNombre,
  pokepasteText,
  isPublished = true,
  isEditable = false,
  onSavePokepaste,
}: TeamViewerModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputText, setInputText] = useState(pokepasteText || '')
  const [saving, setSaving] = useState(false)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [moveDetails, setMoveDetails] = useState<Record<string, MoveData>>({})
  const [translationsLoading, setTranslationsLoading] = useState(false)

  useEffect(() => {
    setInputText(pokepasteText || '')
  }, [pokepasteText, jugadorNombre])

  const team = parsePokepaste(pokepasteText || '')

  useEffect(() => {
    if (!isOpen || team.length === 0) {
      setTranslations({})
      setMoveDetails({})
      return
    }

    let cancelled = false
    setTranslationsLoading(true)

    const getSlug = (value: string) => value.toLowerCase().trim().replace(/[’']/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')

    async function fetchLocalized(endpoint: string) {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/${endpoint}`)
        if (!response.ok) return null
        return await response.json()
      } catch {
        return null
      }
    }

    async function loadTranslations() {
      const speciesSet = Array.from(new Set(team.map(p => getSlug(p.species)).filter(Boolean)))
      const itemSet = Array.from(new Set(team.map(p => getSlug(p.item)).filter(Boolean)))
      const abilitySet = Array.from(new Set(team.map(p => getSlug(p.ability)).filter(Boolean)))
      const natureSet = Array.from(new Set(team.map(p => getSlug(p.nature)).filter(Boolean)))
      const moveSet = Array.from(new Set(team.flatMap(p => p.moves).map(move => getSlug(move)).filter(Boolean)))

      const result: Record<string, string> = {}
      const resultMoves: Record<string, MoveData> = {}

      await Promise.all([
        ...speciesSet.map(async slug => {
          const data = await fetchLocalized(`pokemon-species/${slug}`)
          const es = getLocalizedName(data)
          if (es) result[`species:${slug}`] = es
        }),
        ...itemSet.map(async slug => {
          const data = await fetchLocalized(`item/${slug}`)
          const es = getLocalizedName(data)
          if (es) result[`item:${slug}`] = es
        }),
        ...abilitySet.map(async slug => {
          const data = await fetchLocalized(`ability/${slug}`)
          const es = getLocalizedName(data)
          if (es) result[`ability:${slug}`] = es
        }),
        ...natureSet.map(async slug => {
          const data = await fetchLocalized(`nature/${slug}`)
          const es = getLocalizedName(data)
          if (es) result[`nature:${slug}`] = es
        }),
        ...moveSet.map(async slug => {
          const data = await fetchLocalized(`move/${slug}`)
          if (!data) return
          resultMoves[slug] = {
            original: slug,
            name: getLocalizedName(data) ?? slug,
            type: getLocalizedName(data?.type) ?? data?.type?.name ?? '',
            description: getSpanishFlavorText(data),
            power: data?.power ?? null,
            accuracy: data?.accuracy ?? null,
            pp: data?.pp ?? null,
          }
        }),
      ])

      if (cancelled) return
      setTranslations(result)
      setMoveDetails(resultMoves)
      setTranslationsLoading(false)
    }

    void loadTranslations()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pokepasteText])

  if (!isOpen) return null

  const slugify = (value: string) => value.toLowerCase().trim().replace(/[’']/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
  const translate = (kind: string, value: string) => translations[`${kind}:${slugify(value)}`] || value

  const handleSave = async () => {
    if (!onSavePokepaste) return
    setSaving(true)
    try {
      await onSavePokepaste(inputText)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl p-6 w-full max-w-6xl shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">⚔️ Equipo de {jugadorNombre}</h2>
            <p className="text-xs text-slate-400 mt-1">Torneo Nuzlocke • Lista de Combate</p>
          </div>
          <div className="flex items-center gap-3">
            {isEditable && (
              <button type="button" onClick={() => setIsEditing(!isEditing)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer">
                {isEditing ? '👁️ Ver Equipo' : '📝 Importar Pokepaste'}
              </button>
            )}
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer px-2">✕</button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 mb-2">Pega aquí directamente el equipo exportado de Pokémon Showdown / PokéPaste.</p>
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={`Likitui (Houndoom) (M) @ Terrain Extender\nAbility: Hadron Engine\nLevel: 30\nEVs: 4 HP / 252 SpA / 252 Spe\nDocile Nature\nIVs: 5 HP / 0 Atk / 12 Def / 23 SpA / 19 SpD / 24 Spe\n- Nasty Plot\n- Draining Kiss\n- Burning Jealousy\n- Super Fang`} className="w-full h-96 bg-slate-950/80 border border-slate-700 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500 resize-y" />
            </div>
            <button type="button" onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider">
              {saving ? 'Guardando...' : '💾 Guardar Equipo'}
            </button>
          </div>
        ) : !isPublished && !isEditable ? (
          <div className="text-center py-16 space-y-4">
            <span className="text-5xl">🔒</span>
            <div>
              <p className="text-slate-100 text-sm font-black">Equipo todavía privado</p>
              <p className="text-slate-500 text-xs mt-1">Se publicará automáticamente cuando se pulse «🚀 Empezar Torneo».</p>
            </div>
          </div>
        ) : team.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="text-5xl">🎒</span>
            <p className="text-slate-400 text-sm font-medium">Este jugador aún no ha registrado su Pokepaste para el torneo.</p>
            {isEditable && (
              <button type="button" onClick={() => setIsEditing(true)} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition-all cursor-pointer">📝 Importar ahora</button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {translationsLoading && (
              <div className="text-[10px] text-slate-500 text-right">Traduciendo datos al castellano…</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {team.map((pkmn, idx) => {
                const evEntries = getEvEntries(pkmn.evs)
                const ivEntries = getIvEntries(pkmn.ivs)
                const totalEvs = getEvTotal(pkmn.evs)
                const speciesEs = translate('species', pkmn.species)
                const itemEs = pkmn.item ? translate('item', pkmn.item) : 'Ninguno'
                const abilityEs = pkmn.ability ? translate('ability', pkmn.ability) : 'Desconocida'
                const natureEs = pkmn.nature ? translate('nature', pkmn.nature) : ''

                return (
                  <div key={`${pkmn.nickname}-${pkmn.species}-${idx}`} className="bg-gradient-to-b from-[#111827] to-[#0d131f] border border-slate-800 hover:border-sky-500/50 rounded-2xl overflow-visible relative shadow-xl hover:shadow-sky-500/10 transition-all group">
                    <div className="px-4 pt-4 flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-100 truncate">{pkmn.nickname || speciesEs}</h3>
                          {pkmn.gender && <span className={`text-sm font-black ${pkmn.gender === 'M' ? 'text-sky-400' : 'text-pink-400'}`}>{pkmn.gender === 'M' ? '♂' : '♀'}</span>}
                          {pkmn.shiny && <span className="text-sm" title="Shiny">✨</span>}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 capitalize">{speciesEs}</span>
                      </div>
                      {pkmn.level !== null && <span className="shrink-0 text-[10px] font-black bg-slate-900 border border-slate-700 text-amber-300 px-2 py-1 rounded-lg">Nv. {pkmn.level}</span>}
                    </div>

                    <div className="flex justify-center relative h-40 items-center">
                      {pkmn.teraType && <span className="absolute top-2 right-3 text-[9px] font-black uppercase px-2 py-1 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 z-10">💎 {pkmn.teraType}</span>}
                      <img src={getPokemonImage(pkmn.species, pkmn.shiny)} alt={speciesEs} className="w-36 h-36 object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.7)] group-hover:scale-110 transition-transform" onError={(e) => { e.currentTarget.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' }} />
                    </div>

                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
                          <span className="block text-[8px] uppercase text-slate-500 font-black tracking-wider">Objeto</span>
                          <span className="block text-[10px] text-slate-200 font-bold truncate mt-1">{itemEs}</span>
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
                          <span className="block text-[8px] uppercase text-slate-500 font-black tracking-wider">Habilidad</span>
                          <span className="block text-[10px] text-sky-400 font-bold truncate mt-1">{abilityEs}</span>
                        </div>
                      </div>

                      {pkmn.nature && (
                        <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 px-3 py-2 rounded-xl">
                          <span className="text-[9px] uppercase text-slate-500 font-black">Naturaleza</span>
                          <span className="text-[10px] text-amber-400 font-black">{natureEs}</span>
                        </div>
                      )}

                      {pkmn.moves.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Movimientos</span>
                            <span className="text-[8px] text-slate-600">{pkmn.moves.length}/4</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {pkmn.moves.slice(0, 4).map((move, moveIndex) => {
                              const details = moveDetails[slugify(move)]
                              const translatedMove = details?.name ?? move

                              return (
                                <div key={`${move}-${moveIndex}`} title={details?.description || move} className="bg-slate-900/80 border border-slate-800 px-2.5 py-2 rounded-lg text-[10px] font-bold text-slate-200 truncate hover:border-sky-800 transition-colors cursor-help">
                                  {translatedMove}
                                  {details && (
                                    <span className="sr-only"> {details.type} {details.power !== null ? `Potencia ${details.power}` : ''} {details.accuracy !== null ? `Precisión ${details.accuracy}` : ''} {details.pp !== null ? `PP ${details.pp}` : ''}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {evEntries.length > 0 && (
                        <div className="border-t border-slate-800/80 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">EVs</span>
                            <span className={`text-[8px] font-bold ${totalEvs > 510 ? 'text-rose-400' : 'text-slate-500'}`}>{totalEvs}/510</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {evEntries.map(entry => (
                              <div key={entry.stat} className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg px-2 py-1.5 text-center">
                                <span className="block text-[8px] text-slate-500 font-black">{entry.label}</span>
                                <span className="block text-[10px] text-emerald-300 font-black">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {ivEntries.length > 0 && (
                        <div className="border-t border-slate-800/80 pt-3">
                          <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider block mb-2">IVs</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {ivEntries.map(entry => (
                              <div key={entry.stat} className="bg-sky-950/20 border border-sky-900/30 rounded-lg px-2 py-1.5 text-center">
                                <span className="block text-[8px] text-slate-500 font-black">{entry.label}</span>
                                <span className={`block text-[10px] font-black ${entry.value === 0 ? 'text-rose-400' : entry.value === 31 ? 'text-emerald-400' : 'text-slate-300'}`}>{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
