/**
 * Stable island ID generation based on canonical file paths.
 * IDs are deterministic for file-based imports and robust in monorepos.
 */
import { realpathSync } from "fs";
import { isAbsolute, relative, resolve } from "path";

/** Length of hashed island IDs used in data-id and generated chunk filenames */
export const ISLAND_ID_LENGTH = 12;

const canonicalFileCache = new Map<string, string>();
const canonicalRootCache = new Map<string, string>();

const toPosixPath = (value: string): string => value.replace(/\\/g, "/");

/**
 * Short deterministic hash helper used for island IDs.
 */
export const hash = (value: string): string =>
  new Bun.CryptoHasher("md5").update(value).digest("hex").slice(0, ISLAND_ID_LENGTH);

/**
 * Canonicalize file path for stable hashing.
 * Falls back to resolve() when realpath cannot be resolved.
 */
export const canonicalFilePath = (file: string): string => {
  const absolutePath = resolve(file);
  const cached = canonicalFileCache.get(absolutePath);
  if (cached) return cached;

  let canonical = absolutePath;
  try {
    canonical = realpathSync(absolutePath);
  } catch {
    // Keep resolved absolute path when the file does not exist yet.
  }

  const normalized = toPosixPath(canonical);
  canonicalFileCache.set(absolutePath, normalized);
  return normalized;
};

const canonicalRootPath = (rootDir: string): string => {
  const absolutePath = resolve(rootDir);
  const cached = canonicalRootCache.get(absolutePath);
  if (cached) return cached;

  let canonical = absolutePath;
  try {
    canonical = realpathSync(absolutePath);
  } catch {
    // Keep resolved absolute path when the directory does not exist yet.
  }

  const normalized = toPosixPath(canonical);
  canonicalRootCache.set(absolutePath, normalized);
  return normalized;
};

/**
 * Convert file path to a stable key:
 * - relative to rootDir when inside rootDir
 * - otherwise canonical absolute path
 */
export const toStableKey = (file: string, rootDir: string): string => {
  const canonicalFile = canonicalFilePath(file);
  const root = canonicalRootPath(rootDir);
  const rel = toPosixPath(relative(root, canonicalFile));
  const isWithinRoot = !isAbsolute(rel) && rel !== ".." && !rel.startsWith("../");

  return isWithinRoot ? rel : canonicalFile;
};

/**
 * Build final stable island ID from canonical path key.
 */
export const islandIdFromFile = (file: string, rootDir: string): string =>
  hash(toStableKey(file, rootDir));
