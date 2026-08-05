## Input

```js
'production' !== process.env.NODE_ENV &&
  (function () {
    var React = require('react')
    var ReactDOM = require('react-dom')
    exports.useSyncExternalStoreWithSelector = function () {}
  })()
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzQzAGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIG0uX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gfHwgImRlZmF1bHQiIGluIG0gJiYgT2JqZWN0LmtleXMobSkuZXZlcnkoKGspID0+IGsgPT09ICJkZWZhdWx0IiB8fCBtW2tdID09PSBtLmRlZmF1bHRba10pID8gbS5kZWZhdWx0IDogbTt9CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8wID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgncmVhY3QnKSk7CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8xID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgncmVhY3QtZG9tJykpOwoncHJvZHVjdGlvbicgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WICYmCiAgKGZ1bmN0aW9uICgpIHsKICAgIHZhciBSZWFjdCA9IF9fY2pzX3RvX2VzbV9ob2lzdF8wCiAgICB2YXIgUmVhY3RET00gPSBfX2Nqc190b19lc21faG9pc3RfMQogICAgZXhwb3J0cy51c2VTeW5jRXh0ZXJuYWxTdG9yZVdpdGhTZWxlY3RvciA9IGZ1bmN0aW9uICgpIHt9CiAgfSkoKQoKO19fdml0ZV9zc3JfZXhwb3J0QWxsX18obW9kdWxlLmV4cG9ydHMpOwpleHBvcnQgZGVmYXVsdCBtb2R1bGUuZXhwb3J0czsKZXhwb3J0IGNvbnN0IF9fY2pzX21vZHVsZV9ydW5uZXJfdHJhbnNmb3JtID0gdHJ1ZTsKNjQ2AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3Byb2R1Y3Rpb24nICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViAmJlxuICAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0JylcbiAgICB2YXIgUmVhY3RET00gPSByZXF1aXJlKCdyZWFjdC1kb20nKVxuICAgIGV4cG9ydHMudXNlU3luY0V4dGVybmFsU3RvcmVXaXRoU2VsZWN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICB9KSgpXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7Ozs7In0=)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
const __cjs_to_esm_hoist_0 = __cjs_interop__(await import('react'));
const __cjs_to_esm_hoist_1 = __cjs_interop__(await import('react-dom'));
'production' !== process.env.NODE_ENV &&
  (function () {
    var React = __cjs_to_esm_hoist_0
    var ReactDOM = __cjs_to_esm_hoist_1
    exports.useSyncExternalStoreWithSelector = function () {}
  })()

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
```
