'use client'

import { useState, useEffect } from 'react'

interface PokemonSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (pokemonName: string, pokemonId: number) => void
  jugadorNombre: string
  ruta: string
}

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
      if (cachedPokemonList) {
        setPokemonList(cachedPokemonList)
        return
      }

      setLoading(true)
      try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
        const data = await res.json()
        
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
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-white/5">
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
            className="w-full bg-[#121826] text-zinc-200 text-sm rounded-xl px-4 py-3 border border-white/5 focus:outline-none focus:border-white/20 transition-all placeholder:text-zinc-600"
          />
        </div>

        {/* Rejilla de 2 a 3 columnas para dejar hueco enorme */}
        <div className="overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 p-2 custom-scrollbar">
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
                className="flex flex-col items-center justify-between p-3 rounded-2xl bg-[#121826]/70 hover:bg-[#1a2336] border border-white/[0.05] hover:border-amber-500/40 transition-all group cursor-pointer overflow-hidden min-h-[140px]"
              >
                {/* Contenedor con zoom forzado para recortar el espacio transparente */}
                <div className="w-full h-28 flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pkmn.id}.png`}
                    onError={(e: any) => {
                      // Fallback si falla el Official Artwork
                      e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pkmn.id}.png`
                    }}
                    alt={pkmn.name}
                    className="w-full h-full object-contain scale-125 group-hover:scale-150 transition-transform duration-200 drop-shadow-lg"
                    loading="lazy"
                  />
                </div>
                <span className="text-xs font-bold text-zinc-300 group-hover:text-amber-400 capitalize truncate w-full text-center mt-2">
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