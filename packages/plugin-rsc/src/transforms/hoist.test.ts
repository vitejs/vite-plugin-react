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

  // ok: should not bind
  it('shadowing local if over local', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    if (true) {
      const value = 0;
      return value;
    }
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          if (true) {
            const value = 0;
            return value;
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // ok: should not bind
  it('shadowing local body over local', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    const value = 0;
    return value;
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          const value = 0;
          return value;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // ok: should not bind
  it('shadowing local body and if over local', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    if (true) {
      const value = 0;
      return value;
    }
    const value = 0;
    return value;
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          if (true) {
            const value = 0;
            return value;
          }
          const value = 0;
          return value;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // ok: should bind
  it('shadowing partial local over local', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    if (true) {
      const value = 1;
      return value;
    }
    return value;
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value);
      }

      ;export async function $$hoist_0_action(value) {
          "use server";
          if (true) {
            const value = 1;
            return value;
          }
          return value;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // ok: should not bind
  it('shadowing local over global', async () => {
    const input = `\
const value = 0;
function outer() {
  async function action() {
    "use server";
    if (true) {
      const value = 1;
      return value;
    }
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const value = 0;
      function outer() {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          if (true) {
            const value = 1;
            return value;
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // ok: should not bind
  it('shadowing partial local over global', async () => {
    const input = `\
const value = 0;
function outer() {
  async function action() {
    "use server";
    if (true) {
      const value = 1;
      return value;
    }
    return value;
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const value = 0;
      function outer() {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          if (true) {
            const value = 1;
            return value;
          }
          return value;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // ok: should not bind
  it('shadowing local over local over global', async () => {
    const input = `\
const value = 0;
function outer() {
  const value = 0;
  async function action() {
    "use server";
    if (true) {
      const value = 1;
      return value;
    }
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const value = 0;
      function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          if (true) {
            const value = 1;
            return value;
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // ok: should bind
  it('shadowing partial local over local over global', async () => {
    const input = `\
const value = 0;
function outer() {
  const value = 0;
  async function action() {
    "use server";
    if (true) {
      const value = 1;
      return value;
    }
    return value;
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "const value = 0;
      function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value);
      }

      ;export async function $$hoist_0_action(value) {
          "use server";
          if (true) {
            const value = 1;
            return value;
          }
          return value;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  it('deeper', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    if (true) {
      return value;
    }
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value);
      }

      ;export async function $$hoist_0_action(value) {
          "use server";
          if (true) {
            return value;
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  it('var hoisting', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    console.log({ value })
    var value = 1;
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          console.log({ value })
          var value = 1;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  it('var hoisting block', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    console.log({ value })
    {
      var value = 1;
    }
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          console.log({ value })
          {
            var value = 1;
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  it('function hoisting', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    console.log({ value })
    function value() {}
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
      }

      ;export async function $$hoist_0_action() {
          "use server";
          console.log({ value })
          function value() {}
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  it('function hoisting block', async () => {
    const input = `\
function outer() {
  const value = 0;
  async function action() {
    "use server";
    console.log({ value })
    {
      function value() {}
    }
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const value = 0;
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value);
      }

      ;export async function $$hoist_0_action(value) {
          "use server";
          console.log({ value })
          {
            function value() {}
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // TODO: follow up if this edge case matters.
  // Next.js's closure-collection logic suggests recursive self-reference is also
  // treated as a captured outer name, but we didn't find a direct fixture proving the
  // final emitted shape. Our current output self-binds `action`, which is suspicious
  // enough to leave as an intentionally-unverified edge case.
  it('recursion', async () => {
    const input = `\
function outer() {
  async function action() {
    "use server";
    if (false) {
      return action();
    }
    return 0;
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, action);
      }

      ;export async function $$hoist_0_action(action) {
          "use server";
          if (false) {
            return action();
          }
          return 0;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  it('computed destructuring key in body', async () => {
    const input = `\
function outer() {
  const key = 'value'
  async function action(data) {
    "use server";
    const { [key]: val } = data
    return val
  }
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "function outer() {
        const key = 'value'
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, key);
      }

      ;export async function $$hoist_0_action(key, data) {
          "use server";
          const { [key]: val } = data
          return val
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
  })

  // Edge case: writing to a captured local only mutates the hoisted action's bound
  // parameter copy, not the original outer binding. Next.js appears to have the same
  // effective behavior, although via `$$ACTION_ARG_n` rewriting instead of plain params.
  it('assignment', async () => {
    const input = `
function Counter() {
  let local = 0;

  async function updateLocal() {
    "use server";
    local = 1;
  }

  return "something";
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      function Counter() {
        let local = 0;

        const updateLocal = /* #__PURE__ */ $$register($$hoist_0_updateLocal, "<id>", "$$hoist_0_updateLocal").bind(null, local);

        return "something";
      }

      ;export async function $$hoist_0_updateLocal(local) {
          "use server";
          local = 1;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_updateLocal, "name", { value: "updateLocal" });
      "
    `)
  })

  // Same framing as plain assignment above: mutating a captured local is local to the
  // hoisted invocation copy. This is probably an unintended edge case rather than a
  // behavior worth matching exactly.
  it('increment', async () => {
    const input = `
function Counter() {
  let local = 0;

  async function updateLocal() {
    "use server";
    local++;
  }

  return "something";
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      function Counter() {
        let local = 0;

        const updateLocal = /* #__PURE__ */ $$register($$hoist_0_updateLocal, "<id>", "$$hoist_0_updateLocal").bind(null, local);

        return "something";
      }

      ;export async function $$hoist_0_updateLocal(local) {
          "use server";
          local++;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_updateLocal, "name", { value: "updateLocal" });
      "
    `)
  })
})
