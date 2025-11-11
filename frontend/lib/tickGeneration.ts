/**
 * Tick generation and formatting utilities for timeline rendering
 */

export const TIME_UNITS = [
  { quantity: 1, unit: 'B years', seconds: 1e9 * 31536000, precision: 'century' },
  { quantity: 100, unit: 'M years', seconds: 100e6 * 31536000, precision: 'century' },
  { quantity: 10, unit: 'M years', seconds: 10e6 * 31536000, precision: 'century' },
  { quantity: 1, unit: 'M years', seconds: 1e6 * 31536000, precision: 'century' },
  { quantity: 10, unit: 'k years', seconds: 10000 * 31536000, precision: 'century' },
  { quantity: 1, unit: 'century', seconds: 100 * 31536000, precision: 'century' },
  { quantity: 1, unit: 'year', seconds: 31536000, precision: 'year' },
  { quantity: 1, unit: 'month', seconds: 31536000 / 12, precision: 'month' },
  { quantity: 1, unit: 'day', seconds: 86400, precision: 'day' },
  { quantity: 1, unit: 'hour', seconds: 3600, precision: 'hour' },
  { quantity: 1, unit: 'min', seconds: 60, precision: 'minute' },
  { quantity: 1, unit: 'sec', seconds: 1, precision: 'second' },
  { quantity: 1, unit: 'ms', seconds: 0.001, precision: 'second' },
  { quantity: 1, unit: 'μs', seconds: 0.000001, precision: 'second' },
  { quantity: 1, unit: 'ns', seconds: 0.000000001, precision: 'second' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Calculate years relative to now (negative for past, positive for future)
 */
const getYearsFromNow = (unixSeconds: number): number => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.floor((unixSeconds - nowSeconds) / 31536000);
};

/**
 * Format a Unix timestamp as a label based on the given precision and unit
 */
export const formatDateLabel = (unixSeconds: number, precision: string, unit?: string, quantity?: number): string => {
  const yearsFromNow = getYearsFromNow(unixSeconds);

  // Check specific units first, before falling back to precision-based formatting
  if (unit === 'B years') {
    const billionYearsFromNow = Math.round(yearsFromNow / 1e9);
    return `${billionYearsFromNow} By`;
  }

  if (unit === 'M years') {
    const millionYearsFromNow = Math.round(yearsFromNow / 1e6);
    return `${millionYearsFromNow} My`;
  }

  if (unit === 'k years') {
    const thousandYearsFromNow = Math.round(yearsFromNow / 1000);
    return `${thousandYearsFromNow} ky`;
  }

  const MAX_DATE_MS = 8.64e15;
  const dateMs = Math.max(-MAX_DATE_MS, Math.min(MAX_DATE_MS, unixSeconds * 1000));

  let date: Date | null = null;
  try {
    date = new Date(dateMs);
    if (isNaN(date.getTime())) date = null;
  } catch {
    date = null;
  }

  if (!date) {
    return Math.round(unixSeconds).toString();
  }

  if (precision === 'century' || unit === 'century') {
    return date.getUTCFullYear().toString();
  } else if (precision === 'year') {
    return date.getUTCFullYear().toString();
  } else if (precision === 'month') {
    return MONTH_NAMES[date.getUTCMonth()];
  } else if (precision === 'day') {
    return date.getUTCDate().toString().padStart(2, '0');
  } else if (precision === 'hour') {
    return date.getUTCHours().toString().padStart(2, '0') + 'h';
  } else if (precision === 'minute') {
    return date.getUTCHours().toString().padStart(2, '0') + ':' +
           date.getUTCMinutes().toString().padStart(2, '0');
  } else if (precision === 'second') {
    return date.getUTCHours().toString().padStart(2, '0') + ':' +
           date.getUTCMinutes().toString().padStart(2, '0') + ':' +
           date.getUTCSeconds().toString().padStart(2, '0');
  } else {
    return date.getUTCFullYear().toString();
  }
};

/**
 * Determine which time unit to display based on spacing
 */
export const selectDisplayUnit = (
  visibleRange: number,
  timelineHeight: number,
  minSpacingForUnit: number = 24
): { unit: typeof TIME_UNITS[0]; index: number } => {
  let unitToDisplay: typeof TIME_UNITS[0] | null = null;
  let unitIndexToDisplay = -1;

  for (let i = TIME_UNITS.length - 1; i >= 0; i--) {
    const unit = TIME_UNITS[i];
    const pixelsPerUnit = (unit.seconds / visibleRange) * timelineHeight;

    if (pixelsPerUnit >= minSpacingForUnit) {
      unitToDisplay = unit;
      unitIndexToDisplay = i;
      break;
    }
  }

  if (!unitToDisplay) {
    unitToDisplay = TIME_UNITS[0];
    unitIndexToDisplay = 0;
  }

  return { unit: unitToDisplay, index: unitIndexToDisplay };
};

/**
 * Generate tick positions for calendar-based units (year, month)
 */
export const generateCalendarTicks = (
  bottomSeconds: number,
  topSeconds: number,
  precision: string
): number[] => {
  const MAX_DATE_MS = 8.64e15;

  // Ensure bottom is actually less than top
  const minSeconds = Math.min(bottomSeconds, topSeconds);
  const maxSeconds = Math.max(bottomSeconds, topSeconds);

  const bottomMs = Math.max(-MAX_DATE_MS, Math.min(MAX_DATE_MS, minSeconds * 1000));
  const topMs = Math.max(-MAX_DATE_MS, Math.min(MAX_DATE_MS, maxSeconds * 1000));
  const ticksToRender: number[] = [];

  try {
    const bottomDate = new Date(bottomMs);
    const topDate = new Date(topMs);

    if (!isNaN(bottomDate.getTime()) && !isNaN(topDate.getTime())) {
      if (precision === 'year') {
        const bottomYear = bottomDate.getUTCFullYear();
        const topYear = topDate.getUTCFullYear();

        for (let year = bottomYear; year <= topYear; year++) {
          const tickDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
          const tickSeconds = tickDate.getTime() / 1000;
          ticksToRender.push(tickSeconds);
        }
      } else if (precision === 'century') {
        // For centuries, generate ticks for every 10 years
        const bottomYear = bottomDate.getUTCFullYear();
        const topYear = topDate.getUTCFullYear();

        // Start at nearest decade
        const startYear = Math.floor(bottomYear / 10) * 10;

        for (let year = startYear; year <= topYear; year += 10) {
          const tickDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
          const tickSeconds = tickDate.getTime() / 1000;
          ticksToRender.push(tickSeconds);
        }
      } else if (precision === 'month') {
        const bottomYear = bottomDate.getUTCFullYear();
        const bottomMonth = bottomDate.getUTCMonth();
        const topYear = topDate.getUTCFullYear();
        const topMonth = topDate.getUTCMonth();

        for (let year = bottomYear; year <= topYear; year++) {
          const startMonth = year === bottomYear ? bottomMonth : 0;
          const endMonth = year === topYear ? topMonth : 11;

          for (let month = startMonth; month <= endMonth; month++) {
            const tickDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
            const tickSeconds = tickDate.getTime() / 1000;
            ticksToRender.push(tickSeconds);
          }
        }
      }
    }
  } catch {
    // Fallback will be used in the calling function
  }

  return ticksToRender;
};

/**
 * Generate ticks for fixed-duration units
 */
export const generateFixedUnitTicks = (
  bottomSeconds: number,
  topSeconds: number,
  unitSeconds: number
): number[] => {
  const startUnit = Math.floor(bottomSeconds / unitSeconds);
  const endUnit = Math.ceil(topSeconds / unitSeconds);
  const ticks: number[] = [];

  for (let i = startUnit; i <= endUnit; i++) {
    ticks.push(i * unitSeconds);
  }

  return ticks;
};

/**
 * Format extremity labels (top/bottom of canvas)
 */
export const formatExtremityLabels = (
  topDate: Date | null,
  bottomDate: Date | null,
  visibleTopTime: number,
  visibleBottomTime: number,
  precision: string,
  unit?: string
): { topLabel: string; bottomLabel: string } => {
  let topLabel: string;
  let bottomLabel: string;

  if (topDate && bottomDate) {
    // For very large scales (B years, 100M years, etc), show as "x My" or "x By"
    if (unit === 'B years') {
      const topYearsFromNow = getYearsFromNow(visibleTopTime);
      const bottomYearsFromNow = getYearsFromNow(visibleBottomTime);
      topLabel = `${Math.round(topYearsFromNow / 1e9)} By`;
      bottomLabel = `${Math.round(bottomYearsFromNow / 1e9)} By`;
    } else if (unit === 'M years') {
      const topYearsFromNow = getYearsFromNow(visibleTopTime);
      const bottomYearsFromNow = getYearsFromNow(visibleBottomTime);
      topLabel = `${Math.round(topYearsFromNow / 1e6)} My`;
      bottomLabel = `${Math.round(bottomYearsFromNow / 1e6)} My`;
    } else if (unit === 'k years') {
      const topYearsFromNow = getYearsFromNow(visibleTopTime);
      const bottomYearsFromNow = getYearsFromNow(visibleBottomTime);
      topLabel = `${Math.round(topYearsFromNow / 1000)} ky`;
      bottomLabel = `${Math.round(bottomYearsFromNow / 1000)} ky`;
    } else if (precision === 'century' || precision === 'year') {
      topLabel = topDate.getUTCFullYear().toString();
      bottomLabel = bottomDate.getUTCFullYear().toString();
    } else if (precision === 'month') {
      const topMonth = MONTH_NAMES[topDate.getUTCMonth()];
      const topYear = topDate.getUTCFullYear();
      topLabel = `${topYear} ${topMonth}`;
      const bottomMonth = MONTH_NAMES[bottomDate.getUTCMonth()];
      const bottomYear = bottomDate.getUTCFullYear();
      bottomLabel = `${bottomYear} ${bottomMonth}`;
    } else if (precision === 'day') {
      const topMonth = MONTH_NAMES[topDate.getUTCMonth()];
      const topDay = topDate.getUTCDate();
      const topYear = topDate.getUTCFullYear();
      topLabel = `${topYear} ${topMonth} ${topDay}`;
      const bottomMonth = MONTH_NAMES[bottomDate.getUTCMonth()];
      const bottomDay = bottomDate.getUTCDate();
      const bottomYear = bottomDate.getUTCFullYear();
      bottomLabel = `${bottomYear} ${bottomMonth} ${bottomDay}`;
    } else if (precision === 'hour') {
      const topMonth = MONTH_NAMES[topDate.getUTCMonth()];
      const topDay = topDate.getUTCDate();
      const topYear = topDate.getUTCFullYear();
      const topHour = topDate.getUTCHours().toString().padStart(2, '0');
      topLabel = `${topYear} ${topMonth} ${topDay} ${topHour}h`;
      const bottomMonth = MONTH_NAMES[bottomDate.getUTCMonth()];
      const bottomDay = bottomDate.getUTCDate();
      const bottomYear = bottomDate.getUTCFullYear();
      const bottomHour = bottomDate.getUTCHours().toString().padStart(2, '0');
      bottomLabel = `${bottomYear} ${bottomMonth} ${bottomDay} ${bottomHour}h`;
    } else if (precision === 'minute') {
      const topMonth = MONTH_NAMES[topDate.getUTCMonth()];
      const topDay = topDate.getUTCDate();
      const topYear = topDate.getUTCFullYear();
      const topHour = topDate.getUTCHours().toString().padStart(2, '0');
      const topMin = topDate.getUTCMinutes().toString().padStart(2, '0');
      topLabel = `${topYear} ${topMonth} ${topDay} ${topHour}:${topMin}`;
      const bottomMonth = MONTH_NAMES[bottomDate.getUTCMonth()];
      const bottomDay = bottomDate.getUTCDate();
      const bottomYear = bottomDate.getUTCFullYear();
      const bottomHour = bottomDate.getUTCHours().toString().padStart(2, '0');
      const bottomMin = bottomDate.getUTCMinutes().toString().padStart(2, '0');
      bottomLabel = `${bottomYear} ${bottomMonth} ${bottomDay} ${bottomHour}:${bottomMin}`;
    } else {
      topLabel = topDate.toISOString().split('T')[1]?.split('Z')[0] || topDate.toISOString();
      bottomLabel = bottomDate.toISOString().split('T')[1]?.split('Z')[0] || bottomDate.toISOString();
    }
  } else {
    topLabel = visibleTopTime.toFixed(0);
    bottomLabel = visibleBottomTime.toFixed(0);
  }

  return { topLabel, bottomLabel };
};
