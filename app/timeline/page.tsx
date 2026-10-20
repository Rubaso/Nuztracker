'use client'

import { useMemo, useState } from 'react'
import capturas from '@/data/capturas.json'
import { JUGADORES } from '@/lib/constants'

type Captura = (typeof capturas)[number]

const statusStyle: Record<string, string> = {
  VIVO: 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50',
  MUERTO: 'text-rose-300 bg-rose-950/40 border-rose-800/50',
  ESCAPADO: 'text-amber-300 bg-amber-950/40 border-amber-800/50',
  INTERCAMBIADO: 'text-purple-300 bg-purple-950/40 border-purple-800/50',
}

export default function TimelinePage() {
  const [search, setSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState('Todos')

  const visibleCaptures = useMemo(() => {
    const query = search.trim().toLowerCase()
    return capturas.filter((entry) => {
      const player = JUGADORES.find((item) => item.id === entry.jugador_id)?.name || `Jugador ${entry.jugador_id}`
      const matchesPlayer = selectedPlayer === 'Todos' || player === selectedPlayer
      const matchesSearch = !query || `${entry.ruta} ${entry.pokemon_name} ${player} ${entry.estado}`.toLowerCase().includes(query)
      return matchesPlayer && matchesSearch
    })
  }, [search, selectedPlayer])

  const grouped = useMemo(() => {
    const groups = new Map<string, Captura[]>()
    for (const capture of visibleCaptures) {
      const route = capture.ruta || 'Zona desconocida'
      groups.set(route, [...(groups.get(route) || []), capture])
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [visibleCaptures])

  return (
    <div className="space-y-6 w-full px-2 py-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-amber-400">📍 Registro de capturas</h1>
          <p className="text-xs text-slate-500 mt-1">{visibleCaptures.length} registros en esta instantánea · Solo lectura</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Buscar Pokémon, ruta o estado..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full sm:w-72 bg-[#0d131f] text-zinc-100 text-sm rounded-xl px-4 py-2.5 border border-white/10 focus:outline-none"
          />
          <select
            value={selectedPlayer}
            onChange={(event) => setSelectedPlayer(event.target.value)}
            className="bg-[#0d131f] text-zinc-100 text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none"
          >
            <option>Todos</option>
            {JUGADORES.map((player) => <option key={player.id}>{player.name}</option>)}
          </select>
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No hay capturas que coincidan con la búsqueda.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([route, captures]) => (
            <section key={route} className="rounded-2xl border border-white/10 bg-[#0b0f17]/90 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-black/30 border-b border-white/10">
                <h2 className="font-bold text-amber-300">📍 {route}</h2>
                <span className="text-xs text-slate-500">{captures.length} capturas</span>
              </div>
              <div className="flex flex-wrap gap-3 p-4">
                {captures.map((entry) => {
                  const player = JUGADORES.find((item) => item.id === entry.jugador_id)
                  const status = entry.estado || 'VIVO'
                  return (
                    <article key={entry.id} className="flex items-center gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3 min-w-[220px]">
                      {entry.pokemon_id ? (
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.is_shiny ? 'shiny/' : ''}${entry.pokemon_id}.png`}
                          alt={entry.pokemon_name}
                          className={`w-14 h-14 object-contain ${status === 'MUERTO' ? 'grayscale opacity-40' : ''}`}
                        />
                      ) : <span className="w-14 text-center text-2xl">🐾</span>}
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold capitalize text-slate-100 truncate">
                          {entry.is_shiny && '✨ '}{entry.pokemon_name}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate">{player?.name || `Jugador ${entry.jugador_id}`}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[9px] font-bold ${statusStyle[status] || statusStyle.VIVO}`}>
                          {status}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
