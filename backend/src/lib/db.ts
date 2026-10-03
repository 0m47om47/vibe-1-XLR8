import { getDb } from "./mongodb";
import { collections, type Collections } from "./dbSetup";

/** Typed collections on the ready (indexed) database. */
export async function db(): Promise<Collections> {
  return collections(await getDb());
}
