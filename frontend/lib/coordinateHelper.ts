/**
 * Shared coordinate system helper for timeline positioning
 * Used by both canvas and HTML panels to ensure identical positioning
 */

const START_TIME = -435494878264400000; // Big Bang in Unix seconds
const NOW_TIME = Math.floor(Date.now() / 1000); // Current time
const FUTURE_HORIZON_TIME = NOW_TIME + (200 * 31536000); // Now + 200 years
const END_TIME = 435457000000000000;   // Far future (not used as the actual limit)

/**
 * Calculate Y position for an event based on its unix timestamp
 * This function is used by BOTH the canvas and HTML cards to ensure perfect alignment
 *
 * New simplified coordinate system:
 * - y: Unix timestamp at the reference point (1/3 from top of screen)
 * - k: Zoom factor (seconds per pixel) - higher = more zoomed out
 * - Timeline direction: PAST is DOWN (higher Y), FUTURE is UP (lower Y)
 *
 * @param unixSeconds - The event's unix timestamp
 * @param timelineHeight - Height of the timeline (in pixels)
 * @param transform - Pan and zoom transform { y: referenceTimestamp, k: secondsPerPixel }
 * @returns Y position in pixels
 */
export const calculateEventY = (
  unixSeconds: number,
  timelineHeight: number,
  transform: { y: number; k: number }
): number => {
  const numSeconds = typeof unixSeconds === 'number' ? unixSeconds : parseInt(unixSeconds as any);

  // y is the timestamp at the reference point (1/3 from top)
  // k is seconds per pixel (zoom factor)
  // Calculate pixel offset from reference point
  // NEGATIVE because past (smaller timestamps) should be DOWN (higher Y values)
  const referenceY = timelineHeight / 3;
  const timestampOffset = numSeconds - transform.y;
  const pixelOffset = -timestampOffset / transform.k;

  return referenceY + pixelOffset;
};

/**
 * Get START_TIME constant
 */
export const getStartTime = () => START_TIME;

/**
 * Get END_TIME constant
 */
export const getEndTime = () => END_TIME;

/**
 * Get FUTURE_HORIZON_TIME constant (Now + 200 years)
 */
export const getFutureHorizonTime = () => FUTURE_HORIZON_TIME;

/**
 * Get NOW_TIME constant
 */
export const getNowTime = () => NOW_TIME;

/**
 * Determine which events can be displayed based on collision detection
 * Same logic used by both canvas and HTML panels for consistency
 *
 * @param events - Array of events with their Y positions
 * @param containerHeight - Height of the container (full height for canvas, panel height for HTML)
 * @returns Set of event IDs that should be displayed
 */
export const getDisplayableEvents = (
  events: Array<{ event: any; y: number }>,
  containerHeight: number
): Set<string> => {
  const CARD_HEIGHT = 100; // Same as both canvas images and HTML cards
  const MIN_DISPLAY_HEIGHT = 24; // Minimum visible height needed

  const displayable = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    const { event, y } = events[i];

    // Calculate available vertical space to next event
    let availableSpace: number;
    if (i < events.length - 1) {
      availableSpace = events[i + 1].y - y;
    } else {
      // For last event, use remaining space to bottom
      availableSpace = containerHeight - y;
    }

    // Only display if there's enough space to show at least one line
    if (availableSpace >= MIN_DISPLAY_HEIGHT) {
      displayable.add(event.id);
    }
  }

  return displayable;
};
