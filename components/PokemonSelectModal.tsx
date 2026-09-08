'use client'

import { useState, useEffect } from 'react'

interface PokemonSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (pokemonName: string, pokemonId: number) => void
  jugadorNombre: string
  ruta: string
}

// Caché global en memoria para no repetir la llamada a PokeAPI
let cachedPokemonList: { name: string; id: number }[] | null = null

export default function PokemonSelectModal({
  isOpen,
  onClose,
  onSelect,
  jugadorNombre,
  ruta,
}: PokemonSelectModalProps) {
  const [pokemonList, setPokemonList] = useState<{ name: string; id: number }[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const fetchAllPokemon = async () => {
      // Si ya cargamos la lista previamente, usamos la caché de inmediato
      if (cachedPokemonList) {
        setPokemonList(cachedPokemonList)
        return
      }

      setLoading(true)
      try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
        const data = await res.json()
        
        // Extraer el ID real desde la URL en lugar de usar index + 1
        const list = data.results.map((p: { name: string; url: string }) => {
          const parts = p.url.split('/').filter(Boolean)
          const id = parseInt(parts[parts.length - 1], 10)
          return { name: p.name, id }
        })

        cachedPokemonList = list
        setPokemonList(list)
      } catch (err) {
        console.error('Error cargando Pokémon:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllPokemon()
  }, [isOpen])

  if (!isOpen) return null

  const filtered = pokemonList.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Cabecera */}
        <div className="flex justify-between items-start mb-5 pb-3 border-b border-white/5">
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-zinc-400">
              Añadir captura
            </h3>
            <p className="text-sm font-medium text-zinc-200 mt-0.5">
              {jugadorNombre} <span className="text-zinc-500">/</span> <span className="text-zinc-300">{ruta}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm font-medium p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Buscador */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-[#121826] text-zinc-200 text-xs rounded-xl px-4 py-2.5 border border-white/5 focus:outline-none focus:border-white/20 transition-all placeholder:text-zinc-600"
          />
        </div>

        {/* Grid minimalista */}
        <div className="overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 gap-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="col-span-full text-center py-12 text-zinc-600 text-xs font-medium">
              Cargando Pokédex...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-600 text-xs font-medium">
              No se encontraron Pokémon
            </div>
          ) : (
            filtered.map((pkmn) => (
              <button
                key={pkmn.id}
                onClick={() => {
                  onSelect(pkmn.name, pkmn.id)
                  onClose()
                  setSearch('')
                }}
                className="flex flex-col items-center p-2.5 rounded-xl bg-[#121826]/60 hover:bg-[#1a2336] border border-white/[0.03] hover:border-white/10 transition-all group cursor-pointer"
              >
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmn.id}.png`}
                  alt={pkmn.name}
                  className="w-12 h-12 object-contain transition-transform group-hover:scale-105 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 capitalize truncate w-full text-center mt-1">
                  {pkmn.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}