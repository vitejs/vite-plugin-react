## proxy-export

```txt
(2:0) "export default 'value'\n" --> (2:0) "export default /* #__PURE__ */ createServerReference(\"default\");\n"
```
