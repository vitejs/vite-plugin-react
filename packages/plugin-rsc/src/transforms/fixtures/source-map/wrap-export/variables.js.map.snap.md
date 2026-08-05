## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const" --> (2:0) "let"
(2:12) " arrowFunction = async () => 'arrow function called'\n" --> (2:3) " arrowFunction = async () => 'arrow function called'\n"
(4:7) "const" --> (4:0) "let"
(4:12) " functionExpression = async function () {\n" --> (4:3) " functionExpression = async function () {\n"
(5:0) "  return 'function expression called'\n" --> (5:0) "  return 'function expression called'\n"
(6:0) "}\n" --> (6:0) "}\n"
(2:0) "export const arrowFunction = async () => 'arrow function called'\n" --> (7:0) "arrowFunction = /* #__PURE__ */ registerServerReference(arrowFunction, \"arrowFunction\");\n"
(2:0) "export const arrowFunction = async () => 'arrow function called'\n" --> (8:0) "export { arrowFunction };\n"
(4:0) "export const functionExpression = async function () {\n" --> (9:0) "functionExpression = /* #__PURE__ */ registerServerReference(functionExpression, \"functionExpression\");\n"
(4:0) "export const functionExpression = async function () {\n" --> (10:0) "export { functionExpression };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const arrowFunction = async () => 'arrow function called'\n" --> (2:0) "const arrowFunction = async () => 'arrow function called'\n"
(4:7) "const functionExpression = async function () {\n" --> (4:0) "const functionExpression = async function () {\n"
(5:0) "  return 'function expression called'\n" --> (5:0) "  return 'function expression called'\n"
(6:0) "}\n" --> (6:0) "}\n"
(2:0) "export const arrowFunction = async () => 'arrow function called'\n" --> (7:0) "\n"
(2:0) "export const arrowFunction = async () => 'arrow function called'\n" --> (8:0) "registerServerReference(arrowFunction, \"arrowFunction\");\n"
(2:0) "export const arrowFunction = async () => 'arrow function called'\n" --> (9:0) "export { arrowFunction };\n"
(4:0) "export const functionExpression = async function () {\n" --> (10:0) "\n"
(4:0) "export const functionExpression = async function () {\n" --> (11:0) "registerServerReference(functionExpression, \"functionExpression\");\n"
(4:0) "export const functionExpression = async function () {\n" --> (12:0) "export { functionExpression };\n"
```

## proxy-export

```txt
(2:0) "export const arrowFunction = async () => 'arrow function called'\n" --> (2:0) "export const arrowFunction = /* #__PURE__ */ createServerReference(\"arrowFunction\");\n"
(4:0) "export const functionExpression = async function () {\n" --> (5:0) "export const functionExpression = /* #__PURE__ */ createServerReference(\"functionExpression\");\n"
```
