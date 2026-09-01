'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type PanInfo } from 'motion/react';
import { LiquidOrb } from './LiquidOrb';

interface DraggableOrbProps {
  className?: string;
  /** Extra excitement fed in from elsewhere on the page (e.g. the search field). */
  ambientExcitement?: number;
}

/** How far the orb can be pulled from centre, in px, before it stops following. */
const PULL_LIMIT = 130;

/**
 * The orb, but rubbery.
 *
 * Dragging pulls the orb off centre against a spring and stretches it along the
 * drag axis while squashing the perpendicular one — the classic squash-and-stretch
 * that makes a shape read as a blob of liquid rather than a picture of one.
 * Letting go snaps it home with a slight overshoot.
 *
 * The stretch is a CSS transform on the canvas wrapper, so it costs nothing on
 * the GPU side and works identically for the CSS fallback orb.
 */
export const DraggableOrb: React.FC<DraggableOrbProps> = ({
  className = '',
  ambientExcitement = 0,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [dragExcitement, setDragExcitement] = useState(0);
  const rafRef = useRef(0);

  // Springs trail the raw pointer offset, so the stretch keeps easing after the
  // pointer stops — that lag is what sells the "liquid" weight.
  const springConfig = { stiffness: 170, damping: 15, mass: 1.1 };
  const sx = useSpring(x, springConfig);
  const sy = useSpring(y, springConfig);

  // Squash and stretch: grow along the pull direction, thin out across it.
  const scaleX = useTransform([sx, sy], ([dx, dy]: number[]) =>
    1 + Math.abs(dx) / 620 - Math.abs(dy) / 1500,
  );
  const scaleY = useTransform([sx, sy], ([dx, dy]: number[]) =>
    1 + Math.abs(dy) / 620 - Math.abs(dx) / 1500,
  );
  // A little shear so diagonal pulls lean instead of just growing.
  const rotate = useTransform([sx, sy], ([dx, dy]: number[]) => (dx * dy) / 26000);

  const handleDrag = useCallback((_: PointerEvent, info: PanInfo) => {
    // Brighten the shader in proportion to how hard the orb is being pulled.
    const pull = Math.min(1, Math.hypot(info.offset.x, info.offset.y) / PULL_LIMIT);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setDragExcitement(pull));
  }, []);

  const handleDragEnd = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setDragging(false);
    setDragExcitement(0);
  }, []);

  return (
    <motion.div
      // h-full matters: the canvas sizes itself with h-full, so without a
      // definite height here it silently falls back to the default 2:1 canvas
      // ratio and the orb renders as a squashed band.
      className={`relative h-full w-full touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      style={{ x: sx, y: sy, scaleX, scaleY, rotate }}
      drag
      // Zero-size constraints mean the orb always springs back to centre.
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.55}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 190, bounceDamping: 14 }}
      onDragStart={() => setDragging(true)}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      <LiquidOrb excitement={Math.max(ambientExcitement, dragExcitement)} />
    </motion.div>
  );
};
