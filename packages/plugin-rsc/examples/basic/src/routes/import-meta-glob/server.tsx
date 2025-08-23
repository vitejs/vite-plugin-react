export async function TestImportMetaGlob() {
  const mod: any = await Object.values(import.meta.glob('./dep.tsx'))[0]()
  return <mod.default />
}
