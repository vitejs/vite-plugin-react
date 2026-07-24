import * as esModuleLexer from 'es-module-lexer'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import vitePluginRsc from '../plugin'
import { transformScanBuildStrip } from './scan'

describe(transformScanBuildStrip, () => {
  beforeAll(async () => {
    await esModuleLexer.init
  })

  it('strips modules to their imports', async () => {
    const input = `\
import { a } from "a";
import "b";
import(String("c"))
import.meta.glob("d", {
  query: "?e",
})
import.meta.globee("d", { query: "?e" })
export default "foo";
`
    expect(await transformScanBuildStrip(input)).toMatchInlineSnapshot(`
      "import "a";
      import "b";
      console.log(import.meta.glob("d", {
        query: "?e",
      }));
      "
    `)
  })

  it('reports the existing lexer result when observed', async () => {
    const input = `import { action } from './actions'; export { action as submit }`
    const onLexed = vi.fn()

    await transformScanBuildStrip(input, onLexed)

    expect(onLexed).toHaveBeenCalledOnce()
    const [imports, exports] = onLexed.mock.calls[0]!
    expect(
      imports.map((item: esModuleLexer.ImportSpecifier) => item.n),
    ).toEqual(['./actions'])
    expect(
      exports.map((item: esModuleLexer.ExportSpecifier) => item.n),
    ).toEqual(['submit'])
  })

  it('keeps the existing scan plugin composition', () => {
    expect(
      vitePluginRsc().filter((plugin) => plugin.name === 'rsc:scan-strip'),
    ).toHaveLength(2)
  })
})
