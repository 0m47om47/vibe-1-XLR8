import { MongoClient, type Db } from "mongodb";
import { config } from "./config";
import { ensureDatabase } from "./dbSetup";

/**
 * A single MongoClient per process. In development Next.js hot-reloads modules,
 * so the client promise is cached on globalThis to avoid leaking connections.
 */
type MongoCache = {
  client?: Promise<MongoClient>;
  ready?: Promise<Db>;
};

const globalForMongo = globalThis as typeof globalThis & { __totoMongo?: MongoCache };
const cache: MongoCache = (globalForMongo.__totoMongo ??= {});

export function getMongoClient(): Promise<MongoClient> {
  if (!cache.client) {
    const client = new MongoClient(config.mongoUri, {
      appName: "lawazia-toto",
      maxPoolSize: 10,
      // Majority write concern + read concern so transactions see committed data.
      writeConcern: { w: "majority" },
      readConcern: { level: "majority" },
    });
    cache.client = client.connect().catch((err) => {
      cache.client = undefined;
      throw err;
    });
  }
  return cache.client;
}

/** Returns the database, creating indexes and the vehicle document once per process. */
export function getDb(): Promise<Db> {
  if (!cache.ready) {
    cache.ready = (async () => {
      const client = await getMongoClient();
      const db = client.db(config.mongoDb);
      await ensureDatabase(db);
      return db;
    })().catch((err) => {
      cache.ready = undefined;
      throw err;
    });
  }
  return cache.ready;
}

/** For scripts: close the shared client so the process can exit. */
export async function closeMongo(): Promise<void> {
  const client = cache.client ? await cache.client.catch(() => undefined) : undefined;
  cache.client = undefined;
  cache.ready = undefined;
  await client?.close();
}
