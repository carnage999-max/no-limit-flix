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

// A modifier held down (Cmd/Ctrl/Alt) means this is a browser shortcut (Cmd+D to bookmark,
// Ctrl+S to save, …), not a movement key, and typing in a field should never move the camera.
// Without this guard every one of WASD/arrows/Q/E ate its browser shortcut (PR #12 review).
const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

export function useKeyboardControls() {
  useEffect(() => {
    const isMovementKeyEvent = (e: KeyboardEvent) =>
      !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target);

    const handleKeyDown = (e: KeyboardEvent) => {
      // A modifier pressed while a movement key is already held (e.g. holding D, then adding
      // Cmd) never gets a key-up for that key on some platforms — drop everything rather than
      // risk a flag stuck on.
      if (e.ctrlKey || e.metaKey || e.altKey) {
        resetMovementInput();
        return;
      }
      const flag = KEY_MAP[e.code];
      if (flag && isMovementKeyEvent(e)) {
        movementInput[flag] = true;
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const flag = KEY_MAP[e.code];
      if (flag) {
        // Always clear on key-up, even if a modifier is now held — otherwise a flag set while
        // the key was pressed alone can get stuck on if a modifier is added before release.
        movementInput[flag] = false;
      }
      if (flag && isMovementKeyEvent(e)) {
        e.preventDefault();
      }
    };
    const handleBlur = () => resetMovementInput();
    const handleVisibility = () => {
      if (document.hidden) resetMovementInput();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      resetMovementInput();
    };
  }, []);
}
