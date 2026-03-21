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
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, key, config);
        }

        ;export async function $$hoist_0_action(key, config, formData) {
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
          const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, user, config.cookiePrefix);
        }

        ;export async function $$hoist_0_action(user, $$bind_0_config_cookiePrefix, formData) {
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

    it('shadowed object with member access falls back to binding the whole variable', async () => {
      const input = `
        function outer(config) {
          async function action(formData) {
            "use server";
            const oldHost = config.db.host;
            if (condition) {
              const config = { db: { host: "test" } }; // shadows outer config
              return config.db.host; // should refer to inner config, not outer
            }
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
                    const oldHost = config.db.host;
                    if (condition) {
                      const config = { db: { host: "test" } }; // shadows outer config
                      return config.db.host; // should refer to inner config, not outer
                    }
                  };
        /* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
        "
      `)
    })
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
