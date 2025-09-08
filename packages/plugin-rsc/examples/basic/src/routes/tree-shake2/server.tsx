import { LibClient1, LibServer1 } from './lib'

export function TestTreeShake2() {
  return (
    <div data-testid="test-tree-shake2">
      test-tree-shake2:
      <LibClient1 />|<LibServer1 />
    </div>
  )
}
