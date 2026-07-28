# Align Inline Directive Method Syntax With Next.js

## Feature request

Align `transformHoistInlineDirective` with Next.js by supporting inline directives in object methods and static class methods.

The transform already handles function declarations, function expressions, and arrow functions. Next.js also lowers directive-bearing object methods and static class methods into module-level references. Supporting the same source forms is a technically straightforward compatibility gap in the public transform surface.

## Object methods

Input:

```js
const object = {
  async ['action']() {
    'use server'
    return 1
  },
}
```

The method should be hoisted through the same runtime callback as other supported functions. The original property should become a normal property whose value is the transformed callable:

```js
const object = {
  action: runtime($$hoist_0_action),
}

export async function $$hoist_0_action() {
  return 1
}
```

This should also work for non-computed object method names and closure captures.

## Static class methods

Input:

```js
class Actions {
  static async ['action']() {
    'use server'
    return 1
  }
}
```

The static method should become a static field containing the transformed callable:

```js
class Actions {
  static ['action'] = runtime($$hoist_0_action)
}

export async function $$hoist_0_action() {
  return 1
}
```

This should also work for non-computed static method names and closure captures that remain valid after hoisting.

## Unsupported method forms

Reject forms whose semantics cannot be preserved by this lowering:

```js
class Actions {
  async action() {
    'use server'
  }
}

class Actions {
  static async #action() {
    'use server'
  }
}

const object = {
  get action() {
    'use server'
  },
}

class Actions {
  static set action(value) {
    'use server'
  }
}
```

Instance methods depend on instance `this` behavior. Private methods, getters, and setters cannot be replaced with an ordinary public callable property while preserving their contracts.

## Next.js reference fixtures

Use the maintained Next.js server-actions fixtures as the behavior reference:

- [Fixture 53](https://github.com/vercel/next.js/tree/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/53) lowers object methods containing `"use cache"` and `"use server"` into ordinary properties referencing module-level callables.
- [Fixture 54](https://github.com/vercel/next.js/tree/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/54) covers object methods with closure captures.
- [Fixture 57](https://github.com/vercel/next.js/tree/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/fixture/server-actions/server-graph/57) lowers static class methods into static fields referencing module-level callables.
- [Error fixture 25](https://github.com/vercel/next.js/tree/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/errors/server-actions/server-graph/25) rejects directive-bearing instance methods.
- [Error fixture 26](https://github.com/vercel/next.js/tree/153bf8ac5fa00888ef5fbb2b65cac12f0942a44f/crates/next-custom-transforms/tests/errors/server-actions/server-graph/26) rejects hoisted static methods that use `this`, `super`, or `arguments`.

The generated identifiers, registration calls, and cache wrappers do not need to match Next.js. The relevant parity is the syntax lowering: hoist the implementation, replace the object method with a property value, replace the static method with a static field value, preserve captures, and reject method forms whose semantics cannot survive hoisting.

## Work plan

| Work item                               | Tracking                                                          |
| --------------------------------------- | ----------------------------------------------------------------- |
| Object and static class method lowering | [PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246) |
| Unsupported method diagnostics          | [PR #1246](https://github.com/vitejs/vite-plugin-react/pull/1246) |
| Next.js input/output fixture comparison | Fixtures 53, 54, 57 and error fixtures 25, 26                     |

## Verification

Port the relevant Next.js inputs into focused `transformHoistInlineDirective` fixtures and compare the checked output snapshots manually. Cover:

- Object methods with `"use server"`.
- Object methods with closure captures.
- Static class methods with `"use server"`.
- Computed and non-computed method names.
- Rejection of instance, private, getter, setter, and meaning-changing `this`, `super`, or `arguments` cases.

The feature is aligned when the snapshots show the same syntax-level decomposition as the corresponding Next.js outputs. A new end-to-end transport test is not required because this change does not introduce a new runtime or Server Function integration path.
