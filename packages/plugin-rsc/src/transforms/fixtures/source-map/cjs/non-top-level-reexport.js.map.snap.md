## cjs-to-esm

```txt
[unmapped] --> (0:0) "let __filename = \"/test.js\"; let __dirname = \"/\";\n"
[unmapped] --> (1:0) "let exports = {}; const module = { exports };\n"
[unmapped] --> (2:0) "export const __cjs_module_runner_get_exports = () => module.exports;\n"
[unmapped] --> (3:0) "function __cjs_interop__(m) {return typeof m.__cjs_module_runner_get_exports === \"function\" ? m.__cjs_module_runner_get_exports() : \"default\" in m && Object.keys(m).every((k) => k === \"default\" || m[k] === m.default[k]) ? m.default : m;}\n"
[unmapped] --> (4:0) "const __cjs_to_esm_hoist_0 = __cjs_interop__(await import('react'));\n"
[unmapped] --> (5:0) "const __cjs_to_esm_hoist_1 = __cjs_interop__(await import('react-dom'));\n"
(0:0) "'production' !== process.env.NODE_ENV &&\n" --> (6:0) "'production' !== process.env.NODE_ENV &&\n"
(1:0) "  (function () {\n" --> (7:0) "  (function () {\n"
(2:0) "    var React = require('react')\n" --> (8:0) "    var React = __cjs_to_esm_hoist_0\n"
(3:0) "    var ReactDOM = require('react-dom')\n" --> (9:0) "    var ReactDOM = __cjs_to_esm_hoist_1\n"
(4:0) "    exports.useSyncExternalStoreWithSelector = function () {}\n" --> (10:0) "    exports.useSyncExternalStoreWithSelector = function () {}\n"
(5:0) "  })()\n" --> (11:0) "  })()\n"
[unmapped] --> (13:0) ";__vite_ssr_exportAll__(module.exports);\n"
[unmapped] --> (14:0) "export default module.exports;\n"
```
