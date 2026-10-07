/**
 * npm run seed — resets the app's collections in MONGODB_DB and loads demo data.
 * Reads MONGODB_URI / MONGODB_DB from .env.local (via `node --env-file`).
 */
const { config } = require("../lib/config");
const { closeMongo, getMongoClient } = require("../lib/mongodb");
const { seed, DEMO_PASSWORD, DEMO_USERS } = require("./seedData");

async function main() {
  const client = await getMongoClient();
  const db = client.db(config.mongoDb);
  console.log(`Seeding database "${db.databaseName}" (existing users, sessions, requests and trips are replaced)...`);
  await seed(db);

  console.log("\nDone. Demo accounts (password for all: %s)", DEMO_PASSWORD);
  console.table(DEMO_USERS.map((u) => ({ role: u.role, name: u.name, email: u.email })));
  console.log(
    "Live demo: log in as the rider and accept the 10:00 College → Station request for tomorrow;\n" +
      "the 10:00 Office → Station request becomes CLASHED.",
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeMongo());
