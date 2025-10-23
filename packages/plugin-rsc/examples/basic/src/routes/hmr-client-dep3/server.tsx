import { TestHmrClientDepA } from './client-a'
import { TestHmrClientDepB } from './client-b'

// example to demonstrate a folowing behavior
// https://github.com/vitejs/vite-plugin-react/pull/788#issuecomment-3227656612
/*
server                       server
   |                           |
   v                           v
client-a   client-a?t=xx <-- client-b
   |         |
   v         v
client-dep-comp?t=xx
*/

export function TestHmrClientDep3() {
  return (
    <div>
      <TestHmrClientDepA />
      <TestHmrClientDepB />
    </div>
  )
}
