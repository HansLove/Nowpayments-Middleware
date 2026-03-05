import { DispersionTarget } from '@/types/dispersion.types';

class DispersionTargetStoreSingleton {
  private static instance: DispersionTargetStoreSingleton;
  private targets: Map<string, DispersionTarget> = new Map();

  private constructor() {}

  static getInstance(): DispersionTargetStoreSingleton {
    if (!DispersionTargetStoreSingleton.instance) {
      DispersionTargetStoreSingleton.instance =
        new DispersionTargetStoreSingleton();
    }
    return DispersionTargetStoreSingleton.instance;
  }

  register(target: DispersionTarget): void {
    this.targets.set(target.withdrawalId, target);
  }

  registerBatch(targets: DispersionTarget[]): void {
    for (const target of targets) {
      this.targets.set(target.withdrawalId, target);
    }
  }

  get(withdrawalId: string): DispersionTarget | undefined {
    return this.targets.get(withdrawalId);
  }

  has(withdrawalId: string): boolean {
    return this.targets.has(withdrawalId);
  }

  remove(withdrawalId: string): void {
    this.targets.delete(withdrawalId);
  }

  clear(): void {
    this.targets.clear();
  }

  reset(): void {
    this.targets.clear();
  }
}

export const DispersionTargetStore =
  DispersionTargetStoreSingleton.getInstance();
