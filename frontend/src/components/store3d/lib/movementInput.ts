export interface MovementFlags {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turnLeft: boolean;
  turnRight: boolean;
}

export const movementInput: MovementFlags = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  turnLeft: false,
  turnRight: false,
};

export function setMovementFlag(key: keyof MovementFlags, value: boolean) {
  movementInput[key] = value;
}

export function resetMovementInput() {
  (Object.keys(movementInput) as (keyof MovementFlags)[]).forEach((k) => {
    movementInput[k] = false;
  });
}
