const { MongoClient } = require("mongodb");
const { config } = require("./config");
const { ensureDatabase } = require("./dbSetup");

/** A single MongoClient (and ready database) shared for the life of the process. */
let clientPromise;
let dbPromise;

function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(config.mongoUri, {
      appName: "lawazia-toto",
      maxPoolSize: 10,
      // Majority write concern + read concern so transactions see committed data.
      writeConcern: { w: "majority" },
      readConcern: { level: "majority" },
    });
    clientPromise = client.connect().catch((err) => {
      clientPromise = undefined;
      throw err;
    });
  }
  return clientPromise;
}

/** Returns the database, creating indexes and the vehicle document once per process. */
function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const client = await getMongoClient();
      const db = client.db(config.mongoDb);
      await ensureDatabase(db);
      return db;
    })().catch((err) => {
      dbPromise = undefined;
      throw err;
    });
  }
  return dbPromise;
}

/** For scripts: close the shared client so the process can exit. */
async function closeMongo() {
  const client = clientPromise ? await clientPromise.catch(() => undefined) : undefined;
  clientPromise = undefined;
  dbPromise = undefined;
  await client?.close();
}

module.exports = { getMongoClient, getDb, closeMongo };
