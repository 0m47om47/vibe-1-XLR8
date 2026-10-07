const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");

/**
 * Password hashing with Node's built-in scrypt (memory-hard KDF) — no native
 * add-on needed. Stored format: scrypt$N$r$p$<salt b64>$<hash b64>, so the
 * cost parameters can be raised later without breaking existing hashes.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

function deriveKey(password, salt, keyLen, opts) {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await deriveKey(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * A real hash of a random password. Login verifies against it when the email is
 * unknown so response timing does not reveal which emails are registered.
 */
let dummyHash;
function getDummyHash() {
  return (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));
}

module.exports = { hashPassword, verifyPassword, getDummyHash };
