// TODO: support duplicate star exports that resolve to the same namespace binding.
// This is also currently broken in Node 24.16.0 due to a V8 bug.
export * from './dep1.js'
export * from './dep2.js'
