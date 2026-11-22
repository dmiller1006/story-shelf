import { expect, it } from 'vitest';
import { GAMEPAD_BUTTONS, keyToAction } from '../src/input';

it('maps page-turner keys', () => {
  for (const key of ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']) expect(keyToAction(key)).toBe('next');
  for (const key of ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']) expect(keyToAction(key)).toBe('prev');
  expect(keyToAction('a')).toBeNull();
  expect(keyToAction('Escape')).toBeNull();
});

it('maps Xbox controller buttons', () => {
  expect(GAMEPAD_BUTTONS[0]).toBe('next'); // A
  expect(GAMEPAD_BUTTONS[1]).toBe('prev'); // B
  expect(GAMEPAD_BUTTONS[5]).toBe('next'); // RB
  expect(GAMEPAD_BUTTONS[4]).toBe('prev'); // LB
  expect(GAMEPAD_BUTTONS[15]).toBe('next'); // D-pad right
  expect(GAMEPAD_BUTTONS[14]).toBe('prev'); // D-pad left
});
