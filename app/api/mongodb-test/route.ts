import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await connectDB()
    const db = client.db('resilio')

    // Simple ping to verify connection
    await db.command({ ping: 1 })

    return NextResponse.json({ status: 'Connected to MongoDB!' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to connect to MongoDB' }, { status: 500 })
  }
}