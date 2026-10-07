const { getDb } = require("./mongodb");
const { collections } = require("./dbSetup");

/** Collections on the ready (indexed) database. */
async function db() {
  return collections(await getDb());
}

module.exports = { db };
