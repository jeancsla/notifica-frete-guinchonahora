export type MockedFunction<T extends (...args: any[]) => any> = T & {
  mock: { calls: Array<unknown[]> };
  mockClear: () => void;
  mockReset: () => void;
  mockResolvedValue: (value: unknown) => void;
  mockResolvedValueOnce: (value: unknown) => void;
  mockRejectedValue: (value: unknown) => void;
  mockRejectedValueOnce: (value: unknown) => void;
};

export function asMock<T extends (...args: any[]) => any>(fn: T) {
  return fn as unknown as MockedFunction<T>;
}
