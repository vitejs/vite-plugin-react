import {
  getCount as getCustomServerFileCount,
  increment as incrementCustomServerFile,
} from './use-custom-server-file.ts'
import {
  getCount as getServerFileCount,
  increment as incrementServerFile,
  reset as resetServerFile,
} from './use-server-file.ts'

export async function DirectiveComposition() {
  const [serverFileCount, customServerFileCount] = await Promise.all([
    getServerFileCount(),
    getCustomServerFileCount(),
  ])
  return (
    <>
      <form action={incrementServerFile}>
        <button>Server file, custom inline: {serverFileCount}</button>
      </form>
      <form action={incrementCustomServerFile}>
        <button>
          Custom server file, server inline: {customServerFileCount}
        </button>
      </form>
      <form action={resetServerFile}>
        <button>Reset composition</button>
      </form>
    </>
  )
}
