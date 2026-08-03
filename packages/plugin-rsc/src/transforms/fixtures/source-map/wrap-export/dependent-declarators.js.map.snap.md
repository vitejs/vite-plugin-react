## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const" --> (2:0) "let"
(2:12) " first = async () => 'first action called',\n" --> (2:3) " first = async () => 'first action called',\n"
(3:0) "  second = first\n" --> (3:0) "  second = first\n"
(2:0) "export const first = async () => 'first action called',\n" --> (4:0) "first = /* #__PURE__ */ registerServerReference(first, \"first\");\n"
(2:0) "export const first = async () => 'first action called',\n" --> (5:0) "export { first };\n"
(2:0) "export const first = async () => 'first action called',\n" --> (6:0) "second = /* #__PURE__ */ registerServerReference(second, \"second\");\n"
(2:0) "export const first = async () => 'first action called',\n" --> (7:0) "export { second };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const first = async () => 'first action called',\n" --> (2:0) "const first = async () => 'first action called',\n"
(3:0) "  second = first\n" --> (3:0) "  second = first\n"
(2:0) "export const first = async () => 'first action called',\n" --> (4:0) "\n"
(2:0) "export const first = async () => 'first action called',\n" --> (5:0) "registerServerReference(first, \"first\");\n"
(2:0) "export const first = async () => 'first action called',\n" --> (6:0) "registerServerReference(second, \"second\");\n"
(2:0) "export const first = async () => 'first action called',\n" --> (7:0) "export { first, second };\n"
```

## module-export-wrap

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const first = async () => 'first action called',\n" --> (2:0) "const first = async () => 'first action called',\n"
(3:0) "  second = first\n" --> (3:0) "  second = first\n"
[unmapped] --> (5:0) "const $$module_0_binding_first = /* #__PURE__ */ Object.defineProperty(registerServerReference(first, \"first\"), \"name\", { value: \"first\" });\n"
[unmapped] --> (6:0) "export { $$module_0_binding_first as first };\n"
[unmapped] --> (7:0) "const $$module_1_binding_second = /* #__PURE__ */ registerServerReference(second, \"second\");\n"
[unmapped] --> (8:0) "export { $$module_1_binding_second as second };\n"
```
