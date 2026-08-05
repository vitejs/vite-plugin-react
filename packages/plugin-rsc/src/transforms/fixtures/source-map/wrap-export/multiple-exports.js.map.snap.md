## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "async function firstAction() {\n" --> (2:0) "async function firstAction() {\n"
(3:0) "  return 'first action called'\n" --> (3:0) "  return 'first action called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(6:7) "async function secondAction() {\n" --> (6:0) "async function secondAction() {\n"
(7:0) "  return 'second action called'\n" --> (7:0) "  return 'second action called'\n"
(8:0) "}\n" --> (8:0) "}\n"
(2:0) "export async function firstAction() {\n" --> (9:0) "firstAction = /* #__PURE__ */ registerServerReference(firstAction, \"firstAction\");\n"
(2:0) "export async function firstAction() {\n" --> (10:0) "export { firstAction };\n"
(6:0) "export async function secondAction() {\n" --> (11:0) "secondAction = /* #__PURE__ */ registerServerReference(secondAction, \"secondAction\");\n"
(6:0) "export async function secondAction() {\n" --> (12:0) "export { secondAction };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "async function firstAction() {\n" --> (2:0) "async function firstAction() {\n"
(3:0) "  return 'first action called'\n" --> (3:0) "  return 'first action called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(6:7) "async function secondAction() {\n" --> (6:0) "async function secondAction() {\n"
(7:0) "  return 'second action called'\n" --> (7:0) "  return 'second action called'\n"
(8:0) "}\n" --> (8:0) "}\n"
(2:0) "export async function firstAction() {\n" --> (9:0) "\n"
(2:0) "export async function firstAction() {\n" --> (10:0) "registerServerReference(firstAction, \"firstAction\");\n"
(2:0) "export async function firstAction() {\n" --> (11:0) "export { firstAction };\n"
(6:0) "export async function secondAction() {\n" --> (12:0) "\n"
(6:0) "export async function secondAction() {\n" --> (13:0) "registerServerReference(secondAction, \"secondAction\");\n"
(6:0) "export async function secondAction() {\n" --> (14:0) "export { secondAction };\n"
```

## proxy-export

```txt
(2:0) "export async function firstAction() {\n" --> (2:0) "export const firstAction = /* #__PURE__ */ createServerReference(\"firstAction\");\n"
(6:0) "export async function secondAction() {\n" --> (5:0) "export const secondAction = /* #__PURE__ */ createServerReference(\"secondAction\");\n"
```
