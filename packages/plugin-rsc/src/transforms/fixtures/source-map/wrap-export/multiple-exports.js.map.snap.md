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

## module-export-wrap

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "async function firstAction() {\n" --> (2:0) "async function firstAction() {\n"
(3:0) "  return 'first action called'\n" --> (3:0) "  return 'first action called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(6:7) "async function secondAction() {\n" --> (6:0) "async function secondAction() {\n"
(7:0) "  return 'second action called'\n" --> (7:0) "  return 'second action called'\n"
(8:0) "}\n" --> (8:0) "}\n"
[unmapped] --> (10:0) "const $$module_0_binding_firstAction = Object.defineProperty(registerServerReference(firstAction, \"firstAction\"), \"name\", { value: \"firstAction\" });\n"
[unmapped] --> (11:0) "export { $$module_0_binding_firstAction as firstAction };\n"
[unmapped] --> (12:0) "const $$module_1_binding_secondAction = Object.defineProperty(registerServerReference(secondAction, \"secondAction\"), \"name\", { value: \"secondAction\" });\n"
[unmapped] --> (13:0) "export { $$module_1_binding_secondAction as secondAction };\n"
```
