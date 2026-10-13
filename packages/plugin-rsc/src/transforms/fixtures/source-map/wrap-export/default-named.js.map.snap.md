## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:15) "async function defaultNamedFunction() {\n" --> (2:0) "async function defaultNamedFunction() {\n"
(3:0) "  return 'default named function called'\n" --> (3:0) "  return 'default named function called'\n"
(4:0) "}\n" --> (4:0) "}\n"
[unmapped] --> (5:0) ";\n"
[unmapped] --> (6:0) "const $$wrap_defaultNamedFunction = /* #__PURE__ */ registerServerReference(defaultNamedFunction, \"default\");\n"
[unmapped] --> (7:0) "export { $$wrap_defaultNamedFunction as default };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:15) "async function defaultNamedFunction() {\n" --> (2:0) "async function defaultNamedFunction() {\n"
(3:0) "  return 'default named function called'\n" --> (3:0) "  return 'default named function called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(2:0) "export default async function defaultNamedFunction() {\n" --> (5:0) "\n"
(2:0) "export default async function defaultNamedFunction() {\n" --> (6:0) "registerServerReference(defaultNamedFunction, \"default\");\n"
(2:0) "export default async function defaultNamedFunction() {\n" --> (7:0) "export default defaultNamedFunction;\n"
```

## proxy-export

```txt
(2:0) "export default async function defaultNamedFunction() {\n" --> (2:0) "export default /* #__PURE__ */ createServerReference(\"default\");\n"
```
