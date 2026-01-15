import '../styles.css'
import TestDepCssInServer from '@vitejs/test-dep-css-in-server/server'
import React from 'react'
import {
  TestServerActionBindAction,
  TestServerActionBindClient,
  TestServerActionBindReset,
  TestServerActionBindSimple,
} from './action-bind/server'
import { TestServerActionError } from './action-error/server'
import {
  TestActionFromClient,
  TestUseActionState,
} from './action-from-client/client'
import { TestActionStateServer } from './action-state/server'
import { ServerCounter } from './action/server'
import { TestAssetsServer } from './assets/server'
import { TestBrowserOnly } from './browser-only/client'
import { TestClientChunkServer } from './chunk/server'
import { TestChunk2 } from './chunk2/server'
import { ClientCounter, Hydrated } from './client'
import { TestClientError } from './client-error/client'
import { TestCssQueries } from './css-queries/server'
import { TestClientInServer } from './deps/client-in-server/server'
import { TestServerInClient } from './deps/server-in-client/client'
import { TestServerInServer } from './deps/server-in-server/server'
import { TestTransitiveCjsClient } from './deps/transitive-cjs/client'
import { TestHmrClientDep } from './hmr-client-dep/client'
import { TestHmrClientDep2 } from './hmr-client-dep2/client'
import { TestHmrClientDep3 } from './hmr-client-dep3/server'
import { TestHmrSharedAtomic } from './hmr-shared/atomic/server'
import { TestHmrSharedClient } from './hmr-shared/client'
import { TestHmrSharedServer } from './hmr-shared/server'
import { TestHmrSwitchClient } from './hmr-switch/client'
import { TestHmrSwitchServer } from './hmr-switch/server'
import { TestHydrationMismatch } from './hydration-mismatch/server'
import { TestImportMetaGlob } from './import-meta-glob/server'
import { TestLazyCssClientToClient } from './lazy-css/client-to-client'
import { TestLazyCssServerToClient } from './lazy-css/server-to-client'
import { TestLazyCssServerToServer } from './lazy-css/server-to-server'
import { TestModuleInvalidationServer } from './module-invalidation/server'
import { TestPayloadServer } from './payload/server'
import { TestReactCache } from './react-cache/server'
import { TestSerializationServer } from './serialization/server'
import { TestServerError } from './server-error/server'
import { TestCssClientNoSsr } from './style-client-no-ssr/server'
import { TestStyleClient } from './style-client/client'
import { TestStyleServer } from './style-server/server'
import { TestTailwind } from './tailwind'
import { TestTemporaryReference } from './temporary-reference/client'
import { TestTreeShakeServer } from './tree-shake/server'
import { TestTreeShake2 } from './tree-shake2/server'
import { TestUseCache } from './use-cache/server'
import { TestUseId } from './use-id/server'
import { TestVirtualModule } from './virtual-module/server'

export function Root(props: { url: URL }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>vite-rsc</title>
      </head>
      <body className="flex flex-col gap-2 items-start p-2">
        <div>
          <input placeholder="test-client-state" />
          <Hydrated />
        </div>
        <ClientCounter />
        <ServerCounter />
        <TestStyleClient />
        <TestStyleServer />
        <TestCssClientNoSsr url={props.url} />
        <TestTailwind />
        <TestDepCssInServer />
        <TestHydrationMismatch url={props.url} />
        <TestVirtualModule />
        <TestLazyCssClientToClient />
        <TestLazyCssServerToClient />
        <TestLazyCssServerToServer />
        <TestHmrClientDep url={{ search: props.url.search }} />
        <TestHmrClientDep2 url={{ search: props.url.search }} />
        <TestHmrClientDep3 />
        <TestHmrSharedServer />
        <TestHmrSharedClient />
        <TestHmrSharedAtomic />
        <TestHmrSwitchServer />
        <TestHmrSwitchClient />
        <TestTemporaryReference />
        <TestServerActionError />
        <TestClientError />
        <TestServerError url={props.url} />
        <TestReplayConsoleLogs url={props.url} />
        <TestSuspense url={props.url} />
        <TestActionFromClient />
        <TestUseActionState />
        <TestPayloadServer url={props.url} />
        <TestServerActionBindReset />
        <TestServerActionBindSimple />
        <TestServerActionBindClient />
        <TestServerActionBindAction />
        <TestSerializationServer />
        <TestClientInServer />
        <TestServerInServer />
        <TestServerInClient />
        <TestTransitiveCjsClient />
        <TestActionStateServer />
        <TestModuleInvalidationServer />
        <TestBrowserOnly />
        <TestUseCache />
        <TestReactCache url={props.url} />
        <TestCssQueries />
        <TestImportMetaGlob />
        <TestAssetsServer />
        <TestTreeShakeServer />
        <TestTreeShake2 />
        <TestClientChunkServer />
        <TestChunk2 />
        <TestUseId />
      </body>
    </html>
  )
}

function TestReplayConsoleLogs(props: { url: URL }) {
  if (props.url.search.includes('test-replay-console-logs')) {
    console.log('[test-replay-console-logs]')
  }
  return <a href="?test-replay-console-logs">test-replayConsoleLogs</a>
}

function TestSuspense(props: { url: URL }) {
  if (props.url.search.includes('test-suspense')) {
    const ms = Number(props.url.searchParams.get('test-suspense')) || 1000
    async function Inner() {
      await new Promise((resolve) => setTimeout(resolve, ms))
      return <div>suspense-resolved</div>
    }
    return (
      <div data-testid="suspense">
        <React.Suspense fallback={<div>suspense-fallback</div>}>
          <Inner />
        </React.Suspense>
      </div>
    )
  }
  return <a href="?test-suspense=1000">test-suspense</a>
}
