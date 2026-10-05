export type PauseReason = 'hover' | 'focus' | 'hidden' | 'offscreen';

export interface TickerOptions {
  count: number;
  intervalMs: number;
  reducedMotion: boolean;
  start?: number;
  onChange: (index: number, manual: boolean) => void;
}

// Rotates through `count` items. Any pause reason holds it; a manual pick stops it for good.
export class Ticker {
  index: number;
  private readonly paused = new Set<PauseReason>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped: boolean;

  constructor(private readonly options: TickerOptions) {
    this.index = options.start ?? 0;
    this.stopped = options.reducedMotion;
    this.schedule();
  }

  pause(reason: PauseReason) {
    this.paused.add(reason);
    this.schedule();
  }

  resume(reason: PauseReason) {
    this.paused.delete(reason);
    this.schedule();
  }

  show(index: number) {
    this.stopped = true;
    this.schedule();
    this.index = index;
    this.options.onChange(index, true);
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.stopped || this.paused.size) return;
    this.timer = setTimeout(() => {
      this.index = (this.index + 1) % this.options.count;
      this.options.onChange(this.index, false);
      this.schedule();
    }, this.options.intervalMs);
  }
}
