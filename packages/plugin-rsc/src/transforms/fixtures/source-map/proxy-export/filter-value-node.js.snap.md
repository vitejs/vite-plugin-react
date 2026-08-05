## Input

```js
'use cache'

export const cached = async () => {},
  objectValue = {},
  arrayValue = []
export const unknown = createCached()
export const primitive = 0
```

## proxy-export-filtered

**Status:** transformed

**References:** cached, unknown, primitive

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjI2AAoKZXhwb3J0IGNvbnN0IGNhY2hlZCA9IC8qICNfX1BVUkVfXyAqLyBjcmVhdGVTZXJ2ZXJSZWZlcmVuY2UoImNhY2hlZCIpOwoKZXhwb3J0IGNvbnN0IHVua25vd24gPSAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJ1bmtub3duIik7CgpleHBvcnQgY29uc3QgcHJpbWl0aXZlID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgicHJpbWl0aXZlIik7CgoyNTYAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIGNhY2hlJ1xuXG5leHBvcnQgY29uc3QgY2FjaGVkID0gYXN5bmMgKCkgPT4ge30sXG4gIG9iamVjdFZhbHVlID0ge30sXG4gIGFycmF5VmFsdWUgPSBbXVxuZXhwb3J0IGNvbnN0IHVua25vd24gPSBjcmVhdGVDYWNoZWQoKVxuZXhwb3J0IGNvbnN0IHByaW1pdGl2ZSA9IDBcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOztBQUdBOztBQUNBOzsifQ==)

```js


export const cached = /* #__PURE__ */ createServerReference("cached");

export const unknown = /* #__PURE__ */ createServerReference("unknown");

export const primitive = /* #__PURE__ */ createServerReference("primitive");

```
