## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "export /* before */ default /* after */ " --> (2:0) "const $$default = "
(2:40) "async function () {\n" --> (2:18) "async function () {\n"
(3:0) "  return 'default comments called'\n" --> (3:0) "  return 'default comments called'\n"
(4:0) "}\n" --> (4:0) "}\n"
[unmapped] --> (5:0) ";\n"
[unmapped] --> (6:0) "const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, \"default\");\n"
[unmapped] --> (7:0) "export { $$wrap_$$default as default };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:6) " /* before */ default /* after */ " --> (2:0) "const $$effect_default = "
(2:40) "async function () {\n" --> (2:25) "async function () {\n"
(3:0) "  return 'default comments called'\n" --> (3:0) "  return 'default comments called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(2:0) "export /* before */ default /* after */ async function () {\n" --> (5:0) "\n"
(2:0) "export /* before */ default /* after */ async function () {\n" --> (6:0) "registerServerReference($$effect_default, \"default\");\n"
(2:0) "export /* before */ default /* after */ async function () {\n" --> (7:0) "export default $$effect_default;\n"
```

## proxy-export

```txt
(2:0) "export /* before */ default /* after */ async function () {\n" --> (2:0) "export default /* #__PURE__ */ createServerReference(\"default\");\n"
```
