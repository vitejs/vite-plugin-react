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
(2:21) "async () => 'first action called',\n" --> (2:0) "\n"
(2:21) "async () => " --> (3:0) "const $$module_0_implementation_first = async () => "
(2:33) "'first action called',\n" --> (3:52) "'first action called';\n"
(2:7) "const first = async () => 'first action called'" --> (4:0) "const first = /* #__PURE__ */ registerServerReference(Object.defineProperty($$module_0_implementation_first, \"name\", { value: \"first\" }), \"first\")"
(2:54) ",\n" --> (4:146) ",\n"
(3:0) "  second = first\n" --> (5:0) "  second = first\n"
[unmapped] --> (7:0) "const $$module_1_binding_second = /* #__PURE__ */ registerServerReference(second, \"second\");\n"
[unmapped] --> (8:0) "export { $$module_1_binding_second as second };\n"
[unmapped] --> (9:0) "export { first };\n"
```
