## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "async function value() {\n" --> (2:0) "async function value() {\n"
(3:0) "  return 'multiple aliases called'\n" --> (3:0) "  return 'multiple aliases called'\n"
(4:0) "}\n" --> (4:0) "}\n"
[unmapped] --> (7:0) ";\n"
[unmapped] --> (8:0) "const $$wrap_value = /* #__PURE__ */ registerServerReference(value, \"first\");\n"
[unmapped] --> (9:0) "export { $$wrap_value as first };\n"
[unmapped] --> (10:0) "const $$wrap_value = /* #__PURE__ */ registerServerReference(value, \"second\");\n"
[unmapped] --> (11:0) "export { $$wrap_value as second };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "async function value() {\n" --> (2:0) "async function value() {\n"
(3:0) "  return 'multiple aliases called'\n" --> (3:0) "  return 'multiple aliases called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(6:0) "export { value as first, value as second }\n" --> (6:0) "export { value as first, value as second }\n"
[unmapped] --> (8:0) "registerServerReference(value, \"first\");\n"
[unmapped] --> (9:0) "registerServerReference(value, \"second\");"
```

## proxy-export

```txt
(6:0) "export { value as first, value as second }\n" --> (4:0) "export const first = /* #__PURE__ */ createServerReference(\"first\");\n"
(6:0) "export { value as first, value as second }\n" --> (5:0) "export const second = /* #__PURE__ */ createServerReference(\"second\");\n"
```
