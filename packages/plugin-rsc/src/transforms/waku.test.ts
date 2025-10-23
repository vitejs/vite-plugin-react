import { transformDirectiveProxyExport } from './proxy-export'
import { transformServerActionServer } from './server-action'
import { debugSourceMap } from './test-utils'
import { parseAstAsync } from 'vite'
import { describe, expect, test } from 'vitest'

// copied from
// https://github.com/wakujs/waku/blob/55cc5fb3c74b1cd9fa5dac5b20b8626c4d5043ff/packages/waku/tests/vite-plugin-rsc-transform-internals.test.ts

async function testDirectiveTransform(input: string, directive: string) {
  const ast = await parseAstAsync(input)
  const result = transformDirectiveProxyExport(ast, {
    directive,
    code: input,
    runtime: (name) =>
      `$runtime(${JSON.stringify('<id>#' + name)}, ${JSON.stringify(name)})`,
    keep: directive === 'use client',
  })

  if (!result || !result.output.hasChanged()) {
    return
  }

  if (process.env['DEBUG_SOURCEMAP']) {
    await debugSourceMap(result.output)
  }

  return result.output.toString()
}

describe('internal transform function for server environment', () => {
  async function testTransform(input: string) {
    const ast = await parseAstAsync(input)
    const result = transformServerActionServer(input, ast, {
      runtime: (value, name) =>
        `$runtime(${value}, "<id>", ${JSON.stringify(name)})`,
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

  test('top-level use client', async () => {
    const input = `
'use client';

import { Component, createContext, useContext, memo } from 'react';
import { atom } from 'jotai/vanilla';
import { unstable_allowServer as allowServer } from 'waku/client';

const initialCount = 1;
const TWO = 2;
function double (x) {
  return x * TWO;
}
export const countAtom = allowServer(atom(double(initialCount)));

export const Empty = () => null;

function Private() {
  return "Secret";
}
const SecretComponent = () => "Secret";
const SecretFunction = (n) => 'Secret' + n;

export function Greet({ name }) {
  return "Hello " + name;
}

export class MyComponent extends Component {
  render() {
    return "Class Component";
  }
}

const MyContext = createContext();

export const useMyContext = () => useContext(MyContext);

const MyProvider = memo(MyContext);

export const NAME = 'World';

export default function App() {
  return "Hello World";
}
`
    expect(await testDirectiveTransform(input, 'use client'))
      .toMatchInlineSnapshot(`
      "
      'use client';

      import { Component, createContext, useContext, memo } from 'react';
      import { atom } from 'jotai/vanilla';
      import { unstable_allowServer as allowServer } from 'waku/client';

      const initialCount = 1;
      const TWO = 2;
      function double (x) {
        return x * TWO;
      }
      export const countAtom = /* #__PURE__ */ $runtime("<id>#countAtom", "countAtom");

      export const Empty = /* #__PURE__ */ $runtime("<id>#Empty", "Empty");

      function Private() {
        return "Secret";
      }
      const SecretComponent = () => "Secret";
      const SecretFunction = (n) => 'Secret' + n;

      export const Greet = /* #__PURE__ */ $runtime("<id>#Greet", "Greet");


      export const MyComponent = /* #__PURE__ */ $runtime("<id>#MyComponent", "MyComponent");


      const MyContext = createContext();

      export const useMyContext = /* #__PURE__ */ $runtime("<id>#useMyContext", "useMyContext");

      const MyProvider = memo(MyContext);

      export const NAME = /* #__PURE__ */ $runtime("<id>#NAME", "NAME");

      export default /* #__PURE__ */ $runtime("<id>#default", "default");

      "
    `)
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
      log = /* #__PURE__ */ $runtime(log, "<id>", "log");
      export { log };
      greet = /* #__PURE__ */ $runtime(greet, "<id>", "greet");
      export { greet };
      ;
      const $$wrap_$$default = /* #__PURE__ */ $runtime($$default, "<id>", "default");
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
          foo: /* #__PURE__ */ $runtime($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function"),
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
      exportedAction = /* #__PURE__ */ $runtime(exportedAction, "<id>", "exportedAction");
      export { exportedAction };
      ;
      const $$wrap_$$default = /* #__PURE__ */ $runtime($$default, "<id>", "default");
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
        const log = /* #__PURE__ */ $runtime($$hoist_0_log, "<id>", "$$hoist_0_log").bind(null, a);
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
        const log = /* #__PURE__ */ $runtime($$hoist_0_log, "<id>", "$$hoist_0_log").bind(null, rand);
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
        const log = /* #__PURE__ */ $runtime($$hoist_0_log, "<id>", "$$hoist_0_log");
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
        return /* #__PURE__ */ $runtime($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function");
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
        log: /* #__PURE__ */ $runtime($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function"),
      };

      const log2 = /* #__PURE__ */ $runtime($$hoist_1_log2, "<id>", "$$hoist_1_log2");

      const log3 = /* #__PURE__ */ $runtime($$hoist_2_log3, "<id>", "$$hoist_2_log3")

      const log4 = /* #__PURE__ */ $runtime($$hoist_3_log4, "<id>", "$$hoist_3_log4");

      const defaultFn = /* #__PURE__ */ $runtime($$hoist_4_defaultFn, "<id>", "$$hoist_4_defaultFn")

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
  test('no transformation', async () => {
    const input = `
export const log = (mesg) => {
  console.log(mesg);
};
`
    expect(await testDirectiveTransform(input, 'use server')).toBeUndefined()
  })

  test('top-level use server', async () => {
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
    expect(await testDirectiveTransform(input, 'use server'))
      .toMatchInlineSnapshot(`
      "




      export const log1 = /* #__PURE__ */ $runtime("<id>#log1", "log1");


      export const log2 = /* #__PURE__ */ $runtime("<id>#log2", "log2");


      export const log3 = /* #__PURE__ */ $runtime("<id>#log3", "log3");


      export default /* #__PURE__ */ $runtime("<id>#default", "default");

      "
    `)
  })

  test('top-level use server for SSR', async () => {
    const input = `
'use server';

import { getEnv } from 'waku';

const privateFunction = () => getEnv('SECRET');

export async function log(mesg) {
  console.log(mesg);
}
`
    expect(await testDirectiveTransform(input, 'use server'))
      .toMatchInlineSnapshot(`
      "






      export const log = /* #__PURE__ */ $runtime("<id>#log", "log");

      "
    `)
  })
})
