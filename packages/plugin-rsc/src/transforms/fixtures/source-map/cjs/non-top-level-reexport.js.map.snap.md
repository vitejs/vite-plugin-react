## cjs-to-esm

```txt
[unmapped] --> (0:0) "let __filename = \"/test.js\"; let __dirname = \"/\";\n"
[unmapped] --> (1:0) "let exports = {}; const module = { exports };\n"
[unmapped] --> (2:0) "function __cjs_interop__(m) {return m.__cjs_module_runner_transform || \"default\" in m && Object.keys(m).every((k) => k === \"default\" || m[k] === m.default[k]) ? m.default : m;}\n"
[unmapped] --> (3:0) "const __cjs_to_esm_hoist_0 = __cjs_interop__(await import(\"react\"));\n"
[unmapped] --> (4:0) "const __cjs_to_esm_hoist_1 = __cjs_interop__(await import(\"react-dom\"));\n"
(0:0) "\"production\" !== process.env.NODE_ENV && (function() { \n" --> (5:0) "\"production\" !== process.env.NODE_ENV && (function() { \n"
(1:0) "  var React = require(\"react\")" --> (6:0) "  var React = __cjs_to_esm_hoist_0"
(1:30) ";\n" --> (6:34) ";\n"
(2:0) "  var ReactDOM = require(\"react-dom\");\n" --> (7:0) "  var ReactDOM = __cjs_to_esm_hoist_1;\n"
(3:0) "  exports.useSyncExternalStoreWithSelector = function () {}\n" --> (8:0) "  exports.useSyncExternalStoreWithSelector = function () {}\n"
(4:0) "})()\n" --> (9:0) "})()\n"
[unmapped] --> (11:0) ";__vite_ssr_exportAll__(module.exports);\n"
[unmapped] --> (12:0) "export default module.exports;\n"
[unmapped] --> (13:0) "export const __cjs_module_runner_transform = true;\n"
```
