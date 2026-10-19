import { expect, test } from '@playwright/test'
import { setupInlineFixture, type Fixture, useFixture } from './fixture'
import { waitForHydration } from './helper'

test.describe(() => {
  const root = 'examples/e2e/temp/server-reference-callback'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter-extra',
      dest: root,
      files: {
        'src/root.tsx': /* tsx */ `
          import {
            allowedReference,
            describeArgument,
            rejectedReference,
          } from './server-reference.tsx'
          import { calls } from './calls.tsx'

          export function Root() {
            return (
              <html lang="en">
                <head>
                  <meta charSet="UTF-8" />
                </head>
                <body>
                  <form action={describeArgument.bind(null, allowedReference)}>
                    <button>allowed</button>
                  </form>
                  <form action={describeArgument.bind(null, rejectedReference)}>
                    <button>rejected</button>
                  </form>
                  <p data-testid="calls">[{calls.join(',')}]</p>
                </body>
              </html>
            )
          }
        `,
        'src/calls.tsx': /* tsx */ `
          export const calls: string[] = []
        `,
        'src/server-reference.tsx': /* tsx */ `
          'use server'
          import { calls } from './calls.tsx'

          export async function describeArgument(argument: unknown) {
            calls.push(typeof argument)
          }

          export async function allowedReference() {}

          export async function rejectedReference() {}
        `,
        'src/framework/entry.rsc.tsx': {
          edit: (s) =>
            s
              .replace(
                `decodeReply(body, { temporaryReferences })`,
                `decodeReply(body, { temporaryReferences }, { onServerReference })`,
              )
              .replace(
                `decodeAction(formData)`,
                `decodeAction(formData, { onServerReference })`,
              )
              .replace(
                `decodeFormState(result, formData)`,
                `decodeFormState(result, formData, { onServerReference })`,
              ) +
            /* tsx */ `
function onServerReference(metadata: { id: string; name: string }) {
  if (metadata.name === 'rejectedReference') {
    throw new Error('rejected server reference: ' + metadata.id + '#' + metadata.name)
  }
}
`,
        },
      },
    })
  })

  function defineServerReferenceCallbackTest(f: Fixture) {
    test('onServerReference rejects decoded server references', async ({
      browser,
      page,
    }) => {
      // decodeReply
      await page.goto(f.url())
      await waitForHydration(page)
      const rejected = page.waitForResponse(
        (response) => response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'rejected' }).click()
      expect((await rejected).status()).toBe(500)

      await page.goto(f.url())
      await waitForHydration(page)
      await expect(page.getByTestId('calls')).toHaveText('[]')
      await page.getByRole('button', { name: 'allowed' }).click()
      await expect(page.getByTestId('calls')).toHaveText('[function]')

      // decodeAction and decodeFormState
      const context = await browser.newContext({ javaScriptEnabled: false })
      try {
        const nojsPage = await context.newPage()
        await nojsPage.goto(f.url())
        const [rejectedForm] = await Promise.all([
          nojsPage.waitForResponse(
            (response) => response.request().method() === 'POST',
          ),
          nojsPage.getByRole('button', { name: 'rejected' }).click(),
        ])
        expect(rejectedForm.status()).toBe(500)

        await nojsPage.goto(f.url())
        await expect(nojsPage.getByTestId('calls')).toHaveText('[function]')
        await nojsPage.getByRole('button', { name: 'allowed' }).click()
        await expect(nojsPage.getByTestId('calls')).toHaveText(
          '[function,function]',
        )
      } finally {
        await context.close()
      }
    })
  }

  test.describe('dev', () => {
    const f = useFixture({ root, mode: 'dev' })
    defineServerReferenceCallbackTest(f)
  })

  test.describe('build', () => {
    const f = useFixture({ root, mode: 'build' })
    defineServerReferenceCallbackTest(f)
  })
})
