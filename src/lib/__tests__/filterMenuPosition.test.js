import { describe, expect, it } from 'vitest';
import { positionFilterMenu } from '../filterMenuPosition';

const container = {
  left: 100,
  right: 900,
  top: 80,
  bottom: 580,
  width: 800,
  height: 500,
};
const menu = { width: 300, height: 240 };

function anchor(left, top) {
  return { left, right: left + 20, top, bottom: top + 20 };
}

describe('filter menu position', () => {
  it('opens at the icon when there is room below and to the right', () => {
    expect(positionFilterMenu(anchor(300, 150), container, menu)).toEqual({
      left: 200,
      top: 96,
      width: 300,
      maxHeight: 388,
    });
  });

  it('opens inward at the last column and above a low icon', () => {
    expect(positionFilterMenu(anchor(840, 500), container, menu)).toEqual({
      left: 460,
      top: 174,
      width: 300,
      maxHeight: 398,
    });
  });

  it('shrinks within a narrow dialog', () => {
    const narrow = { ...container, right: 380, width: 280 };
    const position = positionFilterMenu(anchor(350, 300), narrow, menu);
    expect(position.left).toBe(16);
    expect(position.width).toBe(248);
    expect(position.top).toBeGreaterThanOrEqual(16);
    expect(position.top + position.maxHeight).toBeLessThanOrEqual(
      narrow.height - 16,
    );
  });
});
