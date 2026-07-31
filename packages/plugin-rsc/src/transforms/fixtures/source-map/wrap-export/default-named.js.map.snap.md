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

## module-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:15) "async function defaultNamedFunction() {\n" --> (2:0) "\n"
(2:15) "async function defaultNamedFunction() " --> (3:0) "const $$module_0_implementation_defaultNamedFunction = async function $$module_0_implementation_defaultNamedFunction() "
(2:53) "{\n" --> (3:119) "{\n"
(3:0) "  return 'default named function called'\n" --> (4:0) "  return 'default named function called'\n"
(4:0) "}\n" --> (5:0) "};\n"
[unmapped] --> (6:0) "/* #__PURE__ */ Object.defineProperty($$module_0_implementation_defaultNamedFunction, \"name\", { value: \"defaultNamedFunction\" });\n"
[unmapped] --> (7:0) "const defaultNamedFunction = /* #__PURE__ */ registerServerReference($$module_0_implementation_defaultNamedFunction, \"default\");\n"
[unmapped] --> (8:0) "export default defaultNamedFunction;\n"
```
