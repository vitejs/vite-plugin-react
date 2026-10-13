## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "async function defaultIdentifier() {\n" --> (2:0) "async function defaultIdentifier() {\n"
(3:0) "  return 'default identifier called'\n" --> (3:0) "  return 'default identifier called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(6:0) "export default " --> (6:0) "const $$default = "
(6:15) "defaultIdentifier\n" --> (6:18) "defaultIdentifier\n"
[unmapped] --> (7:0) ";\n"
[unmapped] --> (8:0) "const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, \"default\");\n"
[unmapped] --> (9:0) "export { $$wrap_$$default as default };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "async function defaultIdentifier() {\n" --> (2:0) "async function defaultIdentifier() {\n"
(3:0) "  return 'default identifier called'\n" --> (3:0) "  return 'default identifier called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(6:6) " default defaultIdentifier\n" --> (6:0) "const $$effect_default = defaultIdentifier;\n"
(6:0) "export default defaultIdentifier\n" --> (7:0) "\n"
(6:0) "export default defaultIdentifier\n" --> (8:0) "registerServerReference($$effect_default, \"default\");\n"
(6:0) "export default defaultIdentifier\n" --> (9:0) "export default $$effect_default;\n"
```

## proxy-export

```txt
(6:0) "export default defaultIdentifier\n" --> (4:0) "export default /* #__PURE__ */ createServerReference(\"default\");\n"
```
