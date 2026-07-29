import { actionA } from './action.tsx'

// Return the server reference through ordinary runtime value flow, which
// import/export binding reconstruction cannot follow.
export function getActionA() {
  return actionA
}
