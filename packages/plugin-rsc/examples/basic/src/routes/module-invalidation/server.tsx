import { dep } from './server-dep'

export function TestModuleInvalidationServer() {
  return (
    <div>
      <form
        data-testid="test-module-invalidation-server"
        action={async () => {
          'use server'
          dep.value ^= 1
        }}
      >
        <button>test-module-invalidation-server</button>
        <span>[dep: {dep.value}]</span>
      </form>
    </div>
  )
}
