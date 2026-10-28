import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { PLAYER_START, EYE_HEIGHT } from "../../data/layout";
import { movementInput } from "../../lib/movementInput";
import { resolveCollision } from "../../lib/collision";
import { dragState } from "../../lib/dragState";

const MOVE_SPEED = 4.4;
const ACCEL_RATE = 10;
const KEY_ROTATE_SPEED = 1.6;
const MOUSE_SENSITIVITY = 0.0028;
const MAX_PITCH = 0.55;
const ROTATION_SMOOTH_RATE = 24;

const WHEEL_SENSITIVITY = 0.018;
const MAX_SCROLL_VELOCITY = 7;
const SCROLL_FRICTION_PER_SEC = 0.02;

export function PlayerController() {
  const { camera, gl } = useThree();
  const yaw = useRef(PLAYER_START.yaw);
  const pitch = useRef(PLAYER_START.pitch);
  const yawTarget = useRef(PLAYER_START.yaw);
  const pitchTarget = useRef(PLAYER_START.pitch);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const velocity = useRef({ x: 0, z: 0 });
  const scrollVelocity = useRef({ x: 0, z: 0 });

  useEffect(() => {
    camera.position.set(PLAYER_START.x, EYE_HEIGHT, PLAYER_START.z);
    camera.rotation.order = "YXZ";
  }, [camera]);

  useEffect(() => {
    const dom = gl.domElement;

    const stopDrag = () => {
      dragging.current = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      dragging.current = true;
      dragState.distance = 0;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      dragStart.current = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      dragState.distance = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
      yawTarget.current -= dx * MOUSE_SENSITIVITY;
      pitchTarget.current = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitchTarget.current - dy * MOUSE_SENSITIVITY));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      stopDrag();
    };
    // A touch drag can be cancelled by the browser (e.g. a system gesture) without a pointerup —
    // without this the camera kept rotating on the next move event (PR #12 review).
    const onPointerCancel = () => stopDrag();
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const forwardX = -Math.sin(yaw.current);
      const forwardZ = -Math.cos(yaw.current);
      const rightX = Math.cos(yaw.current);
      const rightZ = -Math.sin(yaw.current);

      const forwardAmount = e.deltaY * WHEEL_SENSITIVITY;
      const strafeAmount = e.deltaX * WHEEL_SENSITIVITY;

      const sv = scrollVelocity.current;
      sv.x += forwardX * forwardAmount + rightX * strafeAmount;
      sv.z += forwardZ * forwardAmount + rightZ * strafeAmount;

      const mag = Math.hypot(sv.x, sv.z);
      if (mag > MAX_SCROLL_VELOCITY) {
        sv.x = (sv.x / mag) * MAX_SCROLL_VELOCITY;
        sv.z = (sv.z / mag) * MAX_SCROLL_VELOCITY;
      }
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    dom.addEventListener("contextmenu", onContextMenu);
    dom.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      dom.removeEventListener("contextmenu", onContextMenu);
      dom.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);

    if (movementInput.turnLeft) yawTarget.current += KEY_ROTATE_SPEED * d;
    if (movementInput.turnRight) yawTarget.current -= KEY_ROTATE_SPEED * d;

    const rotLerp = 1 - Math.exp(-ROTATION_SMOOTH_RATE * d);
    yaw.current += (yawTarget.current - yaw.current) * rotLerp;
    pitch.current += (pitchTarget.current - pitch.current) * rotLerp;

    const forwardX = -Math.sin(yaw.current);
    const forwardZ = -Math.cos(yaw.current);
    const rightX = Math.cos(yaw.current);
    const rightZ = -Math.sin(yaw.current);

    let dirX = 0;
    let dirZ = 0;
    if (movementInput.forward) {
      dirX += forwardX;
      dirZ += forwardZ;
    }
    if (movementInput.backward) {
      dirX -= forwardX;
      dirZ -= forwardZ;
    }
    if (movementInput.right) {
      dirX += rightX;
      dirZ += rightZ;
    }
    if (movementInput.left) {
      dirX -= rightX;
      dirZ -= rightZ;
    }

    const dirLen = Math.hypot(dirX, dirZ);
    const targetX = dirLen > 0.0001 ? (dirX / dirLen) * MOVE_SPEED : 0;
    const targetZ = dirLen > 0.0001 ? (dirZ / dirLen) * MOVE_SPEED : 0;

    const accelLerp = 1 - Math.exp(-ACCEL_RATE * d);
    const v = velocity.current;
    v.x += (targetX - v.x) * accelLerp;
    v.z += (targetZ - v.z) * accelLerp;

    const sv = scrollVelocity.current;
    const frictionFactor = Math.pow(SCROLL_FRICTION_PER_SEC, d);
    sv.x *= frictionFactor;
    sv.z *= frictionFactor;
    if (Math.hypot(sv.x, sv.z) < 0.01) {
      sv.x = 0;
      sv.z = 0;
    }

    const dx = (v.x + sv.x) * d;
    const dz = (v.z + sv.z) * d;

    if (Math.abs(dx) > 1e-6 || Math.abs(dz) > 1e-6) {
      const next = resolveCollision(camera.position.x + dx, camera.position.z + dz);
      camera.position.x = next.x;
      camera.position.z = next.z;
    }

    camera.position.y = EYE_HEIGHT;
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0;
  });

  return null;
}
