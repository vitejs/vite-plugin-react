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
import { ClientCounter, Hydrated } from './client'
import { TestClientInServer } from './deps/client-in-server/server'
import { TestServerInClient } from './deps/server-in-client/client'
import { TestServerInServer } from './deps/server-in-server/server'
import { TestHmrClientDep } from './hmr-client-dep/client'
import { TestModuleInvalidationServer } from './module-invalidation/server'
import { TestPayloadServer } from './payload/server'
import { TestSerializationServer } from './serialization/server'
import { TestCssClientNoSsr } from './style-client-no-ssr/server'
import { TestStyleClient } from './style-client/client'
import { TestStyleServer } from './style-server/server'
import { TestTailwindClient } from './tailwind/client'
import { TestTailwindServer } from './tailwind/server'
import { TestTemporaryReference } from './temporary-reference/client'
import { TestUseCache } from './use-cache/server'
import { TestHydrationMismatch } from './hydration-mismatch/server'

export function Root(props: { url: URL }) {
  return (
    <html>
      <head>
        <title>vite-rsc</title>
        {import.meta.viteRsc.loadCss('/src/routes/root.tsx')}
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
        <TestTailwindClient />
        <TestTailwindServer />
        <TestHydrationMismatch url={props.url} />
        <TestHmrClientDep />
        <TestTemporaryReference />
        <TestServerActionError />
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
        <TestActionStateServer />
        <TestModuleInvalidationServer />
        <TestUseCache />
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
