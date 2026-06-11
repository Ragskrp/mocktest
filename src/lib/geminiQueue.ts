interface QueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class GeminiQueue {
  private rpm: number;
  private queue: QueueItem[] = [];
  private running: number = 0;
  private minInterval: number;
  private lastCall: number = 0;

  constructor(rpm = 10) {
    this.rpm = rpm;
    this.minInterval = (60 / rpm) * 1000; // ms between requests
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.running >= 1) return;
    const item = this.queue.shift();
    if (!item) return;

    const now = Date.now();
    const wait = Math.max(0, this.lastCall + this.minInterval - now);
    
    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait));
    }
    
    this.running++;
    this.lastCall = Date.now();
    
    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (e: any) {
      if (e?.status === 429 || e?.status === 403) {
        // Push back with backoff
        this.queue.unshift(item);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        item.reject(e);
      }
    } finally {
      this.running--;
      this.process();
    }
  }
}

export const geminiQueue = new GeminiQueue(10); // Use 10 RPM
