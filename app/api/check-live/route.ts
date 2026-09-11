// app/api/check-live/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { JUGADORES } from '@/lib/constants'

export async function GET(request: Request) {
  // 🛡️ 0. Validar token de seguridad
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    const clientId = process.env.TWITCH_CLIENT_ID
    const clientSecret = process.env.TWITCH_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Faltan las credenciales TWITCH_CLIENT_ID y TWITCH_CLIENT_SECRET en .env' }, { status: 500 })
    }

    // 1. Pedir Token de Acceso a Twitch
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST', cache: 'no-store' }
    )
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.json({ error: 'Error al autenticar con la API de Twitch' }, { status: 500 })
    }

    // 2. Extraer lista de usuarios
    const twitchUsers = JUGADORES
      .map(j => j.twitchUser)
      .filter(Boolean)

    // 3. Consultar a Twitch
    const queryParams = twitchUsers.map(user => `user_login=${user.toLowerCase()}`).join('&')
    const streamsResponse = await fetch(`https://api.twitch.tv/helix/streams?${queryParams}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    const streamsData = await streamsResponse.json()
    const activeStreams = streamsData.data || []

    // Canales activos en directo
    const liveUsers = new Set(activeStreams.map((s: any) => s.user_login.toLowerCase()))

    // 4. Actualizar estado en Supabase
    const updates = JUGADORES.map(async (j) => {
      const isLive = liveUsers.has(j.twitchUser.toLowerCase())

      return supabase.from('directos').upsert({
        jugador_id: j.id,
        is_live: isLive,
        updated_at: new Date().toISOString()
      })
    })

    await Promise.all(updates)

    return NextResponse.json({ 
      success: true, 
      liveCount: activeStreams.length, 
      liveUsers: Array.from(liveUsers) 
    })
  } catch (error: any) {
    console.error('Error en check-live API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}