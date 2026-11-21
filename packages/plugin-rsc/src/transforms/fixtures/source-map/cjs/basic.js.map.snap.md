## cjs-to-esm

```txt
[unmapped] --> (0:0) "let __filename = \"/test.js\"; let __dirname = \"/\";\n"
[unmapped] --> (1:0) "let exports = {}; const module = { exports };\n"
[unmapped] --> (2:0) "export const __cjs_module_runner_get_exports = () => module.exports;\n"
(0:0) "exports.ok = true\n" --> (3:0) "exports.ok = true\n"
[unmapped] --> (5:0) ";__vite_ssr_exportAll__(module.exports);\n"
[unmapped] --> (6:0) "export default module.exports;\n"
```
