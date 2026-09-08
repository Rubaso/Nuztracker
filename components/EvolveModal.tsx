'use client'

import { useState, useEffect } from 'react'

interface EvolveModalProps {
  isOpen: boolean
  onClose: () => void
  onEvolve: (evolvedName: string, evolvedId: number, nuevaHabilidad?: string) => void
  onRevert: () => void
  basePokemon: {
    name: string
    id: number
    isShiny?: boolean
    isEvolved?: boolean
    evolvedName?: string
    habilidadActual?: string
  }
}

let cachedList: { name: string; id: number }[] | null = null

export default function EvolveModal({
  isOpen,
  onClose,
  onEvolve,
  onRevert,
  basePokemon,
}: EvolveModalProps) {
  const [pokemonList, setPokemonList] = useState<{ name: string; id: number }[]>([])
  const [search, setSearch] = useState('')
  const [selectedPkmn, setSelectedPkmn] = useState<{ name: string; id: number } | null>(null)
  const [habilidad, setHabilidad] = useState('')
  const [loading, setLoading] = useState(false)

  // Cargar datos del Pokémon base al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setHabilidad(basePokemon.habilidadActual || '')
      setSelectedPkmn(null)
      setSearch('')
    }
  }, [isOpen, basePokemon])

  // Cargar lista Pokédex
  useEffect(() => {
    if (!isOpen) return

    const loadPokemon = async () => {
      if (cachedList) {
        setPokemonList(cachedList)
        return
      }
      setLoading(true)
      try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
        const data = await res.json()
        const list = data.results.map((p: { name: string; url: string }) => {
          const parts = p.url.split('/').filter(Boolean)
          return { name: p.name, id: parseInt(parts[parts.length - 1], 10) }
        })
        cachedList = list
        setPokemonList(list)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    loadPokemon()
  }, [isOpen])

  if (!isOpen) return null

  const filtered = pokemonList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-amber-400">⚡ Evolucionar Pokémon</h3>
            <p className="text-xs text-slate-400 capitalize">
              Base: <span className="font-semibold text-slate-200">{basePokemon.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-sm cursor-pointer">✕</button>
        </div>

        {/* Campo Habilidad */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Nueva Habilidad (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: Impulso, Competitivo..."
            value={habilidad}
            onChange={(e) => setHabilidad(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Buscador de Pokémon */}
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Selecciona la Evolución
          </label>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />

          <div className="overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 gap-2 pr-1 custom-scrollbar pt-2">
            {loading ? (
              <p className="col-span-full text-center py-8 text-xs text-slate-500">Cargando lista...</p>
            ) : (
              filtered.map((p) => {
                const isSelected = selectedPkmn?.id === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPkmn(p)}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                      alt={p.name}
                      className="w-10 h-10 object-contain"
                    />
                    <span className="text-[10px] font-medium capitalize truncate w-full text-center mt-1">
                      {p.name}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <button
            type="button"
            disabled={!selectedPkmn}
            onClick={() => {
              if (selectedPkmn) {
                onEvolve(selectedPkmn.name, selectedPkmn.id, habilidad)
              }
            }}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              selectedPkmn
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            Confirmar Evolución
          </button>

          {basePokemon.isEvolved && (
            <button
              type="button"
              onClick={onRevert}
              className="w-full py-2 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              Revertir Evolución
            </button>
          )}
        </div>

      </div>
    </div>
  )
}