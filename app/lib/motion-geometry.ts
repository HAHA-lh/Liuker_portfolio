export function experienceTrackingBounds({
  fontSize, glyphCount, extent, currentSpacing, availableExtent,
}: {
  fontSize: number;
  glyphCount: number;
  extent: number;
  currentSpacing: number;
  availableExtent: number;
}) {
  const count = Math.max(1, glyphCount);
  const min = fontSize * 0.015;
  const untrackedExtent = Math.max(0, extent - currentSpacing * count);
  const fittingSpacing = (availableExtent - untrackedExtent) / count;
  return { min, max: Math.max(min, Math.min(fontSize * 0.4, fittingSpacing)) };
}

// React Bits' center-to-edge proximity and clockwise cursor angle.
export function borderGlowPointer(width: number, height: number, x: number, y: number) {
  if (width <= 0 || height <= 0) return { proximity: 0, angle: 0 };
  const dx = x - width / 2;
  const dy = y - height / 2;
  const proximity = Math.min(1, Math.max(Math.abs(dx) / (width / 2), Math.abs(dy) / (height / 2))) * 100;
  const angle = dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360;
  return { proximity, angle };
}
