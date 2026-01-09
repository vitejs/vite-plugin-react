import * as esModuleLexer from 'es-module-lexer'
import { beforeAll, describe, expect, it } from 'vitest'
import { transformScanBuildStrip } from './scan'

describe(transformScanBuildStrip, () => {
  beforeAll(async () => {
    await esModuleLexer.init
  })

  it('basic', async () => {
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
})
