import assert from "node:assert/strict";
import test from "node:test";
import { experienceTrackingBounds, borderGlowPointer } from "../app/lib/motion-geometry.ts";

test("experience keeps the current tracking as its floor and fits the available height", () => {
  const input = { fontSize: 100, glyphCount: 10, extent: 620, currentSpacing: 1.5, availableExtent: 760 };
  const { min, max } = experienceTrackingBounds(input);
  assert.equal(min, 1.5);
  assert.equal(max, 15.5);
  for (const progress of [0, 0.25, 0.5, 1, 0.5, 0.25, 0]) {
    const spacing = min + (max - min) * progress;
    const extent = input.extent + (spacing - input.currentSpacing) * input.glyphCount;
    assert.ok(spacing >= min && spacing <= max);
    assert.ok(extent <= input.availableExtent);
  }
});

test("remeasuring expanded text does not accumulate tracking or change its bound", () => {
  const atMinimum = experienceTrackingBounds({ fontSize: 100, glyphCount: 10, extent: 620, currentSpacing: 1.5, availableExtent: 760 });
  const atMaximum = experienceTrackingBounds({ fontSize: 100, glyphCount: 10, extent: 760, currentSpacing: 15.5, availableExtent: 760 });
  assert.deepEqual(atMaximum, atMinimum);
});

test("narrow screens clamp tracking to their width and never go below the existing minimum", () => {
  const input = { fontSize: 55, glyphCount: 10, extent: 290, currentSpacing: 0.825, availableExtent: 300 };
  const { min, max } = experienceTrackingBounds(input);
  assert.ok(Math.abs(min - 0.825) < 1e-8);
  assert.ok(Math.abs(max - 1.825) < 1e-8);
  assert.equal(input.extent + (max - input.currentSpacing) * 10, 300);
  const constrained = experienceTrackingBounds({ ...input, availableExtent: 280 });
  assert.equal(constrained.max, constrained.min);
});

test("large sections retain a restrained maximum of 0.4em", () => {
  const bounds = experienceTrackingBounds({ fontSize: 100, glyphCount: 10, extent: 620, currentSpacing: 1.5, availableExtent: 3000 });
  assert.equal(bounds.max, 40);
});

test("border glow is quiet in the center and follows all four edges", () => {
  assert.deepEqual(borderGlowPointer(300, 80, 150, 40), { proximity: 0, angle: 0 });
  for (const [x, y, angle] of [[150, 0, 0], [300, 40, 90], [150, 80, 180], [0, 40, 270]]) {
    assert.deepEqual(borderGlowPointer(300, 80, x, y), { proximity: 100, angle });
  }
  assert.equal(borderGlowPointer(300, 80, 225, 40).proximity, 50);
  assert.equal(borderGlowPointer(300, 80, 900, 40).proximity, 100);
  assert.deepEqual(borderGlowPointer(0, 0, 0, 0), { proximity: 0, angle: 0 });
});
