import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"

export function getDB(binding: D1Database) {
  return drizzle(binding, { schema })
}
