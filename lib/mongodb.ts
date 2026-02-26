import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env.local"
  );
}

/**
 * Cached connection interface to store the mongoose instance
 * and the pending connection promise across hot reloads in development.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * Extend the NodeJS global type to include our mongoose cache,
 * so it persists across module re-evaluations during Next.js hot reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Use the existing cached connection if available, otherwise initialise an empty cache.
const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

// Persist the cache on the global object so it survives hot reloads.
global.mongoose = cached;

/**
 * Establishes (or reuses) a Mongoose connection to MongoDB.
 *
 * - In development, Next.js hot-module-replacement can cause this module to be
 *   re-evaluated, which would otherwise open a new connection on every reload.
 *   Caching on `global` prevents that.
 * - In production, each serverless function invocation may share a warm
 *   container, so we reuse the existing connection when one is already open.
 *
 * @returns A resolved Mongoose instance.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Return the existing connection immediately if we have one.
  if (cached.conn) {
    return cached.conn;
  }

  // If no pending connection promise exists, create one.
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Keeps the connection alive through periods of inactivity.
      serverSelectionTimeoutMS: 5000,
      // Maximum time to wait for a connection from the pool.
      socketTimeoutMS: 45000,
    });
  }

  // Await the promise and cache the resolved connection.
  cached.conn = await cached.promise;

  return cached.conn;
}
