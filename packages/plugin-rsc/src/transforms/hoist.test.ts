import { walk } from 'estree-walker'
import { analyze } from 'periscopic'
import { parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { transformHoistInlineDirective } from './hoist'
import { debugSourceMap } from './test-utils'

describe(transformHoistInlineDirective, () => {
  async function testTransform(
    input: string,
    options?: {
      encode?: boolean
      noExport?: boolean
      directive?: string | RegExp
    },
  ) {
    const ast = await parseAstAsync(input)
    const { output } = transformHoistInlineDirective(input, ast, {
      runtime: (value, name, meta) =>
        `$$register(${value}, "<id>", ${JSON.stringify(name)}` +
        `${
          options?.directive instanceof RegExp
            ? `, ${JSON.stringify(meta)}`
            : ''
        })`,
      directive: options?.directive ?? 'use server',
      encode: options?.encode ? (v) => `__enc(${v})` : undefined,
      decode: options?.encode ? (v) => `__dec(${v})` : undefined,
      noExport: options?.noExport,
    })
    if (!output.hasChanged()) {
      return
    }
    if (process.env['DEBUG_SOURCEMAP']) {
      await debugSourceMap(output)
    }
    return output.toString()
  }

  async function testTransformNames(input: string) {
    const ast = await parseAstAsync(input)
    const result = transformHoistInlineDirective(input, ast, {
      runtime: (value, name) =>
        `$$register(${value}, "<id>", ${JSON.stringify(name)})`,
      directive: 'use server',
    })
    return result.names
  }

  it('none', async () => {
    const input = `
const x = "x";

async function f() {
  return x;
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`undefined`)
  })

  it('top level', async () => {
    const input = `
const x = "x";

async function f() {
  "use server";
  return x;
}

async function g() {
}

export async function h(formData) {
  "use server";
  return formData.get(x);
}

export default function w() {
  "use server";
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      const x = "x";

      const f = /* #__PURE__ */ $$register($$hoist_0_f, "<id>", "$$hoist_0_f");

      async function g() {
      }

      export const h = /* #__PURE__ */ $$register($$hoist_1_h, "<id>", "$$hoist_1_h");

      const w = /* #__PURE__ */ $$register($$hoist_2_w, "<id>", "$$hoist_2_w");
      export default w;

      ;export async function $$hoist_0_f() {
        "use server";
        return x;
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_f, "name", { value: "f" });

      ;export async function $$hoist_1_h(formData) {
        "use server";
        return formData.get(x);
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_1_h, "name", { value: "h" });

      ;export function $$hoist_2_w() {
        "use server";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_2_w, "name", { value: "w" });
      "
    `)

    // nothing to encode
    expect(await testTransform(input, { encode: true })).toBe(
      await testTransform(input),
    )

    expect(await testTransformNames(input)).toMatchInlineSnapshot(`
      [
        "$$hoist_0_f",
        "$$hoist_1_h",
        "$$hoist_2_w",
      ]
    `)
  })

  it('closure', async () => {
    const input = `
let count = 0;

function Counter() {
  const name = "value";

  async function changeCount(formData) {
    "use server";
    count += Number(formData.get(name));
  }

  return "something";
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      let count = 0;

      function Counter() {
        const name = "value";

        const changeCount = /* #__PURE__ */ $$register($$hoist_0_changeCount, "<id>", "$$hoist_0_changeCount").bind(null, name);

        return "something";
      }

      ;export async function $$hoist_0_changeCount(name, formData) {
          "use server";
          count += Number(formData.get(name));
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_changeCount, "name", { value: "changeCount" });
      "
    `)
  })

  it('many', async () => {
    const input = `
let count = 0;

function Counter() {
  const name = "value";

  async function changeCount(formData) {
    "use server";
    count += Number(formData.get(name));
  }

  async function changeCount2(formData) {
    "use server";
    count += Number(formData.get(name));
  }

  return "something";
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      let count = 0;

      function Counter() {
        const name = "value";

        const changeCount = /* #__PURE__ */ $$register($$hoist_0_changeCount, "<id>", "$$hoist_0_changeCount").bind(null, name);

        const changeCount2 = /* #__PURE__ */ $$register($$hoist_1_changeCount2, "<id>", "$$hoist_1_changeCount2").bind(null, name);

        return "something";
      }

      ;export async function $$hoist_0_changeCount(name, formData) {
          "use server";
          count += Number(formData.get(name));
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_changeCount, "name", { value: "changeCount" });

      ;export async function $$hoist_1_changeCount2(name, formData) {
          "use server";
          count += Number(formData.get(name));
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_1_changeCount2, "name", { value: "changeCount2" });
      "
    `)
  })

  it('arrow', async () => {
    const input = `
let count = 0;

function Counter() {
  const name = "value";

  return {
    type: "form",
    action: (formData) => {
      "use server";
      count += Number(formData.get(name));
    }
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      let count = 0;

      function Counter() {
        const name = "value";

        return {
          type: "form",
          action: /* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function").bind(null, name)
        }
      }

      ;export function $$hoist_0_anonymous_server_function(name, formData) {
            "use server";
            count += Number(formData.get(name));
          };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });
      "
    `)

    expect(await testTransform(input, { encode: true })).toMatchInlineSnapshot(`
      "
      let count = 0;

      function Counter() {
        const name = "value";

        return {
          type: "form",
          action: /* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function").bind(null, __enc([name]))
        }
      }

      ;export function $$hoist_0_anonymous_server_function($$hoist_encoded, formData) {
            const [name] = __dec($$hoist_encoded);
      "use server";
            count += Number(formData.get(name));
          };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });
      "
    `)
  })

  it('higher order', async () => {
    // packages/react-server/examples/next/app/actions/header/page.tsx
    // packages/react-server/examples/next/app/actions/header/validator.ts
    const input = `
export default function Page() {
  const x = 0;
  const action = validator(async (y) => {
    "use server";
    return x + y;
  })
}

function validator(action) {
  return async function (arg) {
    "use server";
    return action(arg);
  };
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      export default function Page() {
        const x = 0;
        const action = validator(/* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function").bind(null, x))
      }

      function validator(action) {
        return /* #__PURE__ */ $$register($$hoist_1_anonymous_server_function, "<id>", "$$hoist_1_anonymous_server_function").bind(null, action);
      }

      ;export async function $$hoist_0_anonymous_server_function(x, y) {
          "use server";
          return x + y;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });

      ;export async function $$hoist_1_anonymous_server_function(action, arg) {
          "use server";
          return action(arg);
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_1_anonymous_server_function, "name", { value: "anonymous_server_function" });
      "
    `)

    expect(await testTransform(input, { encode: true })).toMatchInlineSnapshot(`
      "
      export default function Page() {
        const x = 0;
        const action = validator(/* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function").bind(null, __enc([x])))
      }

      function validator(action) {
        return /* #__PURE__ */ $$register($$hoist_1_anonymous_server_function, "<id>", "$$hoist_1_anonymous_server_function").bind(null, __enc([action]));
      }

      ;export async function $$hoist_0_anonymous_server_function($$hoist_encoded, y) {
          const [x] = __dec($$hoist_encoded);
      "use server";
          return x + y;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });

      ;export async function $$hoist_1_anonymous_server_function($$hoist_encoded, arg) {
          const [action] = __dec($$hoist_encoded);
      "use server";
          return action(arg);
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_1_anonymous_server_function, "name", { value: "anonymous_server_function" });
      "
    `)
  })

  // edge case found in https://github.com/remix-run/react-router/blob/98367e49900701c460cb08eb16c2441da5007efc/playground/rsc-vite/src/routes/home/home.tsx
  it('export before import', async () => {
    const input = `
export {} from "edge-case";
import { redirect } from "react-router/rsc";

export default () => {
  const redirectOnServer = async () => {
    "use server";
    throw redirect();
  };
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      export {} from "edge-case";
      import { redirect } from "react-router/rsc";

      export default () => {
        const redirectOnServer = /* #__PURE__ */ $$register($$hoist_0_redirectOnServer, "<id>", "$$hoist_0_redirectOnServer");
      }

      ;export async function $$hoist_0_redirectOnServer() {
          "use server";
          throw redirect();
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_redirectOnServer, "name", { value: "redirectOnServer" });
      "
    `)
  })

  it('noExport', async () => {
    const input = `
export async function test() {
  "use cache";
  return "test";
}
`
    expect(
      await testTransform(input, {
        directive: 'use cache',
        noExport: true,
      }),
    ).toMatchInlineSnapshot(`
      "
      export const test = /* #__PURE__ */ $$register($$hoist_0_test, "<id>", "$$hoist_0_test");

      ;async function $$hoist_0_test() {
        "use cache";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_test, "name", { value: "test" });
      "
    `)
  })

  it('directive pattern', async () => {
    const input = `
export async function none() {
  "use cache";
  return "test";
}

export async function fs() {
  "use cache: fs";
  return "test";
}

export async function kv() {
  "use cache: kv";
  return "test";
}
`
    expect(
      await testTransform(input, {
        directive: /^use cache(: .+)?$/,
        noExport: true,
      }),
    ).toMatchInlineSnapshot(`
      "
      export const none = /* #__PURE__ */ $$register($$hoist_0_none, "<id>", "$$hoist_0_none", {"directiveMatch":["use cache",null]});

      export const fs = /* #__PURE__ */ $$register($$hoist_1_fs, "<id>", "$$hoist_1_fs", {"directiveMatch":["use cache: fs",": fs"]});

      export const kv = /* #__PURE__ */ $$register($$hoist_2_kv, "<id>", "$$hoist_2_kv", {"directiveMatch":["use cache: kv",": kv"]});

      ;async function $$hoist_0_none() {
        "use cache";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_none, "name", { value: "none" });

      ;async function $$hoist_1_fs() {
        "use cache: fs";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_1_fs, "name", { value: "fs" });

      ;async function $$hoist_2_kv() {
        "use cache: kv";
        return "test";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_2_kv, "name", { value: "kv" });
      "
    `)
  })

  // periscopic misclassifies block-scoped declarations inside a "use server"
  // function body as outer-scope closure variables when the same name exists in
  // an enclosing scope.  The hoist transform then injects a duplicate `const`
  // declaration (from decryptActionBoundArgs) which causes a SyntaxError at
  // runtime.
  describe('local declaration shadows outer binding', () => {
    it('const shadows outer variable', async () => {
      // `cookies` is declared in the outer scope AND re-declared with const
      // inside the server action. periscopic sees it as a closure ref, but it
      // is NOT — the server action owns its own `cookies`.
      const input = `
function buildAction(config) {
  const cookies = getCookies();

  async function submitAction(formData) {
    "use server";
    const cookies = formData.get("value");
    return doSomething(config, cookies);
  }

  return submitAction;
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function buildAction(config) {
          const cookies = getCookies();

          const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction").bind(null, config);

          return submitAction;
        }

        ;export async function $$hoist_0_submitAction(config, formData) {
            "use server";
            const cookies = formData.get("value");
            return doSomething(config, cookies);
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
        "
      `)
      expect(await testTransform(input, { encode: true }))
        .toMatchInlineSnapshot(`
        "
        function buildAction(config) {
          const cookies = getCookies();

          const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction").bind(null, __enc([config]));

          return submitAction;
        }

        ;export async function $$hoist_0_submitAction($$hoist_encoded, formData) {
            const [config] = __dec($$hoist_encoded);
        "use server";
            const cookies = formData.get("value");
            return doSomething(config, cookies);
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
        "
      `)
    })

    it('const shadows function parameter', async () => {
      // the outer `cookies` binding comes from a function parameter, not a
      // variable declaration — collectOuterNames must handle params too.
      const input = `
function buildAction(cookies) {
  async function submitAction(formData) {
    "use server";
    const cookies = formData.get("value");
    return cookies;
  }

  return submitAction;
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function buildAction(cookies) {
          const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction");

          return submitAction;
        }

        ;export async function $$hoist_0_submitAction(formData) {
            "use server";
            const cookies = formData.get("value");
            return cookies;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
        "
      `)
    })

    it('destructured local declaration not included in bound args', async () => {
      // `const { cookies } = ...` — the name comes from a destructuring pattern,
      // not a plain Identifier declarator.  Must still be excluded from bindVars.
      const input = `
function buildAction(config) {
  const cookies = getCookies();

  async function submitAction(formData) {
    "use server";
    const { cookies } = parseForm(formData);
    return doSomething(config, cookies);
  }

  return submitAction;
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function buildAction(config) {
          const cookies = getCookies();

          const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction").bind(null, config);

          return submitAction;
        }

        ;export async function $$hoist_0_submitAction(config, formData) {
            "use server";
            const { cookies } = parseForm(formData);
            return doSomething(config, cookies);
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
        "
      `)
    })

    it('inner accessing both outer and own names', async () => {
      const input = `
function outer() {
  const cookies = 0;
  async function action() {
    "use server";
    if (condition) {
      const cookies = 1;  // block-scoped to the if
      process(cookies);
    }
    return cookies;  // refers to OUTER cookies — needs binding
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer() {
          const cookies = 0;
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, cookies);
        }

        ;export async function $$hoist_0_action(cookies) {
            "use server";
            if (condition) {
              const cookies = 1;  // block-scoped to the if
              process(cookies);
            }
            return cookies;  // refers to OUTER cookies — needs binding
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    // TODO: not working
    it('inner has own block then shadows', async () => {
      const input = `
function outer() {
  const cookie = 0;
  async function action() {
    "use server";
    if (cond) {
      const cookie = 1;
      return cookie;  // refers to if-block's cookie
    }
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer() {
          const cookie = 0;
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, cookie);
        }

        ;export async function $$hoist_0_action(cookie) {
            "use server";
            if (cond) {
              const cookie = 1;
              return cookie;  // refers to if-block's cookie
            }
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })
  })

  // TODO: is this supposed to work? probably yes
  it('self-referencing function', async () => {
    const input = `
function Parent() {
  const count = 0;

  async function recurse(n) {
    "use server";
    if (n > 0) return recurse(n - 1);
    return count;
  }

  return recurse;
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      function Parent() {
        const count = 0;

        const recurse = /* #__PURE__ */ $$register($$hoist_0_recurse, "<id>", "$$hoist_0_recurse").bind(null, count, recurse);

        return recurse;
      }

      ;export async function $$hoist_0_recurse(count, recurse, n) {
          "use server";
          if (n > 0) return recurse(n - 1);
          return count;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_recurse, "name", { value: "recurse" });
      "
    `)
  })

  it('no ending new line', async () => {
    const input = `\
export async function test() {
  "use server";
}`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "export const test = /* #__PURE__ */ $$register($$hoist_0_test, "<id>", "$$hoist_0_test");

      ;export async function $$hoist_0_test() {
        "use server";
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_test, "name", { value: "test" });
      "
    `)
  })
})

// TODO: report upstream
// https://github.com/Rich-Harris/periscopic/
describe('periscopic behavior', () => {
  it('re-export confuses scopes', async () => {
    // periscopic bug: `export { x } from "y"` creates a block scope with `x`
    // as a declaration, which shadows the real module-level import.
    // `find_owner` then returns that intermediate scope instead of
    // `analyzed.scope`, causing the hoist algorithm to misidentify `redirect`
    // as a closure variable.  The workaround in hoist.ts strips re-exports
    // before calling analyze.
    const ast = await parseAstAsync(`
export { redirect } from "react-router/rsc";
import { redirect } from "react-router/rsc";

export default () => {
  const f = async () => {
    "use server";
    throw redirect();
  };
}
`)
    const { map, scope: root } = analyze(ast)
    // find the arrow with "use server"
    let serverScope: ReturnType<typeof analyze>['scope'] | undefined
    walk(ast, {
      enter(node) {
        if (
          node.type === 'ArrowFunctionExpression' &&
          node.body.type === 'BlockStatement' &&
          node.body.body.some(
            (s: any) =>
              s.type === 'ExpressionStatement' &&
              s.expression.type === 'Literal' &&
              s.expression.value === 'use server',
          )
        ) {
          serverScope = map.get(node)
        }
      },
    })
    expect(serverScope).toBeDefined()
    expect(serverScope!.references.has('redirect')).toBe(true)
    // find_owner should return the root scope (where the import lives), but
    // instead returns the synthetic block scope periscopic creates for the
    // re-export — this is a periscopic bug.
    const owner = serverScope!.find_owner('redirect')
    expect(owner).not.toBe(root)
    expect(owner).not.toBe(serverScope)
  })

  it('shadowed variable: find_owner misses child block scope', async () => {
    // When a `const` inside a function body shadows an outer name, periscopic
    // puts the declaration in the BlockStatement's scope (a child of the
    // function scope).  `find_owner` walks *up* from the function scope, so it
    // finds the outer declaration instead of the inner one.
    //
    // This is not a periscopic bug — it is correct scope modeling.  The hoist
    // algorithm was using find_owner from the function scope, which cannot see
    // declarations in child (block) scopes.
    const ast = await parseAstAsync(`
function outer() {
  const cookies = getCookies();
  async function inner(formData) {
    "use server";
    const cookies = formData.get("value");
    return cookies;
  }
}
`)
    const { map, scope: root } = analyze(ast)
    // find the inner function and its body block scope
    let innerFnScope: ReturnType<typeof analyze>['scope'] | undefined
    let innerBlockScope: ReturnType<typeof analyze>['scope'] | undefined
    walk(ast, {
      enter(node) {
        if (
          node.type === 'FunctionDeclaration' &&
          (node as any).id?.name === 'inner'
        ) {
          innerFnScope = map.get(node)
        }
        if (
          node.type === 'BlockStatement' &&
          node.body.some(
            (s: any) =>
              s.type === 'ExpressionStatement' &&
              s.expression.type === 'Literal' &&
              s.expression.value === 'use server',
          )
        ) {
          innerBlockScope = map.get(node)
        }
      },
    })
    expect(innerFnScope).toBeDefined()
    expect(innerBlockScope).toBeDefined()

    // periscopic correctly declares `cookies` in the block scope (child of function scope)
    expect(innerBlockScope!.declarations.has('cookies')).toBe(true)
    // the function scope does NOT have `cookies` — only `formData` (param)
    expect(innerFnScope!.declarations.has('cookies')).toBe(false)
    expect(innerFnScope!.declarations.has('formData')).toBe(true)

    // `cookies` propagates up as a reference through all ancestor scopes
    expect(innerFnScope!.references.has('cookies')).toBe(true)

    // find_owner from function scope walks UP and finds the OUTER `cookies`,
    // not the inner one (which is in a child block scope, unreachable by walking up)
    const ownerFromFnScope = innerFnScope!.find_owner('cookies')
    expect(ownerFromFnScope).not.toBe(innerFnScope)
    expect(ownerFromFnScope).not.toBe(innerBlockScope)
    expect(ownerFromFnScope).not.toBe(root)

    // find_owner from block scope correctly finds the INNER `cookies`
    const ownerFromBlockScope = innerBlockScope!.find_owner('cookies')
    expect(ownerFromBlockScope).toBe(innerBlockScope)
  })
})
