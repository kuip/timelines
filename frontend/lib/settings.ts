// Centralized settings loader with caching
let settingsCache: any = null;
let settingsPromise: Promise<any> | null = null;

export async function loadSettings() {
  // Return cached settings if already loaded
  if (settingsCache) {
    return settingsCache;
  }

  // If already loading, return the existing promise
  if (settingsPromise) {
    return settingsPromise;
  }

  // Start loading settings
  settingsPromise = (async () => {
    try {
      const response = await fetch('/settings.json');
      if (response.ok) {
        const config = await response.json();
        settingsCache = config;
        return config;
      }
      throw new Error('Failed to load settings');
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Return default settings if fetch fails
      settingsCache = {
        api_url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
        ui: {
          timelineCanvasWidthPx: 200,
          timelineSliverWidthPx: 32,
          responsiveBreakpointPx: 768,
          mapWidthPercent: 45,
          cardHeightPx: 100,
          cardViewportPaddingPx: 0,
          imagePaddingPx: 2,
        },
        default_transform: {
          y: 0,
          k: 1,
        },
      };
      return settingsCache;
    } finally {
      settingsPromise = null;
    }
  })();

  return settingsPromise;
}

// Helper to get just the API URL
export async function getApiUrl(): Promise<string> {
  const settings = await loadSettings();
  return settings.api_url || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
}

// Helper to get UI config
export async function getUiConfig() {
  const settings = await loadSettings();
  return settings.ui || {
    timelineCanvasWidthPx: 200,
    timelineSliverWidthPx: 32,
    responsiveBreakpointPx: 768,
    mapWidthPercent: 45,
    cardHeightPx: 100,
    cardViewportPaddingPx: 0,
    imagePaddingPx: 2,
  };
}

// Helper to get default transform
export async function getDefaultTransform() {
  const settings = await loadSettings();
  return settings.default_transform || { y: 0, k: 1 };
}
