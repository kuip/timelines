/**
 * Canvas interaction handlers (zoom, pan, mouse events)
 */

export type Transform = { y: number; k: number };

/**
 * Calculate Y position for a time value
 */
const calculateY = (
  timeSeconds: number,
  START_TIME: number,
  END_TIME: number,
  timelineHeight: number,
  transform: Transform
): number => {
  return ((END_TIME - timeSeconds) / (END_TIME - START_TIME)) * timelineHeight * transform.k + transform.y;
};

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
  const timelineHeight = dimensions.height;
  const midScreen = dimensions.height / 2;

  // Constraint 1: Big Bang should not go higher than middle of screen
  const bigBangY = calculateY(START_TIME, START_TIME, END_TIME, timelineHeight, newTransform);
  if (bigBangY < midScreen) {
    newTransform = {
      ...newTransform,
      y: midScreen - calculateY(START_TIME, START_TIME, END_TIME, timelineHeight, { y: 0, k: newTransform.k })
    };
  }

  // Constraint 2: Future Horizon should not go lower than middle of screen
  const horizonY = calculateY(FUTURE_HORIZON_TIME, START_TIME, END_TIME, timelineHeight, newTransform);
  if (horizonY > midScreen) {
    newTransform = {
      ...newTransform,
      y: midScreen - calculateY(FUTURE_HORIZON_TIME, START_TIME, END_TIME, timelineHeight, { y: 0, k: newTransform.k })
    };
  }

  return newTransform;
};

/**
 * Create wheel handler for zooming
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

    // Reduce zoom sensitivity by 1.5x (from 1.05/0.95 to 1.033/0.967)
    const delta = e.deltaY > 0 ? 1.033 : 0.967;
    // Limit max zoom to 1e9 to prevent floating point precision issues in visible events calculation
    const newK = Math.max(1, Math.min(1e9, transform.k * delta));

    const timelineHeight = dimensions.height;
    const oldWorldY = (transform.y - mouseY) / transform.k;

    let newTransform: Transform = {
      y: oldWorldY * newK + mouseY,
      k: newK
    };

    newTransform = constrainer(newTransform);
    setTransform(newTransform);
  };
};

/**
 * Create mouse down handler for panning
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
      let newTransform: Transform = { ...transform, y: startTransformY + deltaY };

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
