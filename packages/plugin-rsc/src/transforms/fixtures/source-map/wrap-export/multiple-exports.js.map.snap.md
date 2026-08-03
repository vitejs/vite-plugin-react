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
(2:7) "async function firstAction() {\n" --> (2:0) "\n"
(2:7) "async function firstAction() " --> (3:0) "const $$module_0_implementation_firstAction = async function $$module_0_implementation_firstAction() "
(2:36) "{\n" --> (3:101) "{\n"
(3:0) "  return 'first action called'\n" --> (4:0) "  return 'first action called'\n"
(4:0) "}\n" --> (5:0) "};\n"
(6:7) "async function secondAction() {\n" --> (6:0) "\n"
(6:7) "async function secondAction() " --> (7:0) "const $$module_1_implementation_secondAction = async function $$module_1_implementation_secondAction() "
(6:37) "{\n" --> (7:103) "{\n"
(7:0) "  return 'second action called'\n" --> (8:0) "  return 'second action called'\n"
(8:0) "}\n" --> (9:0) "};\n"
[unmapped] --> (10:0) "export const firstAction = /* #__PURE__ */ registerServerReference(Object.defineProperty($$module_0_implementation_firstAction, \"name\", { value: \"firstAction\" }), \"firstAction\");\n"
[unmapped] --> (12:0) "export const secondAction = /* #__PURE__ */ registerServerReference(Object.defineProperty($$module_1_implementation_secondAction, \"name\", { value: \"secondAction\" }), \"secondAction\");\n"
```
