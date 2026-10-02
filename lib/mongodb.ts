import { MongoClient, type MongoClientOptions } from 'mongodb'

const uri = process.env.MONGODB_URI

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 3000,
}

type MongoGlobal = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

/**
 * Lazy MongoDB connection. Nothing connects at module load, so the Next.js
 * build and servers never hang waiting for a database that isn't running.
 * Call this from inside request handlers only.
 */
export async function connectDB(): Promise<MongoClient> {
  if (!uri) throw new Error('MONGODB_URI is not set')
  const globalWithMongo = globalThis as MongoGlobal
  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  return globalWithMongo._mongoClientPromise
}

export default connectDB