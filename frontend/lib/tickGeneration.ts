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
 * Format a year as BC/AD notation
 * BC notation applies from ancient times (~8500 BC) to year 0
 * Modern era (year 1 onwards) shows just the year without "AD"
 */
const formatYearAsBC = (year: number): string => {
  if (year < 0) {
    // BC format: JavaScript negative year = (BC year + 1)
    const bcYear = Math.abs(year) - 1;
    return `${bcYear} BC`;
  } else if (year === 0) {
    return '1 BC'; // Year 0 doesn't exist in BC/AD system
  } else {
    // For our era (year 1 onwards), just show the year without "AD"
    return `${year}`;
  }
};

/**
 * Format a Unix timestamp as a tick label (for timeline ticks, not extremity labels)
 */
export const formatDateLabel = (unixSeconds: number, precision: string, unit?: string, quantity?: number): string => {
  // For extreme zoom where unit='k years', treat as Ky label
  if (unit === 'k years') {
    const yearsFromNow = getYearsFromNow(unixSeconds);
    const ky = yearsFromNow / 1000;
    const formatted = Math.abs(ky % 1) > 0.01 ? ky.toFixed(1) : Math.round(ky).toString();
    return `${formatted} Ky`;
  }

  const yearsFromNow = getYearsFromNow(unixSeconds);

  // Check specific units first, before falling back to precision-based formatting
  if (unit === 'B years') {
    const billionYearsFromNow = yearsFromNow / 1e9;
    // Show one decimal place if it's a fractional value
    const formatted = Math.abs(billionYearsFromNow % 1) > 0.01 ? billionYearsFromNow.toFixed(1) : Math.round(billionYearsFromNow).toString();
    return `${formatted} By`;
  }

  if (unit === 'M years') {
    const millionYearsFromNow = yearsFromNow / 1e6;
    // Show one decimal place if it's a fractional value
    const formatted = Math.abs(millionYearsFromNow % 1) > 0.01 ? millionYearsFromNow.toFixed(1) : Math.round(millionYearsFromNow).toString();
    return `${formatted} My`;
  }

  if (unit === 'k years') {
    const thousandYearsFromNow = yearsFromNow / 1000;
    // Show one decimal place if it's a fractional value
    const formatted = Math.abs(thousandYearsFromNow % 1) > 0.01 ? thousandYearsFromNow.toFixed(1) : Math.round(thousandYearsFromNow).toString();
    return `${formatted} Ky`;
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
    return formatYearAsBC(date.getUTCFullYear());
  } else if (precision === 'year') {
    return formatYearAsBC(date.getUTCFullYear());
  } else if (precision === 'month') {
    const month = MONTH_NAMES[date.getUTCMonth()];
    // Only show year for January - all on single line
    if (month === 'Jan') {
      const year = date.getUTCFullYear();
      return `${formatYearAsBC(year)} ${month}`;
    }
    return month;
  } else if (precision === 'day') {
    const month = MONTH_NAMES[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    // All on single line: show month and day for the 1st, otherwise just day
    if (date.getUTCDate() === 1) {
      return `${month} ${day}`;
    }
    return `${day}`;
  } else if (precision === 'hour') {
    const hour = date.getUTCHours().toString().padStart(2, '0');
    // Show only hour normally, but show day and 00h at midnight
    if (hour === '00') {
      const day = date.getUTCDate().toString().padStart(2, '0');
      return `${day} ${hour}h`;
    }
    return `${hour}h`;
  } else if (precision === 'minute') {
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const min = date.getUTCMinutes().toString().padStart(2, '0');
    // For every-minute ticks (quantity=1): Show only minute normally, but show hour and 00m at the top of the hour
    // For every-5-minute ticks (quantity=5): Show minute value normally, hour + minute at the top of the hour
    if (min === '00') {
      return `${hour} ${min}m`;
    }
    return `${min}m`;
  } else if (precision === 'second') {
    const year = date.getUTCFullYear();
    const month = MONTH_NAMES[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const min = date.getUTCMinutes().toString().padStart(2, '0');
    const sec = date.getUTCSeconds().toString().padStart(2, '0');
    return `${formatYearAsBC(year)} ${month} ${day} ${hour}:${min}:${sec}`;
  } else {
    return formatYearAsBC(date.getUTCFullYear());
  }
};

/**
 * Format a Unix timestamp for extremity labels (top/bottom of canvas)
 * Always shows year, month, day on a single line
 */
export const formatExtremityDateLabel = (unixSeconds: number, precision: string, unit?: string): string => {
  const yearsFromNow = getYearsFromNow(unixSeconds);

  // Check specific units first
  if (unit === 'B years') {
    const billionYearsFromNow = yearsFromNow / 1e9;
    // Show one decimal place if it's a fractional value
    const formatted = Math.abs(billionYearsFromNow % 1) > 0.01 ? billionYearsFromNow.toFixed(1) : Math.round(billionYearsFromNow).toString();
    return `${formatted} By`;
  }

  if (unit === 'M years') {
    const millionYearsFromNow = yearsFromNow / 1e6;
    // Show one decimal place if it's a fractional value
    const formatted = Math.abs(millionYearsFromNow % 1) > 0.01 ? millionYearsFromNow.toFixed(1) : Math.round(millionYearsFromNow).toString();
    return `${formatted} My`;
  }

  if (unit === 'k years') {
    const thousandYearsFromNow = yearsFromNow / 1000;
    // Show one decimal place if it's a fractional value
    const formatted = Math.abs(thousandYearsFromNow % 1) > 0.01 ? thousandYearsFromNow.toFixed(1) : Math.round(thousandYearsFromNow).toString();
    return `${formatted} Ky`;
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
    return formatYearAsBC(date.getUTCFullYear());
  } else if (precision === 'year') {
    return formatYearAsBC(date.getUTCFullYear());
  } else if (precision === 'month') {
    const month = MONTH_NAMES[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${formatYearAsBC(year)} ${month}`;
  } else if (precision === 'day') {
    const year = date.getUTCFullYear();
    const month = MONTH_NAMES[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${formatYearAsBC(year)} ${month} ${day}`;
  } else if (precision === 'hour') {
    // For extremity labels, always show full date with year, month, day
    const year = date.getUTCFullYear();
    const month = MONTH_NAMES[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${formatYearAsBC(year)} ${month} ${day}`;
  } else if (precision === 'minute') {
    // For extremity labels, show full date with year, month, day, hour, and minute
    const year = date.getUTCFullYear();
    const month = MONTH_NAMES[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const min = date.getUTCMinutes().toString().padStart(2, '0');
    return `${formatYearAsBC(year)} ${month} ${day} ${hour}:${min}`;
  } else if (precision === 'second') {
    const year = date.getUTCFullYear();
    const month = MONTH_NAMES[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const min = date.getUTCMinutes().toString().padStart(2, '0');
    const sec = date.getUTCSeconds().toString().padStart(2, '0');
    return `${formatYearAsBC(year)} ${month} ${day} ${hour}:${min}:${sec}`;
  } else {
    return formatYearAsBC(date.getUTCFullYear());
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

  // Iterate from largest to smallest units and pick the first one with adequate spacing
  for (let i = 0; i < TIME_UNITS.length; i++) {
    const unit = TIME_UNITS[i];
    const pixelsPerUnit = (unit.seconds / visibleRange) * timelineHeight;

    if (pixelsPerUnit >= minSpacingForUnit) {
      unitToDisplay = unit;
      unitIndexToDisplay = i;
      break;
    }
  }

  // If no unit meets the minimum spacing, use the smallest unit
  if (!unitToDisplay) {
    unitToDisplay = TIME_UNITS[TIME_UNITS.length - 1];
    unitIndexToDisplay = TIME_UNITS.length - 1;
  }

  return { unit: unitToDisplay, index: unitIndexToDisplay };
};

/**
 * Generate tick positions for calendar-based units (year, month)
 */
export const generateCalendarTicks = (
  bottomSeconds: number,
  topSeconds: number,
  precision: string,
  timelineHeight: number = 0,
  minPixelSpacing: number = 20
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
        const visibleRange = maxSeconds - minSeconds;

        // Calculate year interval based on available space
        let yearInterval = 1;
        if (timelineHeight > 0) {
          const pixelsPerYear = (31536000 / visibleRange) * timelineHeight;
          if (pixelsPerYear < minPixelSpacing) {
            // If pixels per year is less than min spacing, increase interval
            yearInterval = Math.ceil(minPixelSpacing / pixelsPerYear);
          }
        }

        // Start at a multiple of yearInterval
        const startYear = Math.floor(bottomYear / yearInterval) * yearInterval;

        for (let year = startYear; year <= topYear; year += yearInterval) {
          const tickDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
          const tickSeconds = tickDate.getTime() / 1000;
          ticksToRender.push(tickSeconds);
        }
      } else if (precision === 'century') {
        // For centuries, calculate appropriate year interval based on spacing
        const bottomYear = bottomDate.getUTCFullYear();
        const topYear = topDate.getUTCFullYear();
        const visibleRange = maxSeconds - minSeconds;

        // Start with 10-year intervals
        let yearInterval = 10;

        if (timelineHeight > 0) {
          // Calculate pixels per 10-year interval
          const pixesPer10Years = (10 * 31536000 / visibleRange) * timelineHeight;

          // Ensure minimum pixel spacing between ticks (use minPixelSpacing parameter)
          const minSpacing = Math.max(minPixelSpacing, 20);
          if (pixesPer10Years < minSpacing) {
            yearInterval = Math.ceil(minSpacing / pixesPer10Years) * 10;
          }
        }

        // Start at nearest interval
        const startYear = Math.floor(bottomYear / yearInterval) * yearInterval;

        for (let year = startYear; year <= topYear; year += yearInterval) {
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
  unitSeconds: number,
  timelineHeight: number = 0,
  minPixelSpacing: number = 20
): number[] => {
  let actualUnitSeconds = unitSeconds;
  let subdivisions = 1; // 1 means no subdivisions (whole units)

  // If we have timeline height info, calculate if we need a multiplier or subdivisions
  // Exception: if unitSeconds is 10000 * 31536000 (1 Ky), 100 * 31536000 (century), 31536000 (year), 31536000/12 (month), 86400 (day), or 3600 (hour), never apply multiplier
  const isOneKyUnit = Math.abs(unitSeconds - (10000 * 31536000)) < 1;
  const isCenturyUnit = Math.abs(unitSeconds - (100 * 31536000)) < 1;
  const isYearUnit = Math.abs(unitSeconds - 31536000) < 1;
  const isMonthUnit = Math.abs(unitSeconds - (31536000 / 12)) < 1;
  const isDayUnit = Math.abs(unitSeconds - 86400) < 1;
  const isHourUnit = Math.abs(unitSeconds - 3600) < 1;
  const isMagicUnit = isOneKyUnit || isCenturyUnit || isYearUnit || isMonthUnit || isDayUnit || isHourUnit;

  if (timelineHeight > 0) {
    const visibleRange = topSeconds - bottomSeconds;
    const pixelsPerUnit = (unitSeconds / visibleRange) * timelineHeight;

    // Always ensure minimum visual spacing between ticks
    // This prevents visual clutter at extreme zoom levels
    // Exception: Don't enforce this for special units (1 Ky, century) that use calendar generation
    const MIN_VISUAL_SPACING = Math.max(20, minPixelSpacing);

    if (!isMagicUnit && pixelsPerUnit < MIN_VISUAL_SPACING) {
      // If spacing is less than minimum, increase the unit multiplier
      const multiplier = Math.ceil(MIN_VISUAL_SPACING / pixelsPerUnit);
      actualUnitSeconds = unitSeconds * multiplier;
    } else if (!isMagicUnit && pixelsPerUnit > minPixelSpacing * 3 && minPixelSpacing >= 1) {
      // If spacing is much larger than needed, use subdivisions (0.5, 0.25, etc)
      const pixelsPerSubdivision = pixelsPerUnit / 2;
      if (pixelsPerSubdivision >= minPixelSpacing * 0.5) {
        subdivisions = 2; // Show 0.5 subdivisions
      }
    }
  }

  const ticks: number[] = [];

  if (subdivisions === 1) {
    // No subdivisions - whole units only
    const startUnit = Math.floor(bottomSeconds / actualUnitSeconds);
    const endUnit = Math.ceil(topSeconds / actualUnitSeconds);
    for (let i = startUnit; i <= endUnit; i++) {
      ticks.push(i * actualUnitSeconds);
    }
  } else {
    // With subdivisions
    const subdivisionSeconds = actualUnitSeconds / subdivisions;
    const startUnit = Math.floor(bottomSeconds / subdivisionSeconds);
    const endUnit = Math.ceil(topSeconds / subdivisionSeconds);
    for (let i = startUnit; i <= endUnit; i++) {
      ticks.push(i * subdivisionSeconds);
    }
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
