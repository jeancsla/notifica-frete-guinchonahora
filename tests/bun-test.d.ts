declare module "bun:test" {
  export const jest: {
    mock: (id: string, factory?: any) => void;
    fn: (...args: any[]) => any;
  };
}
