## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "async function namedFunction() {\n" --> (2:0) "async function namedFunction() {\n"
(3:0) "  return 'named function called'\n" --> (3:0) "  return 'named function called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(2:0) "export async function namedFunction() {\n" --> (5:0) "namedFunction = /* #__PURE__ */ registerServerReference(namedFunction, \"namedFunction\");\n"
(2:0) "export async function namedFunction() {\n" --> (6:0) "export { namedFunction };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "async function namedFunction() {\n" --> (2:0) "async function namedFunction() {\n"
(3:0) "  return 'named function called'\n" --> (3:0) "  return 'named function called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(2:0) "export async function namedFunction() {\n" --> (5:0) "\n"
(2:0) "export async function namedFunction() {\n" --> (6:0) "registerServerReference(namedFunction, \"namedFunction\");\n"
(2:0) "export async function namedFunction() {\n" --> (7:0) "export { namedFunction };\n"
```

## module-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "async function namedFunction() {\n" --> (2:0) "\n"
(2:7) "async function namedFunction() " --> (3:0) "const $$module_0_implementation_namedFunction = async function $$module_0_implementation_namedFunction() "
(2:38) "{\n" --> (3:105) "{\n"
(3:0) "  return 'named function called'\n" --> (4:0) "  return 'named function called'\n"
(4:0) "}\n" --> (5:0) "};\n"
[unmapped] --> (6:0) "/* #__PURE__ */ Object.defineProperty($$module_0_implementation_namedFunction, \"name\", { value: \"namedFunction\" });\n"
[unmapped] --> (7:0) "export const namedFunction = /* #__PURE__ */ registerServerReference($$module_0_implementation_namedFunction, \"namedFunction\");\n"
```
