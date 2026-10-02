import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'

// AI Prediction endpoint
export async function POST(req: Request) {
    try {
        const body = await req.json()
        
        // Call Python AI service
        const mlUrl = process.env.ML_URL || process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8000'
        const prediction = await fetch(`${mlUrl.replace(/\/+$/, '')}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        })
        
        const result = await prediction.json()

        // Best-effort persistence in MongoDB — never breaks prediction on failure
        try {
            const client = await connectDB()
            await client.db('resilio').collection('predictions').insertOne({
                region: body.region,
                probability: result.probability,
                timestamp: new Date(),
                preventiveMeasures: result.preventive_measures,
            })
        } catch (storeErr) {
            console.error('prediction persistence skipped:', storeErr)
        }
        
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}