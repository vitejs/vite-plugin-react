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

[Source map visualization](https://evanw.github.io/source-map-visualization/#ODIyAGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CmV4cG9ydCBjb25zdCBfX2Nqc19tb2R1bGVfcnVubmVyX2dldF9leHBvcnRzID0gKCkgPT4gbW9kdWxlLmV4cG9ydHM7CmZ1bmN0aW9uIF9fY2pzX2ludGVyb3BfXyhtKSB7cmV0dXJuIHR5cGVvZiBtLl9fY2pzX21vZHVsZV9ydW5uZXJfZ2V0X2V4cG9ydHMgPT09ICJmdW5jdGlvbiIgPyBtLl9fY2pzX21vZHVsZV9ydW5uZXJfZ2V0X2V4cG9ydHMoKSA6ICJkZWZhdWx0IiBpbiBtICYmIE9iamVjdC5rZXlzKG0pLmV2ZXJ5KChrKSA9PiBrID09PSAiZGVmYXVsdCIgfHwgbVtrXSA9PT0gbS5kZWZhdWx0W2tdKSA/IG0uZGVmYXVsdCA6IG07fQpjb25zdCBfX2Nqc190b19lc21faG9pc3RfMCA9IF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJ3JlYWN0JykpOwpjb25zdCBfX2Nqc190b19lc21faG9pc3RfMSA9IF9fY2pzX2ludGVyb3BfXyhhd2FpdCBpbXBvcnQoJ3JlYWN0LWRvbScpKTsKJ3Byb2R1Y3Rpb24nICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViAmJgogIChmdW5jdGlvbiAoKSB7CiAgICB2YXIgUmVhY3QgPSBfX2Nqc190b19lc21faG9pc3RfMAogICAgdmFyIFJlYWN0RE9NID0gX19janNfdG9fZXNtX2hvaXN0XzEKICAgIGV4cG9ydHMudXNlU3luY0V4dGVybmFsU3RvcmVXaXRoU2VsZWN0b3IgPSBmdW5jdGlvbiAoKSB7fQogIH0pKCkKCjtfX3ZpdGVfc3NyX2V4cG9ydEFsbF9fKG1vZHVsZS5leHBvcnRzKTsKZXhwb3J0IGRlZmF1bHQgbW9kdWxlLmV4cG9ydHM7CjY0NgB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIidwcm9kdWN0aW9uJyAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgJiZcbiAgKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpXG4gICAgdmFyIFJlYWN0RE9NID0gcmVxdWlyZSgncmVhY3QtZG9tJylcbiAgICBleHBvcnRzLnVzZVN5bmNFeHRlcm5hbFN0b3JlV2l0aFNlbGVjdG9yID0gZnVuY3Rpb24gKCkge31cbiAgfSkoKVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7OyJ9)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
export const __cjs_module_runner_get_exports = () => module.exports;
function __cjs_interop__(m) {return typeof m.__cjs_module_runner_get_exports === "function" ? m.__cjs_module_runner_get_exports() : "default" in m && Object.keys(m).every((k) => k === "default" || m[k] === m.default[k]) ? m.default : m;}
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
```
