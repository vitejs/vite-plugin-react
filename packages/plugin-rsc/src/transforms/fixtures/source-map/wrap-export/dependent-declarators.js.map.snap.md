## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "const" --> (2:0) "let"
(2:12) " first = async () => 'first action called',\n" --> (2:3) " first = async () => 'first action called',\n"
(3:0) "  second = first\n" --> (3:0) "  second = first\n"
(2:0) "export const first = async () => 'first action called',\n" --> (4:0) "first = /* #__PURE__ */ registerServerReference(first, \"first\");\n"
(2:0) "export const first = async () => 'first action called',\n" --> (5:0) "second = /* #__PURE__ */ registerServerReference(second, \"second\");\n"
(2:0) "export const first = async () => 'first action called',\n" --> (6:0) "export { first, second };\n"
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

## proxy-export

```txt
(2:0) "export const first = async () => 'first action called',\n" --> (2:0) "export const first = /* #__PURE__ */ createServerReference(\"first\");\n"
(2:0) "export const first = async () => 'first action called',\n" --> (3:0) "export const second = /* #__PURE__ */ createServerReference(\"second\");\n"
```
