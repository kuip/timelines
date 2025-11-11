/**
 * Canvas drawing utilities for timeline visualization
 */

export const CATEGORY_COLORS: Record<string, string> = {
  cosmic: '#8b5cf6',      // purple
  geological: '#f59e0b',  // amber
  biological: '#10b981',  // emerald
  historical: '#ef4444',  // red
  political: '#3b82f6',   // blue
  technological: '#06b6d4', // cyan
  contemporary: '#ec4899', // pink
};

/**
 * Draw the main timeline line
 */
export const drawTimelineLine = (
  ctx: CanvasRenderingContext2D,
  timelineX: number,
  dimensions: { width: number; height: number }
) => {
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(timelineX, 0);
  ctx.lineTo(timelineX, dimensions.height);
  ctx.stroke();
};

/**
 * Draw the "Now" marker (dashed line + time display box)
 */
export const drawNowMarker = (
  ctx: CanvasRenderingContext2D,
  nowY: number,
  timelineX: number,
  dimensions: { width: number; height: number }
) => {
  // Draw dashed line on right side only (50% gray)
  ctx.strokeStyle = 'rgba(155, 160, 163, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(timelineX, nowY);
  ctx.lineTo(dimensions.width, nowY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw time display box (same dimensions as event images)
  const now = new Date();
  const year = now.getUTCFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[now.getUTCMonth()];
  const day = now.getUTCDate().toString().padStart(2, '0');
  const hours = now.getUTCHours().toString().padStart(2, '0');
  const minutes = now.getUTCMinutes().toString().padStart(2, '0');
  const seconds = now.getUTCSeconds().toString().padStart(2, '0');

  const timeStr = `Now: ${hours}:${minutes}:${seconds}`;
  const dateStr = `${year} ${month} ${day}`;

  const DISPLAY_SIZE = 100;
  const boxX = timelineX + 7;
  const boxY = nowY - DISPLAY_SIZE / 2;

  // Background box
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(boxX, boxY, DISPLAY_SIZE, DISPLAY_SIZE);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX, boxY, DISPLAY_SIZE, DISPLAY_SIZE);

  // Time and date text (centered, as large as fitting)
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 14px "Roboto Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(timeStr, boxX + DISPLAY_SIZE / 2, boxY + DISPLAY_SIZE / 2 - 10);
  ctx.fillText(dateStr, boxX + DISPLAY_SIZE / 2, boxY + DISPLAY_SIZE / 2 + 10);
};

/**
 * Draw semi-transparent overlay for the future (from "Now" onwards)
 */
export const drawFutureOverlay = (
  ctx: CanvasRenderingContext2D,
  nowY: number,
  dimensions: { width: number; height: number }
) => {
  if (nowY > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, dimensions.width, nowY);
  }
};

/**
 * Draw tick marks on the timeline
 */
export const drawTick = (
  ctx: CanvasRenderingContext2D,
  y: number,
  timelineX: number
) => {
  ctx.strokeStyle = 'rgba(209, 213, 219, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(timelineX - 5, y);
  ctx.lineTo(timelineX + 5, y);
  ctx.stroke();
};

/**
 * Draw a tick label
 */
export const drawTickLabel = (
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number
) => {
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px "Roboto Condensed", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
};

/**
 * Draw extremity labels (at top and bottom of canvas)
 */
export const drawExtremityLabels = (
  ctx: CanvasRenderingContext2D,
  topLabel: string,
  bottomLabel: string,
  dimensions: { width: number; height: number }
) => {
  // Ensure full opacity for extremity labels
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 16px "Roboto Condensed", sans-serif';
  ctx.textAlign = 'right';

  // Top label
  ctx.textBaseline = 'top';
  ctx.fillText(topLabel, dimensions.width - 5, 2);

  // Bottom label
  ctx.textBaseline = 'bottom';
  ctx.fillText(bottomLabel, dimensions.width - 5, dimensions.height - 2);
};

/**
 * Draw an event marker (circle)
 */
export const drawEventMarker = (
  ctx: CanvasRenderingContext2D,
  y: number,
  timelineX: number,
  color: string
) => {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(timelineX, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

/**
 * Draw relationship arc linking two events
 */
export const drawRelationshipArc = (
  ctx: CanvasRenderingContext2D,
  startY: number,
  endY: number,
  timelineX: number,
  color: string,
  dimensions: { width: number; height: number },
  timeRangeSeconds?: number,
  visibleTimeRangeSeconds?: number,
  relationshipIndex?: number
) => {
  // Arc extends left: 30px for first relationship, +3px for each additional
  const HORIZON_TIME = 4.404e26; // Big Bang (13.8 billion years in seconds)

  const index = relationshipIndex || 0;
  let horizontalDistance = 30 + (index * 3); // 30px, 33px, 36px, etc.

  // Maximum distance is constrained to stay within canvas (leaving 20px margin)
  const maxDistance = timelineX - 20;
  horizontalDistance = Math.min(horizontalDistance, maxDistance);

  // Use white for the all-time arc, otherwise use provided color
  const isAllTimeArc = timeRangeSeconds && timeRangeSeconds >= HORIZON_TIME * 0.95;
  const arcColor = isAllTimeArc ? '#ffffff' : color;

  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;

  const radius = 20; // 20px radius for rounded corners
  const endX = timelineX - horizontalDistance;

  ctx.beginPath();

  // Start from top event on timeline
  ctx.moveTo(timelineX, startY);

  // Horizontal line straight left to just before corner
  ctx.lineTo(endX + radius, startY);

  // Top-left rounded corner - quadratic curve
  // Control point is at the corner, creating equal pull inward on both axes
  ctx.quadraticCurveTo(endX, startY, endX, startY + radius);

  // Vertical line down to bottom corner
  ctx.lineTo(endX, endY - radius);

  // Bottom-left rounded corner - quadratic curve
  // Control point is at the corner, end curves to horizontal line
  ctx.quadraticCurveTo(endX, endY, endX + radius, endY);

  // Horizontal line back to timeline
  ctx.lineTo(timelineX, endY);

  ctx.stroke();
  ctx.globalAlpha = 1;
};

/**
 * Draw an event image
 */
export const drawEventImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  y: number,
  timelineX: number,
  displaySize: number
) => {
  const imgX = timelineX + 7;
  const imgY = y - displaySize / 2;
  const padding = 2;

  // Draw background rectangle
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(imgX, imgY, displaySize, displaySize);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.strokeRect(imgX, imgY, displaySize, displaySize);

  // Draw image
  try {
    const drawX = imgX + padding;
    const drawY = imgY + padding;
    const drawWidth = displaySize - padding * 2;
    const drawHeight = displaySize - padding * 2;
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  } catch (e) {
    // Image not ready yet
  }
};
