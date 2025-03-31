/**
 * A pausable interval timer
 */
export class IntervalTimer {
  private intervalId: number | null = null;
  private lastTime: number = 0;
  private remaining: number;
  private isPaused: boolean = false;
  private callback: () => void;
  
  constructor(callback: () => void, interval: number) {
    this.callback = callback;
    this.remaining = interval;
  }

  startTimer(): void {
    this.isPaused = false;
    this.lastTime = Date.now();
    
    this.clearTimer();
    this.intervalId = window.setInterval(() => {
      this.callback();
    }, this.remaining);
  }
  
  pause(): void {
    if (!this.isPaused && this.intervalId !== null) {
      this.isPaused = true;
      this.clearTimer();
      this.remaining -= Date.now() - this.lastTime;
    }
  }
  
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = Date.now();
      
      this.clearTimer();
      this.intervalId = window.setInterval(() => {
        this.callback();
      }, this.remaining);
    }
  }
  
  stop(): void {
    this.clearTimer();
    this.remaining = 0;
    this.isPaused = false;
  }
  
  setInterval(interval: number): void {
    const wasRunning = this.intervalId !== null && !this.isPaused;
    
    this.clearTimer();
    this.remaining = interval;
    
    if (wasRunning) {
      this.startTimer();
    }
  }
  
  private clearTimer(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}