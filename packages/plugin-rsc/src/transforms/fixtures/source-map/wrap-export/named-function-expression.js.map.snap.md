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

## proxy-export

```txt
(2:0) "export const action = async function actionImplementation() {\n" --> (2:0) "export const action = /* #__PURE__ */ createServerReference(\"action\");\n"
```
