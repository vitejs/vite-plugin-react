## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "void action\n" --> (2:0) "void action\n"
(4:7) "async function action() {\n" --> (4:0) "async function action() {\n"
(5:0) "  return 'action called'\n" --> (5:0) "  return 'action called'\n"
(6:0) "}\n" --> (6:0) "}\n"
(4:0) "export async function action() {\n" --> (7:0) "action = /* #__PURE__ */ registerServerReference(action, \"action\");\n"
(4:0) "export async function action() {\n" --> (8:0) "export { action };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "void action\n" --> (2:0) "void action\n"
(4:7) "async function action() {\n" --> (4:0) "async function action() {\n"
(5:0) "  return 'action called'\n" --> (5:0) "  return 'action called'\n"
(6:0) "}\n" --> (6:0) "}\n"
(4:0) "export async function action() {\n" --> (7:0) "\n"
(4:0) "export async function action() {\n" --> (8:0) "registerServerReference(action, \"action\");\n"
(4:0) "export async function action() {\n" --> (9:0) "export { action };\n"
```

## module-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(4:7) "async function action() {\n" --> (2:0) "\n"
(4:7) "async function action() " --> (3:0) "const $$module_0_implementation_action = async function $$module_0_implementation_action() "
(4:31) "{\n" --> (3:91) "{\n"
(5:0) "  return 'action called'\n" --> (4:0) "  return 'action called'\n"
(6:0) "}\n" --> (5:0) "};\n"
[unmapped] --> (6:0) "/* #__PURE__ */ Object.defineProperty($$module_0_implementation_action, \"name\", { value: \"action\" });\n"
(2:0) "void action\n" --> (7:0) "void action\n"
[unmapped] --> (9:0) "export const action = /* #__PURE__ */ registerServerReference($$module_0_implementation_action, \"action\");\n"
```
