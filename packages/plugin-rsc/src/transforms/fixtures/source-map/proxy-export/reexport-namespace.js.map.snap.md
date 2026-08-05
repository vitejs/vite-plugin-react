## proxy-export

```txt
(2:0) "export * as namespace from './dep.js'\n" --> (2:0) "export const namespace = /* #__PURE__ */ createServerReference(\"namespace\");\n"
```
