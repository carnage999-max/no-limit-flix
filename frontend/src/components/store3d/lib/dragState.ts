export const dragState = {
  distance: 0,
};

export const CLICK_DRAG_THRESHOLD = 6;

export function isClick(): boolean {
  return dragState.distance <= CLICK_DRAG_THRESHOLD;
}
