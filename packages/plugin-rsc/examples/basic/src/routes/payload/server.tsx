import { TestPayloadClient } from './client'

export function TestPayloadServer(props: { url: URL }) {
  return (
    <div>
      test-payload (<a href="?test-payload-binary">binary</a>):{' '}
      <span data-testid="ssr-rsc-payload">
        <TestPayloadClient
          test1={'🙂'}
          test2={"<script>throw new Error('boom')</script>"}
          test3={
            // disabled by default so that it won't break Stackblitz demo
            // https://github.com/stackblitz/webcontainer-core/issues/1861
            props.url.searchParams.has('test-payload-binary')
              ? // reverse to have non-utf8 binary data
                new TextEncoder().encode('🔥').reverse()
              : null
          }
          test4={'&><\u2028\u2029'}
        />
      </span>
    </div>
  )
}
