/**
 * A pausable interval timer
 */
export class IntervalTimer {
  private timerId: number | null = null;
  private startTime: number = 0;
  private remaining: number = 0;
  private isPaused: boolean = false;
  private callback: () => void;
  private intervalTime: number;
  
  constructor(callback: () => void, intervalMs: number) {
    this.callback = callback;
    this.intervalTime = intervalMs;
    this.start();
  }
  
  start(): void {
    console.log(`Starting IntervalTimer with interval: ${this.intervalTime}ms`);
    this.isPaused = false;
    this.startTime = Date.now();
    this.timerId = window.setInterval(this.callback, this.intervalTime);
  }
  
  pause(): void {
    if (this.timerId === null || this.isPaused) return;
    
    window.clearInterval(this.timerId);
    this.timerId = null;
    this.remaining = this.intervalTime - (Date.now() - this.startTime) % this.intervalTime;
    this.isPaused = true;
  }
  
  resume(): void {
    if (this.timerId !== null || !this.isPaused) return;
    
    this.isPaused = false;
    this.startTime = Date.now() - (this.intervalTime - this.remaining);
    this.timerId = window.setInterval(this.callback, this.intervalTime);
  }
  
  stop(): void {
    if (this.timerId === null) return;
    
    window.clearInterval(this.timerId);
    this.timerId = null;
    this.isPaused = false;
  }
  
  setInterval(newIntervalMs: number): void {
    const wasRunning = this.timerId !== null && !this.isPaused;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.intervalTime = newIntervalMs;
    
    if (wasRunning) {
      this.start();
    }
  }
}