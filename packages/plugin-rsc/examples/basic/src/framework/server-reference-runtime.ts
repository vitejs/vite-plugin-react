import { registerServerReference } from '@vitejs/plugin-rsc/rsc'

const frameworkServerReferences = new Map<string, Function>()

export function registerFrameworkServerReference<
  T extends (...args: any[]) => unknown,
>(reference: T, id: string, name: string): T {
  frameworkServerReferences.set(`${id}#${name}`, reference)
  return registerServerReference(reference, id, name) as T
}

export function loadFrameworkServerReference(id: string): Function | undefined {
  return frameworkServerReferences.get(id)
}
