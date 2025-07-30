import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'
import { transformServerActionServer } from './server-action'
import { debugSourceMap } from './test-utils'

describe('internal transform function for server environment', () => {
  async function testTransform(input: string) {
    const ast = await parseAstAsync(input)
    const result = transformServerActionServer(input, ast, {
      runtime: (value, name) =>
        `$$register(${value}, "<id>", ${JSON.stringify(name)})`,
    })

    if (!('output' in result) || !result.output.hasChanged()) {
      return
    }

    if (process.env['DEBUG_SOURCEMAP']) {
      await debugSourceMap(result.output)
    }

    return result.output.toString()
  }

  test('no transformation', async () => {
    const input = `
export default function App() {
  return "Hello World";
}
`
    expect(await testTransform(input)).toBeUndefined()
  })

  test.skip('top-level use client', () => {
    // This test is skipped since transformServerActionServer only handles server transforms
    // The client transform would be handled by a different function
    // @ts-expect-error - unused in skipped test for documentation
    const input = `
'use client';

import { Component, createContext, useContext, memo } from 'react';
import { atom } from 'jotai/vanilla';
import { unstable_allowServer as allowServer } from 'waku/client';

const initialCount = 1;
const TWO = 2;
function double (x: number) {
  return x * TWO;
}
export const countAtom = allowServer(atom(double(initialCount)));

export const Empty = () => null;

function Private() {
  return "Secret";
}
const SecretComponent = () => <p>Secret</p>;
const SecretFunction = (n: number) => 'Secret' + n;

export function Greet({ name }: { name: string }) {
  return <>Hello {name}</>;
}

export class MyComponent extends Component {
  render() {
    return <p>Class Component</p>;
  }
}

const MyContext = createContext();

export const useMyContext = () => useContext(MyContext);

const MyProvider = memo(MyContext);

export const NAME = 'World';

export default function App() {
  return (
    <MyProvider value="Hello">
      <div>Hello World</div>
    </MyProvider>
  );
}
`
    // Expected output would be registerClientReference calls for all exports
  })

  test('top-level use server', async () => {
    const input = `
'use server';

const privateFunction = () => 'Secret';

export const log = async (mesg) => {
  console.log(mesg);
};

export async function greet(name) {
  return 'Hello ' + name;
}

export default async function() {
  return Date.now();
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      'use server';

      const privateFunction = () => 'Secret';

      let log = async (mesg) => {
        console.log(mesg);
      };

      async function greet(name) {
        return 'Hello ' + name;
      }

      const $$default = async function() {
        return Date.now();
      }
      log = /* #__PURE__ */ $$register(log, "<id>", "log");
      export { log };
      greet = /* #__PURE__ */ $$register(greet, "<id>", "greet");
      export { greet };
      ;
      const $$wrap_$$default = /* #__PURE__ */ $$register($$default, "<id>", "default");
      export { $$wrap_$$default as default };
      "
    `)
  })

  test('server action in object', async () => {
    const input = `
const AI = {
  actions: {
    foo: async () => {
      'use server';
      return 0;
    },
  },
};

export function ServerProvider() {
  return AI;
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      const AI = {
        actions: {
          foo: /* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function"),
        },
      };

      export function ServerProvider() {
        return AI;
      }

      ;export async function $$hoist_0_anonymous_server_function() {
            'use server';
            return 0;
          };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });
      "
    `)
  })

  test('top-level use server and inline use server', async () => {
    const input = `
'use server';

async function innerAction(action, ...args) {
  'use server';
  return await action(...args);
}

function wrapAction(action) {
  return innerAction.bind(null, action);
}

export async function exportedAction() {
  'use server';
  return null;
}

export default async () => null;
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      'use server';

      async function innerAction(action, ...args) {
        'use server';
        return await action(...args);
      }

      function wrapAction(action) {
        return innerAction.bind(null, action);
      }

      async function exportedAction() {
        'use server';
        return null;
      }

      const $$default = async () => null;
      exportedAction = /* #__PURE__ */ $$register(exportedAction, "<id>", "exportedAction");
      export { exportedAction };
      ;
      const $$wrap_$$default = /* #__PURE__ */ $$register($$default, "<id>", "default");
      export { $$wrap_$$default as default };
      "
    `)
  })

  test('inline use server (function declaration)', async () => {
    const input = `
export default function App() {
  const a = 'test';
  async function log(mesg) {
    'use server';
    console.log(mesg, a);
  }
  return log;
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      export default function App() {
        const a = 'test';
        const log = /* #__PURE__ */ $$register($$hoist_0_log, "<id>", "$$hoist_0_log").bind(null, a);
        return log;
      }

      ;export async function $$hoist_0_log(a, mesg) {
          'use server';
          console.log(mesg, a);
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_log, "name", { value: "log" });
      "
    `)
  })

  test('inline use server (const function expression)', async () => {
    const input = `
export default function App() {
  const rand = Math.random();
  const log = async function (mesg) {
    'use server';
    console.log(mesg, rand);
  };
  return log;
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      export default function App() {
        const rand = Math.random();
        const log = /* #__PURE__ */ $$register($$hoist_0_log, "<id>", "$$hoist_0_log").bind(null, rand);
        return log;
      }

      ;export async function $$hoist_0_log(rand, mesg) {
          'use server';
          console.log(mesg, rand);
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_log, "name", { value: "log" });
      "
    `)
  })

  test('inline use server (const arrow function)', async () => {
    const input = `
const now = Date.now();
export default function App() {
  const log = async (mesg) => {
    'use server';
    console.log(mesg, now);
  };
  return log;
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      const now = Date.now();
      export default function App() {
        const log = /* #__PURE__ */ $$register($$hoist_0_log, "<id>", "$$hoist_0_log");
        return log;
      }

      ;export async function $$hoist_0_log(mesg) {
          'use server';
          console.log(mesg, now);
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_log, "name", { value: "log" });
      "
    `)
  })

  test('inline use server (anonymous arrow function)', async () => {
    const input = `
const now = Date.now();
export default function App() {
  return (mesg) => {
    'use server';
    console.log(mesg, now);
  };
}
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      const now = Date.now();
      export default function App() {
        return /* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function");
      }

      ;export function $$hoist_0_anonymous_server_function(mesg) {
          'use server';
          console.log(mesg, now);
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });
      "
    `)
  })

  test('inline use server (various patterns)', async () => {
    const input = `
const actions = {
  log: async (mesg) => {
    'use server';
    console.log(mesg);
  },
};

async function log2 (mesg) {
  'use server';
  console.log(mesg);
}

const log3 = async function(mesg) {
  'use server';
  console.log(mesg);
}

const log4 = async (mesg) => {
  'use server';
  console.log(mesg);
};

const defaultFn = async function(mesg) {
  'use server';
  console.log(mesg);
}

export default defaultFn;
`
    expect(await testTransform(input)).toMatchInlineSnapshot(`
      "
      const actions = {
        log: /* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function"),
      };

      const log2 = /* #__PURE__ */ $$register($$hoist_1_log2, "<id>", "$$hoist_1_log2");

      const log3 = /* #__PURE__ */ $$register($$hoist_2_log3, "<id>", "$$hoist_2_log3")

      const log4 = /* #__PURE__ */ $$register($$hoist_3_log4, "<id>", "$$hoist_3_log4");

      const defaultFn = /* #__PURE__ */ $$register($$hoist_4_defaultFn, "<id>", "$$hoist_4_defaultFn")

      export default defaultFn;

      ;export async function $$hoist_0_anonymous_server_function(mesg) {
          'use server';
          console.log(mesg);
        };
      /* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });

      ;export async function $$hoist_1_log2(mesg) {
        'use server';
        console.log(mesg);
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_1_log2, "name", { value: "log2" });

      ;export async function $$hoist_2_log3(mesg) {
        'use server';
        console.log(mesg);
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_2_log3, "name", { value: "log3" });

      ;export async function $$hoist_3_log4(mesg) {
        'use server';
        console.log(mesg);
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_3_log4, "name", { value: "log4" });

      ;export async function $$hoist_4_defaultFn(mesg) {
        'use server';
        console.log(mesg);
      };
      /* #__PURE__ */ Object.defineProperty($$hoist_4_defaultFn, "name", { value: "defaultFn" });
      "
    `)
  })
})

describe('internal transform function for client environment', () => {
  test.skip('no transformation', () => {
    // @ts-expect-error - unused in skipped test for documentation
    const input = `
export const log = (mesg) => {
  console.log(mesg);
};
`
    // Expected: no transformation for client environment
  })

  test.skip('top-level use server', () => {
    // @ts-expect-error - unused in skipped test for documentation
    const input = `
'use server';

const privateFunction = () => 'Secret';

export const log1 = async function(mesg) {
  console.log(mesg);
}

export const log2 = async (mesg) => {
  console.log(mesg);
};

export async function log3(mesg) {
  console.log(mesg);
}

export default async function log4(mesg) {
  console.log(mesg);
}
`
    // Expected Output: createServerReference calls for each export
  })

  test.skip('top-level use server for SSR', () => {
    // @ts-expect-error - unused in skipped test for documentation
    const input = `
'use server';

import { getEnv } from 'waku';

const privateFunction = () => getEnv('SECRET');

export async function log(mesg) {
  console.log(mesg);
}
`
    // Expected Output: Error-throwing stubs "You cannot call server functions during SSR"
  })
})
