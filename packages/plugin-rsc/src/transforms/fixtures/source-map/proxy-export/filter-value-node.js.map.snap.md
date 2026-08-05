## proxy-export-filtered

```txt
(2:0) "export const cached = async () => {},\n" --> (2:0) "export const cached = /* #__PURE__ */ createServerReference(\"cached\");\n"
(5:0) "export const unknown = createCached()\n" --> (4:0) "export const unknown = /* #__PURE__ */ createServerReference(\"unknown\");\n"
(6:0) "export const primitive = 0\n" --> (6:0) "export const primitive = /* #__PURE__ */ createServerReference(\"primitive\");\n"
```
