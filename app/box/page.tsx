'use client'

import { useMemo, useState } from 'react'
import capturas from '@/data/capturas.json'
import { JUGADORES } from '@/lib/constants'

type Captura = (typeof capturas)[number]

export default function BoxPage() {
  const [selectedJugadorId, setSelectedJugadorId] = useState(JUGADORES[0].id)
  const [search, setSearch] = useState('')

  const jugador = JUGADORES.find((entry) => entry.id === selectedJugadorId)
  const filteredPlayers = JUGADORES.filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase()))
  const playerCaptures = useMemo(
    () => capturas.filter((entry) => entry.jugador_id === selectedJugadorId),
    [selectedJugadorId]
  )
  const team = playerCaptures.filter((entry) => entry.is_team && entry.estado !== 'MUERTO' && entry.estado !== 'INTERCAMBIADO')
  const box = playerCaptures.filter((entry) =>
    !entry.is_team && entry.estado !== 'MUERTO' && entry.estado !== 'ESCAPADO' && entry.estado !== 'INTERCAMBIADO'
  )
  const grave = playerCaptures.filter((entry) => entry.estado === 'MUERTO')

  const renderPokemon = (pokemon: Captura, graveyard = false) => {
    const spriteId = pokemon.is_evolved && pokemon.evolved_id ? pokemon.evolved_id : pokemon.pokemon_id
    const name = pokemon.is_evolved && pokemon.evolved_name ? pokemon.evolved_name : pokemon.pokemon_name
    return (
      <article key={pokemon.id} className={`relative flex flex-col items-center bg-[#0d1322] border p-4 rounded-2xl min-w-[150px] shadow-xl ${graveyard ? 'border-rose-900/60' : pokemon.is_team ? 'border-yellow-500/60' : 'border-slate-800/80'}`}>
        {pokemon.is_shiny && <span className="absolute top-3 left-3" title="Shiny">✨</span>}
        {spriteId ? (
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.is_shiny ? 'shiny/' : ''}${spriteId}.png`}
            alt={name}
            className={`w-24 h-24 object-contain ${graveyard ? 'grayscale opacity-40' : ''}`}
          />
        ) : <div className="w-24 h-24 flex items-center justify-center text-xs text-slate-500">Sin sprite</div>}
        <span className={`text-sm font-bold capitalize text-center ${graveyard ? 'text-rose-300' : 'text-slate-200'}`}>{name}</span>
        {pokemon.habilidad && <span className="text-[10px] text-sky-400 mt-1">{pokemon.habilidad}</span>}
        <span className="text-[10px] text-slate-500 mt-2 text-center">{pokemon.ruta}</span>
      </article>
    )
  }

  return (
    <div className="space-y-8 p-6 max-w-[95vw] mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:w-80 bg-[#121c31] text-slate-200 text-base rounded-lg px-4 py-2 border border-slate-700/80 focus:outline-none"
        />
        <h2 className="text-base font-black tracking-widest uppercase text-slate-300">Caja de {jugador?.name}</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black tracking-widest uppercase text-pink-500">JUGADORES</h3>
          <div className="flex flex-col gap-3">
            {filteredPlayers.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedJugadorId(entry.id)}
                className={`w-full text-left px-5 py-3 rounded-2xl border font-bold text-base transition-all ${entry.id === selectedJugadorId ? 'bg-sky-900/60 border-sky-500/50 text-white' : 'bg-slate-900/40 border-slate-800/60 text-slate-400 hover:text-slate-200'}`}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </aside>
        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-4">
            <h3 className="text-xs font-black tracking-widest uppercase text-yellow-400">EQUIPO · {team.length}</h3>
            {team.length ? <div className="flex flex-wrap gap-4">{team.map((pokemon) => renderPokemon(pokemon))}</div> : <p className="text-sm text-slate-500">No hay Pokémon de equipo en esta instantánea.</p>}
          </section>
          <section className="space-y-4">
            <h3 className="text-xs font-black tracking-widest uppercase text-sky-400">CAJA · {box.length}</h3>
            {box.length ? <div className="flex flex-wrap gap-4">{box.map((pokemon) => renderPokemon(pokemon))}</div> : <p className="text-sm text-slate-500">Ningún Pokémon en la caja.</p>}
          </section>
          <section className="space-y-4">
            <h3 className="text-xs font-black tracking-widest uppercase text-rose-500">MUERTOS · {grave.length}</h3>
            {grave.length ? <div className="flex flex-wrap gap-4">{grave.map((pokemon) => renderPokemon(pokemon, true))}</div> : <p className="text-sm text-slate-500">Ninguno.</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
