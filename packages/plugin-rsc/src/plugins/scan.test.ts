import { expect, test } from 'vitest'
import { scanBuildStrip } from './scan'

test(scanBuildStrip, () => {
  const code = `
import { foo } from 'foo';
import { bar } from 'bar';
import.meta.glob('./glob');
import.meta.env;
`
  const output = scanBuildStrip(code)
  expect(output).toMatchInlineSnapshot(`
    "import "foo";
    import "bar";
    "
  `)
})
