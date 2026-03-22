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
    it('var at top of body shadows outer variable', async () => {
      // `var` is function-scoped, so `var cookies` at the top of the action body
      // correctly shadows the outer `cookies` — it must NOT be bound.
      const input = `
function buildAction(config) {
  const cookies = getCookies();

  async function submitAction(formData) {
    "use server";
    var cookies = formData.get("value");
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
            var cookies = formData.get("value");
            return doSomething(config, cookies);
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
        "
      `)
    })

    it('var inside a nested block shadows outer variable', async () => {
      // `var` inside an if-block is still function-scoped in JS, so it shadows
      // the outer `cookies` across the entire action body — must NOT be bound.
      const input = `
function buildAction(config) {
  const cookies = getCookies();

  async function submitAction(formData) {
    "use server";
    if (condition) {
      var cookies = formData.get("value");
    }
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
            if (condition) {
              var cookies = formData.get("value");
            }
            return doSomething(config, cookies);
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
        "
      `)
    })

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
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action");
        }

        ;export async function $$hoist_0_action() {
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

  describe('binding member expressions', () => {
    it('member access only binds the member expression, not the root variable', async () => {
      const input = `
function MyForm({ config }) {
  async function submitAction(formData) {
    "use server";

    const prefix = config.cookiePrefix; // ONLY member access, never bare config
    console.log(config.cookiePrefix);
    return config.cookiePrefix;
  }

  return "test";
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function MyForm({ config }) {
          const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction").bind(null, config.cookiePrefix);

          return "test";
        }

        ;export async function $$hoist_0_submitAction($$bind_0_config_cookiePrefix, formData) {
            "use server";

            const prefix = $$bind_0_config_cookiePrefix; // ONLY member access, never bare config
            console.log($$bind_0_config_cookiePrefix);
            return $$bind_0_config_cookiePrefix;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
        "
      `)
    })

    it('multiple different props from same object are each bound separately', async () => {
      const input = `
function outer(config) {
  async function action(formData) {
    "use server";
    return config.host + config.port;
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.host, config.port);
        }

        ;export async function $$hoist_0_action($$bind_0_config_host, $$bind_1_config_port, formData) {
            "use server";
            return $$bind_0_config_host + $$bind_1_config_port;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('bare use of var falls back to binding the whole variable', async () => {
      const input = `
function outer(config) {
  async function action(formData) {
    "use server";
    const prefix = config.cookiePrefix;
    return doSomething(config);
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config);
        }

        ;export async function $$hoist_0_action(config, formData) {
            "use server";
            const prefix = config.cookiePrefix;
            return doSomething(config);
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('computed member access falls back to binding the whole variable', async () => {
      const input = `
function outer(config, key) {
  async function action(formData) {
    "use server";
    return config[key];
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config, key) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config, key);
        }

        ;export async function $$hoist_0_action(config, key, formData) {
            "use server";
            return config[key];
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('mixed vars: one member-only, one bare', async () => {
      const input = `
function outer(config, user) {
  async function action(formData) {
    "use server";
    return config.cookiePrefix + user;
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config, user) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.cookiePrefix, user);
        }

        ;export async function $$hoist_0_action($$bind_0_config_cookiePrefix, user, formData) {
            "use server";
            return $$bind_0_config_cookiePrefix + user;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('multi-level member access binds the full chain', async () => {
      const input = `
function outer(config) {
  async function action(formData) {
    "use server";
    return config.db.host;
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.db.host);
        }

        ;export async function $$hoist_0_action($$bind_0_config_db_host, formData) {
            "use server";
            return $$bind_0_config_db_host;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('shorter path subsumes longer path from same root', async () => {
      // config.cookies is used bare AND config.cookies.names is used — the
      // shorter path subsumes the longer one: only config.cookies is bound,
      // and config.cookies.names is rewritten to $$bind_0_config_cookies.names
      const input = `
function outer(config) {
  async function action(formData) {
    "use server";
    const list = config.cookies.names;
    return config.cookies;
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.cookies);
        }

        ;export async function $$hoist_0_action($$bind_0_config_cookies, formData) {
            "use server";
            const list = $$bind_0_config_cookies.names;
            return $$bind_0_config_cookies;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('longer paths without an observed shorter prefix are kept separate', async () => {
      // config.cookies.names and config.cookies.value share a common ancestor
      // (config.cookies) but that ancestor was never directly used in the source,
      // so we must NOT synthesise it — each path is bound independently.
      const input = `
function outer(config) {
  async function action(formData) {
    "use server";
    return config.cookies.names + config.cookies.value;
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.cookies.names, config.cookies.value);
        }

        ;export async function $$hoist_0_action($$bind_0_config_cookies_names, $$bind_1_config_cookies_value, formData) {
            "use server";
            return $$bind_0_config_cookies_names + $$bind_1_config_cookies_value;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('observed shorter prefix subsumes longer paths from same root', async () => {
      // config.cookies IS directly used, so it subsumes config.cookies.names
      const input = `
function outer(config) {
  async function action(formData) {
    "use server";
    return config.cookies.names + config.cookies.value + config.cookies;
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.cookies);
        }

        ;export async function $$hoist_0_action($$bind_0_config_cookies, formData) {
            "use server";
            return $$bind_0_config_cookies.names + $$bind_0_config_cookies.value + $$bind_0_config_cookies;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('independent sibling paths are not deduplicated', async () => {
      // config.cookies and config.db share the root but neither is a prefix of
      // the other — they must remain as separate bound params
      const input = `
function outer(config) {
  async function action(formData) {
    "use server";
    return config.cookies + config.db;
  }
}
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
        function outer(config) {
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.cookies, config.db);
        }

        ;export async function $$hoist_0_action($$bind_0_config_cookies, $$bind_1_config_db, formData) {
            "use server";
            return $$bind_0_config_cookies + $$bind_1_config_db;
          };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })

    it('shadowed object: outer member path is bound, inner shadowed occurrence is left alone', async () => {
      // config.db.host on line A refers to the outer `config` — it is bound and
      // rewritten to $$bind_0_config_db_host.
      // config.db.host on line B is inside a block where `const config` shadows
      // the outer one — isInsideFunctionBody correctly skips it during the walk,
      // so it is never recorded as a free-var usage and is left unrewritten.
      // The two occurrences look identical in source but resolve to different
      // bindings, and the transform handles them correctly without falling back
      // to binding the whole bare `config`.
      const input = `
        function outer(config) {
          async function action(formData) {
            "use server";
            const oldHost = config.db.host;
            if (condition) {
              const config = { db: { host: "test" } }; // shadows outer config
              return config.db.host; // should refer to inner config, not outer
            }
            const oldHost2 = config.db.host;
          }
        }
`
      expect(await testTransform(input)).toMatchInlineSnapshot(`
        "
                function outer(config) {
                  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.db.host);
                }

        ;export async function $$hoist_0_action($$bind_0_config_db_host, formData) {
                    "use server";
                    const oldHost = $$bind_0_config_db_host;
                    if (condition) {
                      const config = { db: { host: "test" } }; // shadows outer config
                      return config.db.host; // should refer to inner config, not outer
                    }
                    const oldHost2 = $$bind_0_config_db_host;
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

        const recurse = /* #__PURE__ */ $$register($$hoist_0_recurse, "<id>", "$$hoist_0_recurse").bind(null, count);

        return recurse;
      }

      ;export async function $$hoist_0_recurse(count, n) {
          "use server";
      const recurse = (...$$args) => $$hoist_0_recurse(count, ...$$args);
          if (n > 0) return recurse(n - 1);
          return count;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_recurse, "name", { value: "recurse" });
      "
    `)

    // With encryption the hoisted function receives a single opaque
    // `$$hoist_encoded` argument.  The self-referencing alias must forward
    // that same encoded value directly rather than re-encoding the already-
    // decoded locals.
    expect(await testTransform(input, { encode: true })).toMatchInlineSnapshot(`
      "
      function Parent() {
        const count = 0;

        const recurse = /* #__PURE__ */ $$register($$hoist_0_recurse, "<id>", "$$hoist_0_recurse").bind(null, __enc([count]));

        return recurse;
      }

      ;export async function $$hoist_0_recurse($$hoist_encoded, n) {
          const [count] = __dec($$hoist_encoded);
      "use server";
      const recurse = (...$$args) => $$hoist_0_recurse($$hoist_encoded, ...$$args);
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

  describe('fixes for periscopic bugs', () => {
    it('re-export of an import is not treated as a closure variable', async () => {
      // periscopic bug: `export { redirect } from "y"` created a synthetic block
      // scope with `redirect` as a declaration, shadowing the real module-level
      // import.  `find_owner` returned that intermediate scope instead of the
      // root scope, so the hoist algorithm mistakenly treated `redirect` as a
      // closure variable and emitted `.bind(null, redirect)`.
      //
      // Our analyzer skips re-export declarations entirely — no synthetic scope,
      // no spurious declaration — so `redirect` is correctly identified as a
      // module-level import and emitted with no .bind() args.
      expect(
        await testTransform(`
export { redirect } from "react-router/rsc";
import { redirect } from "react-router/rsc";

export default () => {
  const f = async () => {
    "use server";
    throw redirect();
  };
}
`),
      ).toMatchInlineSnapshot(`
      "
      export { redirect } from "react-router/rsc";
      import { redirect } from "react-router/rsc";

      export default () => {
        const f = /* #__PURE__ */ $$register($$hoist_0_f, "<id>", "$$hoist_0_f");
      }

      ;export async function $$hoist_0_f() {
          "use server";
          throw redirect();
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_f, "name", { value: "f" });
      "
    `)
    })

    it('const inside function body that shadows an outer name is not bound', async () => {
      // periscopic bug: `const cookies` inside the function body is placed in the
      // BlockStatement's scope (a child of the function scope).  The hoist
      // algorithm called `find_owner` from the function scope, which walks *up*
      // the scope chain and cannot see child block scopes — so it found the
      // *outer* `cookies` and incorrectly emitted `.bind(null, cookies)`, causing
      // a duplicate `const cookies` declaration at runtime (a SyntaxError).
      //
      // Our analyzer starts the owner lookup from the innermost scope at the
      // point of each identifier use, so the inner `const cookies` correctly
      // shadows the outer one and is not bound.
      expect(
        await testTransform(`
function outer() {
  const cookies = getCookies();
  async function inner(formData) {
    "use server";
    const cookies = formData.get("value");
    return cookies;
  }
}
`),
      ).toMatchInlineSnapshot(`
      "
      function outer() {
        const cookies = getCookies();
        const inner = /* #__PURE__ */ $$register($$hoist_0_inner, "<id>", "$$hoist_0_inner");
      }

      ;export async function $$hoist_0_inner(formData) {
          "use server";
          const cookies = formData.get("value");
          return cookies;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_inner, "name", { value: "inner" });
      "
    `)
    })
  })

  describe('additional scoping edge cases', () => {
    it('for-of loop variable is not bound, but the iterable is', async () => {
      // `item` is declared by the for-of statement itself (block-scoped to the
      // loop) — it must not appear in .bind() args.  `outerList` is a free
      // variable from the enclosing scope and must be bound.
      expect(
        await testTransform(`
function outer(outerList) {
  async function action() {
    "use server";
    for (const item of outerList) {
      process(item);
    }
  }
}
`),
      ).toMatchInlineSnapshot(`
      "
      function outer(outerList) {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, outerList);
      }

      ;export async function $$hoist_0_action(outerList) {
          "use server";
          for (const item of outerList) {
            process(item);
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
    })

    it('catch binding shadows outer name and is not bound', async () => {
      // `err` is declared as a catch binding.  Even if an outer `err` exists,
      // the catch binding shadows it inside the catch block — it must not be
      // included in .bind() args.
      expect(
        await testTransform(`
function outer(config, err) {
  async function action() {
    "use server";
    try {
      return config.value;
    } catch (err) {
      return err.message;
    }
  }
}
`),
      ).toMatchInlineSnapshot(`
      "
      function outer(config, err) {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.value);
      }

      ;export async function $$hoist_0_action($$bind_0_config_value) {
          "use server";
          try {
            return $$bind_0_config_value;
          } catch (err) {
            return err.message;
          }
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
    })

    it('named function expression self-reference gets an alias', async () => {
      // `self` is declared in the named function expression's own scope —
      // it is not a free variable and must not appear in .bind() args.
      // However, the hoisted function is renamed to $$hoist_0_action, so
      // the `self` reference inside the body would break.  Just like the
      // FunctionDeclaration self-referencing case, an alias is emitted
      // inside the hoisted function body so that `self` resolves correctly.
      expect(
        await testTransform(`
function outer(count) {
  const action = async function self(n) {
    "use server";
    if (n > 0) return self(n - 1);
    return count;
  };
}
`),
      ).toMatchInlineSnapshot(`
      "
      function outer(count) {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, count);
      }

      ;export async function $$hoist_0_action(count, n) {
          "use server";
      const self = (...$$args) => $$hoist_0_action(count, ...$$args);
          if (n > 0) return self(n - 1);
          return count;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
    })

    it('class declaration inside body is not bound', async () => {
      // `Helper` is declared with `class` inside the action body — it belongs
      // to the action itself and must not appear in .bind() args.
      expect(
        await testTransform(`
function outer(config) {
  async function action() {
    "use server";
    class Helper {
      run() { return config.value; }
    }
    return new Helper().run();
  }
}
`),
      ).toMatchInlineSnapshot(`
      "
      function outer(config) {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, config.value);
      }

      ;export async function $$hoist_0_action($$bind_0_config_value) {
          "use server";
          class Helper {
            run() { return $$bind_0_config_value; }
          }
          return new Helper().run();
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
    })

    it('outer variable in destructured param default is bound', async () => {
      // `outerDefault` is referenced as a default value inside a destructured
      // parameter.  Parameter defaults are evaluated in the caller's scope, not
      // the function's own scope, so `outerDefault` is a free variable that must
      // be bound.  Without this fix the hoisted function would reference an
      // undefined `outerDefault` at the module level.
      expect(
        await testTransform(`
function outer(outerDefault) {
  async function action({ x = outerDefault } = {}) {
    "use server";
    return x;
  }
}
`),
      ).toMatchInlineSnapshot(`
      "
      function outer(outerDefault) {
        const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, outerDefault);
      }

      ;export async function $$hoist_0_action(outerDefault, { x = outerDefault } = {}) {
          "use server";
          return x;
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
      "
    `)
    })
  })
})
