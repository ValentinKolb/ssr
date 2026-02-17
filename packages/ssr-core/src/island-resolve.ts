import { dirname, isAbsolute, resolve } from "path";

const hasScriptExtension = (value: string): boolean => /\.(tsx|jsx|ts|js)$/.test(value);

export const withDefaultIslandExtension = (specifier: string): string =>
  hasScriptExtension(specifier) ? specifier : `${specifier}.tsx`;

const formatResolveError = (specifier: string, resolveDir: string, importer?: string, reason?: string): Error => {
  const importerHint = importer ? ` from "${importer}"` : "";
  const detail = reason ? `\nReason: ${reason}` : "";
  return new Error(
    `[ssr] Failed to resolve island/client import "${specifier}"${importerHint} using resolveDir "${resolveDir}".` +
      `\nCheck your tsconfig paths/baseUrl (for aliases) or use a relative/absolute file import.${detail}`,
  );
};

export const resolveIslandImport = (specifier: string, resolveDir: string, importer?: string): string => {
  const normalizedSpecifier = withDefaultIslandExtension(specifier);
  const normalizedResolveDir = resolveDir || (importer ? dirname(importer) : process.cwd());

  if (specifier.startsWith(".")) {
    return resolve(normalizedResolveDir, normalizedSpecifier);
  }

  if (isAbsolute(specifier)) {
    return resolve(normalizedSpecifier);
  }

  try {
    const resolved = Bun.resolveSync(normalizedSpecifier, normalizedResolveDir);
    if (!isAbsolute(resolved)) {
      throw formatResolveError(specifier, normalizedResolveDir, importer, `resolved to non-absolute path "${resolved}"`);
    }
    return resolved;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw formatResolveError(specifier, normalizedResolveDir, importer, reason);
  }
};
