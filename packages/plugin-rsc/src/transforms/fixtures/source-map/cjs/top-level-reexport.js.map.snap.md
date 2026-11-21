## cjs-to-esm

```txt
[unmapped] --> (0:0) "let __filename = \"/test.js\"; let __dirname = \"/\";\n"
[unmapped] --> (1:0) "let exports = {}; const module = { exports };\n"
[unmapped] --> (2:0) "export const __cjs_module_runner_get_exports = () => module.exports;\n"
[unmapped] --> (3:0) "function __cjs_interop__(m) {return typeof m.__cjs_module_runner_get_exports === \"function\" ? m.__cjs_module_runner_get_exports() : \"default\" in m && Object.keys(m).every((k) => k === \"default\" || m[k] === m.default[k]) ? m.default : m;}\n"
(0:0) "if (true) {\n" --> (4:0) "if (true) {\n"
(1:0) "  module.exports = require" --> (5:0) "  module.exports = (__cjs_interop__(await import"
(1:26) "('./cjs/use-sync-external-store.production.js')\n" --> (5:48) "('./cjs/use-sync-external-store.production.js')))\n"
(2:0) "} else {\n" --> (6:0) "} else {\n"
(3:0) "  module.exports = require" --> (7:0) "  module.exports = (__cjs_interop__(await import"
(3:26) "('./cjs/use-sync-external-store.development.js')\n" --> (7:48) "('./cjs/use-sync-external-store.development.js')))\n"
(4:0) "}\n" --> (8:0) "}\n"
[unmapped] --> (10:0) ";__vite_ssr_exportAll__(module.exports);\n"
[unmapped] --> (11:0) "export default module.exports;\n"
```
