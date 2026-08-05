## proxy-export

```txt
(2:0) "export const {\n" --> (2:0) "export const x = /* #__PURE__ */ createServerReference(\"x\");\n"
(2:0) "export const {\n" --> (3:0) "export const z = /* #__PURE__ */ createServerReference(\"z\");\n"
```
