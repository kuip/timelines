/**
 * Canvas drawing utilities for timeline visualization
 */

import { getCategoryColor } from './categoryColors';

// Re-export for backward compatibility
export { getCategoryColor };

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
 * Draw the "Now" marker (dashed line only - text is rendered as SVG overlay)
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
 * Draw the "Future Horizon" marker (dashed line only - text is rendered in EventPanel card)
 */
export const drawFutureHorizonMarker = (
  ctx: CanvasRenderingContext2D,
  futureY: number,
  timelineX: number,
  dimensions: { width: number; height: number }
) => {
  // Draw dashed line on right side only (50% gray)
  ctx.strokeStyle = 'rgba(155, 160, 163, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(timelineX, futureY);
  ctx.lineTo(dimensions.width, futureY);
  ctx.stroke();
  ctx.setLineDash([]);
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
 * Draw a tick label (supports multi-line labels with \n separator)
 */
export const drawTickLabel = (
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number
) => {
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 13px "Roboto Condensed", sans-serif'; // 1.3x bigger (10px * 1.3 = 13px)
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const lines = label.split('\n');
  const lineHeight = 15.6; // ~1.2x font size for spacing (13px * 1.2)

  // Position 3px to the left
  const adjustedX = x - 3;

  if (lines.length === 1) {
    // Single line - draw at y position
    ctx.fillText(lines[0], adjustedX, y);
  } else {
    // Multi-line - center vertically around y position
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = y - totalHeight / 2;

    lines.forEach((line, index) => {
      ctx.fillText(line, adjustedX, startY + index * lineHeight);
    });
  }
};

/**
 * Draw extremity labels (at top and bottom of canvas, supports multi-line with \n)
 */
export const drawExtremityLabels = (
  ctx: CanvasRenderingContext2D,
  topLabel: string,
  bottomLabel: string,
  dimensions: { width: number; height: number },
  isDark: boolean = true
) => {
  // Ensure full opacity for extremity labels
  ctx.globalAlpha = 1;
  // Use dark text for light mode, light text for dark mode
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(31, 41, 55, 0.9)';
  ctx.font = 'bold 16px "Roboto Condensed", sans-serif';
  ctx.textAlign = 'right';

  const lineHeight = 18; // ~1.125x font size (16px * 1.125)

  // Top label
  ctx.textBaseline = 'top';
  const topLines = topLabel.split('\n');
  topLines.forEach((line, index) => {
    ctx.fillText(line, dimensions.width - 5, 2 + index * lineHeight);
  });

  // Bottom label
  ctx.textBaseline = 'bottom';
  const bottomLines = bottomLabel.split('\n');
  bottomLines.forEach((line, index) => {
    ctx.fillText(line, dimensions.width - 5, dimensions.height - 2 - (bottomLines.length - 1 - index) * lineHeight);
  });
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
  displaySize: number,
  padding: number = 2
) => {
  const imgX = timelineX + 7;
  const imgY = y - displaySize / 2;

  // Draw background rectangle
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(imgX, imgY, displaySize, displaySize);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.strokeRect(imgX, imgY, displaySize, displaySize);

  // Draw image with aspect ratio preservation
  try {
    const availableSize = displaySize - padding * 2;
    const imgAspectRatio = img.width / img.height;
    const squareAspectRatio = 1; // Square container

    let drawWidth: number;
    let drawHeight: number;

    if (imgAspectRatio > squareAspectRatio) {
      // Image is wider than tall - fit to width
      drawWidth = availableSize;
      drawHeight = availableSize / imgAspectRatio;
    } else {
      // Image is taller than wide - fit to height
      drawHeight = availableSize;
      drawWidth = availableSize * imgAspectRatio;
    }

    // Center the image within the available space
    const drawX = imgX + padding + (availableSize - drawWidth) / 2;
    const drawY = imgY + padding + (availableSize - drawHeight) / 2;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  } catch (e) {
    // Image not ready yet
  }
};
