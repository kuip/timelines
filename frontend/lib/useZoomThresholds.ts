import { useMemo } from 'react';

export interface ZoomThreshold {
  name: string;
  k: number;
  unit: string;
  seconds: number;
  quantity: number;
  precision: string;
  minPixelSpacing: number;
}

export const useZoomThresholds = (): ZoomThreshold[] => {
  return useMemo(() => {
    // Import the JSON directly
    const thresholds = require('@/config/zoomThresholds.json').zoomThresholds;
    // Sort by k value in descending order (highest k first)
    return thresholds.sort((a: ZoomThreshold, b: ZoomThreshold) => b.k - a.k);
  }, []);
};
