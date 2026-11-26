import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoldActionButton } from '@/features/attendance/components/hold-action-button';

describe('HoldActionButton (2.5s Hold to Check In / Check Out)', () => {
  let now = 0;
  let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = [];
  let nextRafId = 1;

  beforeEach(() => {
    now = 1000;
    rafCallbacks = [];
    nextRafId = 1;

    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = nextRafId++;
      rafCallbacks.push({ id, cb });
      return id;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafCallbacks = rafCallbacks.filter((item) => item.id !== id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function advanceFrame(deltaMs: number) {
    now += deltaMs;
    const pending = [...rafCallbacks];
    rafCallbacks = [];
    for (const item of pending) {
      item.cb(now);
    }
  }

  it('does NOT trigger onComplete if released before 2.5 seconds and shows hold hint', () => {
    const onComplete = vi.fn();
    render(
      <HoldActionButton
        variant="check-in"
        label="Hold to Check In"
        loadingLabel="Checking in..."
        durationMs={2500}
        onComplete={onComplete}
      />,
    );

    const button = screen.getByRole('button', { name: /Hold to Check In/i });

    act(() => {
      fireEvent.pointerDown(button, { pointerType: 'mouse', button: 0 });
      advanceFrame(1200);
      fireEvent.pointerUp(button);
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText(/Keep holding for 2\.5s to confirm/i)).toBeInTheDocument();
  });

  it('triggers onComplete exactly once after holding for 2.5 seconds (Check In)', () => {
    const onComplete = vi.fn();
    render(
      <HoldActionButton
        variant="check-in"
        label="Hold to Check In"
        loadingLabel="Checking in..."
        durationMs={2500}
        onComplete={onComplete}
      />,
    );

    const button = screen.getByRole('button', { name: /Hold to Check In/i });

    act(() => {
      fireEvent.pointerDown(button, { pointerType: 'mouse', button: 0 });
      advanceFrame(1000);
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText(/Hold… 1\.5s/i)).toBeInTheDocument();

    act(() => {
      advanceFrame(1500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('requires the same 2.5-second hold for Check Out variant', () => {
    const onComplete = vi.fn();
    render(
      <HoldActionButton
        variant="check-out"
        label="Hold to Check Out"
        loadingLabel="Checking out..."
        durationMs={2500}
        onComplete={onComplete}
      />,
    );

    const button = screen.getByRole('button', { name: /Hold to Check Out/i });

    act(() => {
      fireEvent.pointerDown(button, { pointerType: 'touch' });
      advanceFrame(2400);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      advanceFrame(150);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
