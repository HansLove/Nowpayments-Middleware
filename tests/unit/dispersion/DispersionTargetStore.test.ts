import { DispersionTargetStore } from '@/dispersion/DispersionTargetStore';
import { DispersionTarget } from '@/types/dispersion.types';

describe('DispersionTargetStore', () => {
  beforeEach(() => {
    DispersionTargetStore.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeTarget = (withdrawalId: string): DispersionTarget => ({
    withdrawalId,
    network: 'polygon',
    finalAddress: '0xABC123',
    amount: '10.5',
    tokenCurrency: 'USDT',
  });

  describe('register()', () => {
    it('stores a target by withdrawalId', () => {
      const target = makeTarget('w-001');
      DispersionTargetStore.register(target);

      expect(DispersionTargetStore.get('w-001')).toEqual(target);
    });

    it('overwrites an existing target with the same withdrawalId', () => {
      const original = makeTarget('w-001');
      const updated: DispersionTarget = { ...original, amount: '20.0' };

      DispersionTargetStore.register(original);
      DispersionTargetStore.register(updated);

      expect(DispersionTargetStore.get('w-001')).toEqual(updated);
    });
  });

  describe('registerBatch()', () => {
    it('stores multiple targets', () => {
      const targets = [
        makeTarget('w-001'),
        makeTarget('w-002'),
        makeTarget('w-003'),
      ];
      DispersionTargetStore.registerBatch(targets);

      expect(DispersionTargetStore.get('w-001')).toEqual(targets[0]);
      expect(DispersionTargetStore.get('w-002')).toEqual(targets[1]);
      expect(DispersionTargetStore.get('w-003')).toEqual(targets[2]);
    });

    it('registers an empty batch without error', () => {
      expect(() => DispersionTargetStore.registerBatch([])).not.toThrow();
    });
  });

  describe('get()', () => {
    it('returns the correct target', () => {
      const target = makeTarget('w-abc');
      DispersionTargetStore.register(target);

      expect(DispersionTargetStore.get('w-abc')).toEqual(target);
    });

    it('returns undefined when withdrawalId is not registered', () => {
      expect(DispersionTargetStore.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('returns true when target exists', () => {
      DispersionTargetStore.register(makeTarget('w-001'));

      expect(DispersionTargetStore.has('w-001')).toBe(true);
    });

    it('returns false when target does not exist', () => {
      expect(DispersionTargetStore.has('w-999')).toBe(false);
    });
  });

  describe('remove()', () => {
    it('deletes a target by withdrawalId', () => {
      DispersionTargetStore.register(makeTarget('w-001'));
      DispersionTargetStore.remove('w-001');

      expect(DispersionTargetStore.has('w-001')).toBe(false);
      expect(DispersionTargetStore.get('w-001')).toBeUndefined();
    });

    it('does not throw when removing a nonexistent id', () => {
      expect(() => DispersionTargetStore.remove('nonexistent')).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('removes all targets', () => {
      DispersionTargetStore.registerBatch([
        makeTarget('w-001'),
        makeTarget('w-002'),
      ]);
      DispersionTargetStore.clear();

      expect(DispersionTargetStore.has('w-001')).toBe(false);
      expect(DispersionTargetStore.has('w-002')).toBe(false);
    });
  });

  describe('reset()', () => {
    it('clears all targets', () => {
      DispersionTargetStore.registerBatch([
        makeTarget('w-001'),
        makeTarget('w-002'),
      ]);
      DispersionTargetStore.reset();

      expect(DispersionTargetStore.has('w-001')).toBe(false);
      expect(DispersionTargetStore.has('w-002')).toBe(false);
    });
  });
});
