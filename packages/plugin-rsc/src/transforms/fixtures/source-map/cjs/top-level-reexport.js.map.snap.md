## cjs-to-esm

```txt
[unmapped] --> (0:0) "let __filename = \"/test.js\"; let __dirname = \"/\";\n"
[unmapped] --> (1:0) "let exports = {}; const module = { exports };\n"
[unmapped] --> (2:0) "function __cjs_interop__(m) {return m.__cjs_module_runner_transform || \"default\" in m && Object.keys(m).every((k) => k === \"default\" || m[k] === m.default[k]) ? m.default : m;}\n"
(0:0) "if (true) {\n" --> (3:0) "if (true) {\n"
(1:0) "  module.exports = require" --> (4:0) "  module.exports = (__cjs_interop__(await import"
(1:26) "('./cjs/use-sync-external-store.production.js')\n" --> (4:48) "('./cjs/use-sync-external-store.production.js')))\n"
(2:0) "} else {\n" --> (5:0) "} else {\n"
(3:0) "  module.exports = require" --> (6:0) "  module.exports = (__cjs_interop__(await import"
(3:26) "('./cjs/use-sync-external-store.development.js')\n" --> (6:48) "('./cjs/use-sync-external-store.development.js')))\n"
(4:0) "}\n" --> (7:0) "}\n"
[unmapped] --> (9:0) ";__vite_ssr_exportAll__(module.exports);\n"
[unmapped] --> (10:0) "export default module.exports;\n"
[unmapped] --> (11:0) "export const __cjs_module_runner_transform = true;\n"
```
