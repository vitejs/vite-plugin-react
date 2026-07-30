import { describe, expect, test } from 'vitest'
import { defaultCodeFilter } from './reactCompilerPreset'

describe('defaultCodeFilter', () => {
  const cases: Record<string, [code: string, expected: boolean]> = {
    directive: ['"use memo";', true],

    'component declaration': ['function App() { return <></> }', true],
    'component declaration with types': [
      'function App(): Type { return <></> }',
      true,
    ],
    'component arrow expression': [
      'const MyComponent = () => { return <></> }',
      true,
    ],
    'component arrow expression with types (1)': [
      'const MyComponent = (): Type => { return <></> }',
      true,
    ],
    'component arrow expression with types (2)': [
      'const MyComponent: Type = () => { return <></> }',
      true,
    ],
    'component arrow expression with types (3)': [
      'const MyComponent: SomeComplexType<Generic, number> = () => { return <></> }',
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
    'component function expression with types (1)': [
      'const MyComponent = function(): Type { return <></> }',
      true,
    ],
    'component function expression with types (2)': [
      'const MyComponent: Type = function() { return <></> }',
      true,
    ],
    'component function expression with types (3)': [
      'const MyComponent: SomeComplexType<Generic, number> = function() { return <></> }',
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
    'exported component declaration with types': [
      'export default function Page(): Type { return <></> }',
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
    'lowercase use prefix': ['const useful = true', false],

    // these are false positives
    // it is better to have false positives than false negatives,
    // because false negatives will cause those files to not be processed by the react compiler
    'false positive: hook reference (1)': ['(0,useState)()', true],
    'false positive: hook reference (2)': ['[useState][0]()', true],
    'false positive: hook reference (3)': ['useState;s()', true],
    'false positive: hook reference (4)': ['useState,s()', true],
    'false positive: hook property': ['const obj = { useState: 1 }', true],
    'false positive: component property': ['const obj = { Foo: 1 }', true],
    // https://github.com/vitejs/vite-plugin-react/issues/1349
    'false positive: long component name': ['A'.repeat(50_000), true],
  }

  for (const [name, [code, expected]] of Object.entries(cases)) {
    test(name, () => {
      expect(defaultCodeFilter.test(code)).toBe(expected)
    })
  }
})
