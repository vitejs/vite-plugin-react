import { getCounts, incrementBuiltin, incrementCustom } from './actions.ts'

export function Root() {
  const { builtinCount, customCount } = getCounts()
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Custom Server Function</title>
      </head>
      <body>
        <form action={incrementBuiltin}>
          <button>Built-in: {builtinCount}</button>
        </form>
        <form action={incrementCustom}>
          <button>Custom: {customCount}</button>
        </form>
      </body>
    </html>
  )
}
