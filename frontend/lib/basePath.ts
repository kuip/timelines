/**
 * Get the base path for the application
 * This is needed for GitHub Pages deployment where the app is served from a subdirectory
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Prepend the base path to a URL
 * Usage: assetUrl('/images/logo.png') -> '/repo-name/images/logo.png' (on GitHub Pages)
 */
export function assetUrl(path: string): string {
  // Don't prepend basePath if it's already there or if it's an external URL
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith(basePath)) {
    return path;
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${basePath}${normalizedPath}`;
}
