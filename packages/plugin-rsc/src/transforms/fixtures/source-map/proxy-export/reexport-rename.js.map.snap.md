## proxy-export

```txt
(2:0) "export { value as renamed } from './dep.js'\n" --> (2:0) "export const renamed = /* #__PURE__ */ createServerReference(\"renamed\");\n"
```
