## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "let action = async () => 'first'\n" --> (2:0) "let action = async () => 'first'\n"
(3:0) "export default " --> (3:0) "const $$default = "
(3:15) "action\n" --> (3:18) "action\n"
(4:0) "action = async () => 'second'\n" --> (4:0) "action = async () => 'second'\n"
[unmapped] --> (5:0) ";\n"
[unmapped] --> (6:0) "const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, \"default\");\n"
[unmapped] --> (7:0) "export { $$wrap_$$default as default };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "let action = async () => 'first'\n" --> (2:0) "let action = async () => 'first'\n"
(3:6) " default action\n" --> (3:0) "const $$effect_default = action;\n"
(4:0) "action = async () => 'second'\n" --> (4:0) "action = async () => 'second'\n"
(3:0) "export default action\n" --> (5:0) "\n"
(3:0) "export default action\n" --> (6:0) "registerServerReference($$effect_default, \"default\");\n"
(3:0) "export default action\n" --> (7:0) "export default $$effect_default;\n"
```

## proxy-export

```txt
(3:0) "export default action\n" --> (3:0) "export default /* #__PURE__ */ createServerReference(\"default\");\n"
```
