## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const" --> (2:0) "let"
(2:12) " action = async function actionImplementation() {\n" --> (2:3) " action = async function actionImplementation() {\n"
(3:0) "  return 'named function expression called'\n" --> (3:0) "  return 'named function expression called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(2:0) "export const action = async function actionImplementation() {\n" --> (5:0) "action = /* #__PURE__ */ registerServerReference(action, \"action\");\n"
(2:0) "export const action = async function actionImplementation() {\n" --> (6:0) "export { action };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const action = async function actionImplementation() {\n" --> (2:0) "const action = async function actionImplementation() {\n"
(3:0) "  return 'named function expression called'\n" --> (3:0) "  return 'named function expression called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(2:0) "export const action = async function actionImplementation() {\n" --> (5:0) "\n"
(2:0) "export const action = async function actionImplementation() {\n" --> (6:0) "registerServerReference(action, \"action\");\n"
(2:0) "export const action = async function actionImplementation() {\n" --> (7:0) "export { action };\n"
```

## module-export-wrap

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:22) "async function actionImplementation() {\n" --> (2:0) "\n"
(2:22) "async function actionImplementation() " --> (3:0) "const $$module_0_implementation_action = async function actionImplementation() "
(2:60) "{\n" --> (3:79) "{\n"
(3:0) "  return 'named function expression called'\n" --> (4:0) "  return 'named function expression called'\n"
(4:0) "}\n" --> (5:0) "};\n"
(2:0) "export const action = async function actionImplementation() {\n" --> (6:0) "export const action = /* #__PURE__ */ registerServerReference(Object.defineProperty($$module_0_implementation_action, \"name\", { value: \"actionImplementation\" }), \"action\")\n"
```
