'use client'

import { useState } from 'react'
import { parseRxDataSave } from '@/lib/rxdataParser'

interface SaveUploaderProps {
  onPokemonParsed: (data: {
    trainerId: string
    trainerName: string
    pokemon: any[]
  }) => void
}

export default function SaveUploader({
  onPokemonParsed,
}: SaveUploaderProps) {
  const [loading, setLoading] = useState(false)

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]

    if (!file) return

    setLoading(true)

    try {
      if (!file.name.toLowerCase().endsWith('.rxdata')) {
        throw new Error(
          'El archivo seleccionado no parece ser una partida .rxdata.'
        )
      }

      const result = await parseRxDataSave(file)

      console.log('SAVE PARSEADO:', result)

      onPokemonParsed(result)
    } catch (error) {
      console.error('Error leyendo el save:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'Error leyendo la partida.'
      )
    } finally {
      setLoading(false)

      // Permite volver a seleccionar el mismo archivo.
      e.target.value = ''
    }
  }

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="text-sm font-bold text-slate-100">
          Auto-rellenar con Partida
        </h4>

        <p className="text-xs text-slate-400">
          Importa automáticamente los Pokémon de tu partida y sus zonas.
        </p>
      </div>

      <label className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-lg flex items-center gap-2">
        <span>
          {loading
            ? 'Leyendo partida...'
            : '📂 Cargar .RXDATA'}
        </span>

        <input
          type="file"
          accept=".rxdata"
          onChange={handleFileUpload}
          disabled={loading}
          className="hidden"
        />
      </label>
    </div>
  )
}