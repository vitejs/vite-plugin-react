## cjs-to-esm

```txt
[unmapped] --> (0:0) "let __filename = \"/test.js\"; let __dirname = \"/\";\n"
[unmapped] --> (1:0) "let exports = {}; const module = { exports };\n"
[unmapped] --> (2:0) "export const __cjs_module_runner_get_exports = () => module.exports;\n"
(0:0) "{\n" --> (3:0) "{\n"
(1:0) "  const require = () => {}\n" --> (4:0) "  const require = () => {}\n"
(2:0) "  require('test')\n" --> (5:0) "  require('test')\n"
(3:0) "}\n" --> (6:0) "}\n"
[unmapped] --> (8:0) ";__vite_ssr_exportAll__(module.exports);\n"
[unmapped] --> (9:0) "export default module.exports;\n"
```
