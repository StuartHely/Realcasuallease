import path from "path";

/**
 * Returns the absolute path to the public assets directory.
 * In production (Docker): dist/public/ (served by express.static)
 * In development: client/public/ (served by Vite)
 */
export function getPublicDir(): string {
  if (process.env.NODE_ENV === "production") {
    return path.resolve(import.meta.dirname, "public");
  }
  return path.resolve(process.cwd(), "client", "public");
}
