import { Injectable } from '@nestjs/common';

type Labels = Record<string, string | number | boolean | null | undefined>;

type CounterKey = {
  name: string;
  labels: Labels;
};

type DurationPoint = {
  name: string;
  ms: number;
  labels: Labels;
  ts: number;
};

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly durations: DurationPoint[] = [];

  incrementCounter(name: string, labels?: Labels, delta = 1): void {
    const key = this.keyOf({ name, labels: labels ?? {} });
    this.counters.set(key, (this.counters.get(key) ?? 0) + delta);
  }

  recordDuration(name: string, ms: number, labels?: Labels): void {
    if (!Number.isFinite(ms) || ms < 0) {
      return;
    }
    this.durations.push({
      name,
      ms,
      labels: labels ?? {},
      ts: Date.now()
    });
    if (this.durations.length > 10_000) {
      this.durations.splice(0, this.durations.length - 10_000);
    }
  }

  snapshot(): { counters: Array<{ key: string; value: number }>; durations: DurationPoint[] } {
    return {
      counters: Array.from(this.counters.entries()).map(([key, value]) => ({ key, value })),
      durations: [...this.durations]
    };
  }

  private keyOf(input: CounterKey): string {
    const sorted = Object.keys(input.labels)
      .sort()
      .map((key) => `${key}=${String(input.labels[key])}`)
      .join(',');
    return `${input.name}{${sorted}}`;
  }
}
