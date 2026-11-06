// Production stand-in for leva (aliased in vite.config.ts): same API surface we use, none of the UI bytes.
type Schema = Record<string, { value: number }>

export function useControls<T extends Schema>(_folder: string, schema: T) {
  return Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, v.value])) as { [K in keyof T]: number }
}

export const Leva = (_props: object) => null
