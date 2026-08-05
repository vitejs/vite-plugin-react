## Input

```js
'use server'

export const {
  x,
  y: [z],
} = { x: 0, y: [1] }
```

## proxy-export

**Status:** transformed

**References:** x, z

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTI1AAoKZXhwb3J0IGNvbnN0IHggPSAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJ4Iik7CmV4cG9ydCBjb25zdCB6ID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgieiIpOwoKMTU5AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBjb25zdCB7XG4gIHgsXG4gIHk6IFt6XSxcbn0gPSB7IHg6IDAsIHk6IFsxXSB9XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQTtBQUFBOzsifQ==)

```js


export const x = /* #__PURE__ */ createServerReference("x");
export const z = /* #__PURE__ */ createServerReference("z");

```
