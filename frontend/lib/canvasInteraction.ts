/**
 * Canvas interaction handlers (zoom, pan, mouse events)
 *
 * New coordinate system:
 * - y: Unix timestamp at center of screen
 * - k: Seconds per pixel (zoom factor)
 */

export type Transform = { y: number; k: number };

/**
 * Constrain transform to keep Big Bang at or below middle of screen
 * and Future Horizon at or above middle of screen
 */
export const constrainTransform = (
  newTransform: Transform,
  dimensions: { width: number; height: number },
  START_TIME: number,
  END_TIME: number,
  FUTURE_HORIZON_TIME: number
): Transform => {
  // Constraint: Keep center timestamp within reasonable bounds
  // Allow panning from Big Bang to Future Horizon
  const constrainedY = Math.max(START_TIME, Math.min(FUTURE_HORIZON_TIME, newTransform.y));

  // Constrain zoom: from 1 second per pixel to 1e18 seconds per pixel (allows viewing entire timeline)
  const constrainedK = Math.max(1, Math.min(1e18, newTransform.k));

  return {
    y: constrainedY,
    k: constrainedK
  };
};

/**
 * Create wheel handler for zooming
 * Zooms around the timestamp at the mouse cursor position
 */
export const createWheelHandler = (
  transform: Transform,
  dimensions: { width: number; height: number },
  setTransform: (t: Transform) => void,
  constrainer: (t: Transform) => Transform
) => {
  return (e: WheelEvent) => {
    e.preventDefault();

    const canvas = (e.target as HTMLCanvasElement);
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    // Calculate the timestamp at the mouse position
    const centerY = dimensions.height / 2;
    const pixelOffset = mouseY - centerY;
    const timestampAtMouse = transform.y + (pixelOffset * transform.k);

    // Zoom factor: scroll down = zoom out (increase k), scroll up = zoom in (decrease k)
    const delta = e.deltaY > 0 ? 1.033 : 0.967;
    const newK = transform.k * delta;

    // Keep the same timestamp at the mouse position after zoom
    const newCenterTimestamp = timestampAtMouse - (pixelOffset * newK);

    let newTransform: Transform = {
      y: newCenterTimestamp,
      k: newK
    };

    newTransform = constrainer(newTransform);
    setTransform(newTransform);
  };
};

/**
 * Create mouse down handler for panning
 * Panning changes the center timestamp
 */
export const createMouseDownHandler = (
  transform: Transform,
  setTransform: (t: Transform) => void,
  constrainer: (t: Transform) => Transform
) => {
  return (e: MouseEvent) => {
    let startY = e.clientY;
    let startTransformY = transform.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      // Convert pixel movement to timestamp change
      const timestampDelta = -deltaY * transform.k; // Negative because dragging down should show earlier times

      let newTransform: Transform = {
        ...transform,
        y: startTransformY + timestampDelta
      };

      newTransform = constrainer(newTransform);
      setTransform(newTransform);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
};
