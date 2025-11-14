import { EventResponse } from '@/types';

/**
 * Map event categories to appropriate colors and symbols
 * Uses SVG data URIs to avoid CORS issues and ensure reliable rendering
 */
const CATEGORY_IMAGES: Record<string, { bgColor: string; symbol: string }> = {
  cosmic: { bgColor: '#1a1a2e', symbol: '★' }, // Cosmic (star)
  geological: { bgColor: '#8B4513', symbol: '🪨' }, // Geological (rock)
  biological: { bgColor: '#228B22', symbol: '🧬' }, // Biological (DNA)
  historical: { bgColor: '#8B0000', symbol: '🏛️' }, // Historical (building)
  political: { bgColor: '#191970', symbol: '🏙️' }, // Political (parliament)
  technological: { bgColor: '#2F4F4F', symbol: '🤖' }, // Technological (robot)
  contemporary: { bgColor: '#FF69B4', symbol: '🌍' }, // Contemporary (globe)
};

/**
 * Generate SVG data URI for a category
 */
const generateSVGDataUri = (bgColor: string, symbol: string): string => {
  // Create a simple colored square SVG with text
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="${bgColor}"/>
    <text x="64" y="64" font-size="64" text-anchor="middle" dominant-baseline="central" fill="white">${symbol}</text>
  </svg>`;
  // Encode the SVG as a data URI (URL-safe encoding)
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

/**
 * Get appropriate image URL for an event
 * Returns null if no real image exists (per CLAUDE.md: no placeholders/mocks)
 */
export const getEventImageUrl = (event: EventResponse): string | null => {
  // Only return real image URLs - no placeholders or mocks
  return event.image_url || null;
};

/**
 * Preload an image and return a promise that resolves when loaded
 */
export const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

/**
 * Calculate the dimensions to fit an image in a box while maintaining aspect ratio
 * Returns the width and height that maintains aspect ratio within the constraints
 */
export const calculateImageDimensions = (
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = naturalWidth / naturalHeight;
  const availableAspectRatio = maxWidth / maxHeight;

  let width: number, height: number;

  if (aspectRatio > availableAspectRatio) {
    // Image is wider
    width = maxWidth;
    height = maxWidth / aspectRatio;
  } else {
    // Image is taller
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  return { width, height };
};
