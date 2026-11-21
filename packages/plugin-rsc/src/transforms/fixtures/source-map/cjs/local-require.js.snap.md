## Input

```js
{
  const require = () => {}
  require('test')
}
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#Mjg3AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmV4cG9ydCBjb25zdCBfX2Nqc19tb2R1bGVfcnVubmVyX2dldF9leHBvcnRzID0gKCkgPT4gbW9kdWxlLmV4cG9ydHM7CnsKICBjb25zdCByZXF1aXJlID0gKCkgPT4ge30KICByZXF1aXJlKCd0ZXN0JykKfQoKO19fdml0ZV9zc3JfZXhwb3J0QWxsX18obW9kdWxlLmV4cG9ydHMpOwpleHBvcnQgZGVmYXVsdCBtb2R1bGUuZXhwb3J0czsKMjY2AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsie1xuICBjb25zdCByZXF1aXJlID0gKCkgPT4ge31cbiAgcmVxdWlyZSgndGVzdCcpXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7QUFDQSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2hCOzs7OyJ9)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
export const __cjs_module_runner_get_exports = () => module.exports;
{
  const require = () => {}
  require('test')
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
```
