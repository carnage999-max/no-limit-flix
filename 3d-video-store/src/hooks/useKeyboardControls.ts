import { useEffect } from "react";
import { movementInput, resetMovementInput } from "../lib/movementInput";

const KEY_MAP: Record<string, keyof typeof movementInput> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyQ: "turnLeft",
  KeyE: "turnRight",
};

export function useKeyboardControls() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const flag = KEY_MAP[e.code];
      if (flag) {
        movementInput[flag] = true;
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const flag = KEY_MAP[e.code];
      if (flag) {
        movementInput[flag] = false;
        e.preventDefault();
      }
    };
    const handleBlur = () => resetMovementInput();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      resetMovementInput();
    };
  }, []);
}
