/**
 * A pausable interval timer
 */
export class IntervalTimer {
  private timerId: number | null = null;
  private startTime: number = 0;
  private remaining: number = 0;
  private _isRunning: boolean = false; // Add this backing field
  
  // Add a public getter for isRunning
  get isRunning(): boolean {
    return this._isRunning;
  }

  constructor(
    private callback: () => void,
    private interval: number
  ) {}
  
  start(): void {
    this.stop();
    this._isRunning = true; // Set flag when starting
    this.remaining = this.interval;
    this.startTime = Date.now();
    
    this.timerId = window.setTimeout(() => {
      this.callback();
      if (this._isRunning) {
        this.start(); // Schedule the next call
      }
    }, this.interval);
  }

  stop(): void {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this._isRunning = false; // Clear flag when stopping
  }

  pause(): void {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
      this.remaining = this.interval - (Date.now() - this.startTime);
      this.timerId = null;
    }
  }

  resume(): void {
    if (!this.timerId && this.remaining > 0) {
      this._isRunning = true; // Set flag when resuming
      this.startTime = Date.now();
      
      this.timerId = window.setTimeout(() => {
        this.callback();
        if (this._isRunning) {
          this.start(); // Schedule the next call with full interval
        }
      }, this.remaining);
    }
  }
  
  // Add setInterval method
  setInterval(newInterval: number): void {
    const wasRunning = this._isRunning;
    this.stop();
    this.interval = newInterval;
    if (wasRunning) {
      this.start();
    }
  }
}