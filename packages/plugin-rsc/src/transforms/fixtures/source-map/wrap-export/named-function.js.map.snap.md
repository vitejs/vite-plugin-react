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

## proxy-export

```txt
(2:0) "export async function namedFunction() {\n" --> (2:0) "export const namedFunction = /* #__PURE__ */ createServerReference(\"namedFunction\");\n"
```
