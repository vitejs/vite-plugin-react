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

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjY5AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CnsKICBjb25zdCByZXF1aXJlID0gKCkgPT4ge30KICByZXF1aXJlKCd0ZXN0JykKfQoKO19fdml0ZV9zc3JfZXhwb3J0QWxsX18obW9kdWxlLmV4cG9ydHMpOwpleHBvcnQgZGVmYXVsdCBtb2R1bGUuZXhwb3J0czsKZXhwb3J0IGNvbnN0IF9fY2pzX21vZHVsZV9ydW5uZXJfdHJhbnNmb3JtID0gdHJ1ZTsKMjY2AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsie1xuICBjb25zdCByZXF1aXJlID0gKCkgPT4ge31cbiAgcmVxdWlyZSgndGVzdCcpXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDaEI7Ozs7OyJ9)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
{
  const require = () => {}
  require('test')
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
```
