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

## proxy-export

```txt
(4:0) "export async function action() {\n" --> (4:0) "export const action = /* #__PURE__ */ createServerReference(\"action\");\n"
```
