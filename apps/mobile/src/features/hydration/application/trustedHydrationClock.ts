import {AppError} from '../../../shared/errors/AppError';

const MAX_CLOCK_DIFFERENCE_MS = 2 * 60 * 1000;
const MAX_REFERENCE_AGE_MS = 24 * 60 * 60 * 1000;

export class TrustedHydrationClock {
  private reference?: {serverMs: number; monotonicMs: number};

  constructor(
    private readonly wallNow: () => number = () => Date.now(),
    private readonly monotonicNow: () => number = monotonicTime,
  ) {}

  synchronize(serverTime: string): void {
    const serverMs = Date.parse(serverTime);
    const monotonicMs = this.monotonicNow();
    if (!Number.isFinite(serverMs) || !Number.isFinite(monotonicMs)) return;
    this.reference = {serverMs, monotonicMs};
  }

  recordedAt(): string {
    if (!this.reference) throw this.unverified();
    const elapsed = this.monotonicNow() - this.reference.monotonicMs;
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > MAX_REFERENCE_AGE_MS) throw this.unverified();
    const serverNow = this.reference.serverMs + elapsed;
    const wallNow = this.wallNow();
    if (!Number.isFinite(wallNow) || Math.abs(wallNow - serverNow) > MAX_CLOCK_DIFFERENCE_MS) {
      throw new AppError('Ative a data e hora automáticas do celular e conecte-se à internet antes de registrar água.', 'DEVICE_CLOCK_CHANGED');
    }
    return new Date(serverNow).toISOString();
  }

  private unverified(): AppError {
    return new AppError('Conecte-se à internet para validar o horário antes de registrar água offline.', 'HYDRATION_TIME_UNVERIFIED');
  }
}

function monotonicTime(): number {
  // React Native implements performance.now with its native steady clock.
  // Never fall back to Date.now: it changes with the device's date settings.
  const runtime = globalThis as typeof globalThis & {performance?: {now(): number}};
  return runtime.performance?.now() ?? NaN;
}
