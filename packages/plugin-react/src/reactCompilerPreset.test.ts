import { describe, expect, test } from 'vitest'
import { defaultCodeFilter } from './reactCompilerPreset'

describe('defaultCodeFilter', () => {
  const cases: Record<string, [code: string, expected: boolean]> = {
    directive: ['"use memo";', true],

    'component declaration': ['function App() { return <></> }', true],
    'component arrow expression': [
      'const MyComponent = () => { return <></> }',
      true,
    ],
    'component arrow expressions': [
      'const a = 0, MyComponent = () => { return <></> }',
      true,
    ],
    'component arrow expressions (let)': [
      'let a = 0, MyComponent = () => { return <></> }',
      true,
    ],
    'component function expression': [
      'const MyComponent = function() { return <></> }',
      true,
    ],
    'component function expression (let)': [
      'let MyComponent = function() { return <></> }',
      true,
    ],
    'component function expression (var)': [
      'var MyComponent = function() { return <></> }',
      true,
    ],
    'exported component declaration': [
      'export default function Page() { return <></> }',
      true,
    ],
    'component assignment': [
      'let MyComponent; MyComponent = function() { return <></> }',
      true,
    ],
    'component default declaration': [
      'const { MyComponent = function() { return <></> } } = {}',
      true,
    ],
    'component default assignment': [
      'let MyComponent; ({ MyComponent = function() { return <></> } }) = {}',
      true,
    ],
    'component property function expression': [
      'const components = { MyComponent: function() { return <></> } }',
      true,
    ],
    'component property arrow function expression': [
      'const components = { MyComponent: () => <></> }',
      true,
    ],
    'component method': [
      'const components = { MyComponent() { return <></> } }',
      true,
    ],

    'hook declaration': ['function useEffect() { return <></> }', true],
    'hook arrow expression': ['const useMyHook = () => { return <></> }', true],
    'hook function expression': [
      'const useMyHook = function() { return <></> }',
      true,
    ],
    'hook with digit': ['function use0() { return <></> }', true],
    'hook using hooks': [
      'function useMyHook() { return useOtherHook() }',
      true,
    ],
    'hook using nested hooks': [
      'function useMyHook() { return Foo.useOtherHook() }',
      true,
    ],

    'React.forwardRef': ['React.forwardRef(() => <></>)', true],
    'React.memo': ['React.memo(() => <></>)', true],
    forwardRef: [
      'import { forwardRef } from "react"; forwardRef(() => <></>)',
      true,
    ],
    memo: ['import { memo } from "react"; memo(() => <></>)', true],

    'edge case: memo callback with hooks': [
      `import React, { useState } from "react";
import { jsx } from "react/jsx-runtime"

export const components = {
  A: React.memo(() => {
    const [state, setState] = useState(0);

    return jsx("div", { children: state })
  })
}`,
      true,
    ],
    'edge case: memo without namespace': [
      `import { memo, useState } from "react";

export default memo(() => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>
})`,
      true,
    ],
    'edge case: memo without namespace from re-export': [
      `import { memo, useState } from "my-react";

export default memo(() => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>
})`,
      true,
    ],

    'simple variable': ['const foo = 1', false],
    'lowercase function': ['function bar() {}', false],
    'lowercase arrow function': ['let baz = () => {}', false],
    'non assignments (1)': ['(0,useState)()', false],
    'non assignments (2)': ['[useState][0]()', false],
    'non assignments (3)': ['useState;s()', false],
    'non assignments (4)': ['useState,s()', false],
    'object without methods (1)': ['const obj = { useState: 1 }', false],
    'object without methods (2)': ['const obj = { Foo: 1 }', false],
  }

  for (const [name, [code, expected]] of Object.entries(cases)) {
    test(name, () => {
      expect(defaultCodeFilter.test(code)).toBe(expected)
    })
  }
})
