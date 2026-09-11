'use client'

import { useEffect, useState } from 'react'

interface AbilityData {
  name: string
  description: string
}

const cache = new Map<string, AbilityData>()

function normalizeAbilityId(ability: string): string {
  return ability
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

function capitalizeWords(value: string): string {
  return value.replace(/(^|[- ])\S/g, char => char.toUpperCase()).replace(/-/g, ' ')
}

async function getAbility(ability: string): Promise<AbilityData | null> {
  const id = normalizeAbilityId(ability)
  if (!id) return null
  if (cache.has(id)) return cache.get(id)!

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/ability/${encodeURIComponent(id)}`)
    if (!response.ok) return null

    const data = await response.json()

    const spanishName = data.names?.find((entry: any) => entry.language?.name === 'es')?.name
    const spanishEffect = data.effect_entries?.find((entry: any) => entry.language?.name === 'es')?.effect
    const spanishShort = data.effect_entries?.find((entry: any) => entry.language?.name === 'es')?.short_effect

    const englishEffect = data.effect_entries?.find((entry: any) => entry.language?.name === 'en')?.effect
    const englishShort = data.effect_entries?.find((entry: any) => entry.language?.name === 'en')?.short_effect

    const result: AbilityData = {
      name: spanishName || capitalizeWords(id),
      description: spanishEffect || spanishShort || englishEffect || englishShort || 'Sin descripción disponible.'
    }

    cache.set(id, result)
    return result
  } catch (error) {
    console.error('Error obteniendo habilidad desde PokéAPI:', error)
    return null
  }
}

export default function AbilityTooltip({ ability }: { ability: string }) {
  const [data, setData] = useState<AbilityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    const id = normalizeAbilityId(ability)

    if (!id) return
    if (cache.has(id)) {
      setData(cache.get(id)!)
      return
    }

    setLoading(true)
    getAbility(ability).then(result => {
      if (!cancelled) {
        setData(result)
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [ability])

  const displayName = data?.name || ability

  return (
    <div
      className="relative max-w-[140px]"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <button
        type="button"
        className="text-[10px] text-sky-400 font-semibold bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded-md truncate max-w-[140px] cursor-help hover:text-sky-300 hover:border-sky-600/60 transition-colors"
        aria-label={`Información sobre la habilidad ${displayName}`}
      >
        {displayName} <span className="text-sky-500">ⓘ</span>
      </button>

      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-sky-700/50 bg-[#0b1220] p-3 text-left shadow-2xl pointer-events-none">
          <div className="text-xs font-black text-sky-300 mb-1.5">{displayName}</div>
          {loading ? (
            <div className="text-[11px] text-zinc-400">Cargando descripción...</div>
          ) : data ? (
            <div className="text-[11px] leading-relaxed text-zinc-200">{data.description}</div>
          ) : (
            <div className="text-[11px] leading-relaxed text-zinc-500">No se ha encontrado esta habilidad en PokéAPI.</div>
          )}
        </div>
      )}
    </div>
  )
}
