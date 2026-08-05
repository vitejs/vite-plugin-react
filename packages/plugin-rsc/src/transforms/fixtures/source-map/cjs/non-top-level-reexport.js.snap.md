## Input

```js
"production" !== process.env.NODE_ENV && (function() { 
  var React = require("react");
  var ReactDOM = require("react-dom");
  exports.useSyncExternalStoreWithSelector = function () {}
})()
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzM1AGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIG0uX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gfHwgImRlZmF1bHQiIGluIG0gJiYgT2JqZWN0LmtleXMobSkuZXZlcnkoKGspID0+IGsgPT09ICJkZWZhdWx0IiB8fCBtW2tdID09PSBtLmRlZmF1bHRba10pID8gbS5kZWZhdWx0IDogbTt9CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8wID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgicmVhY3QiKSk7CmNvbnN0IF9fY2pzX3RvX2VzbV9ob2lzdF8xID0gX19janNfaW50ZXJvcF9fKGF3YWl0IGltcG9ydCgicmVhY3QtZG9tIikpOwoicHJvZHVjdGlvbiIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WICYmIChmdW5jdGlvbigpIHsgCiAgdmFyIFJlYWN0ID0gX19janNfdG9fZXNtX2hvaXN0XzA7CiAgdmFyIFJlYWN0RE9NID0gX19janNfdG9fZXNtX2hvaXN0XzE7CiAgZXhwb3J0cy51c2VTeW5jRXh0ZXJuYWxTdG9yZVdpdGhTZWxlY3RvciA9IGZ1bmN0aW9uICgpIHt9Cn0pKCkKCjtfX3ZpdGVfc3NyX2V4cG9ydEFsbF9fKG1vZHVsZS5leHBvcnRzKTsKZXhwb3J0IGRlZmF1bHQgbW9kdWxlLmV4cG9ydHM7CmV4cG9ydCBjb25zdCBfX2Nqc19tb2R1bGVfcnVubmVyX3RyYW5zZm9ybSA9IHRydWU7CjYxMgB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIlwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViAmJiAoZnVuY3Rpb24oKSB7IFxuICB2YXIgUmVhY3QgPSByZXF1aXJlKFwicmVhY3RcIik7XG4gIHZhciBSZWFjdERPTSA9IHJlcXVpcmUoXCJyZWFjdC1kb21cIik7XG4gIGV4cG9ydHMudXNlU3luY0V4dGVybmFsU3RvcmVXaXRoU2VsZWN0b3IgPSBmdW5jdGlvbiAoKSB7fVxufSkoKVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxvQkFBZ0I7QUFDOUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLG9CQUFvQjtBQUNyQyxDQUFDLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQzs7Ozs7In0=)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
function __cjs_interop__(m) {return m.__cjs_module_runner_transform || "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
const __cjs_to_esm_hoist_0 = __cjs_interop__(await import("react"));
const __cjs_to_esm_hoist_1 = __cjs_interop__(await import("react-dom"));
"production" !== process.env.NODE_ENV && (function() { 
  var React = __cjs_to_esm_hoist_0;
  var ReactDOM = __cjs_to_esm_hoist_1;
  exports.useSyncExternalStoreWithSelector = function () {}
})()

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
```
