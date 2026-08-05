## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "export default " --> (2:0) "const $$default = "
(2:15) "class {}\n" --> (2:18) "class {}\n"
[unmapped] --> (3:0) ";\n"
[unmapped] --> (4:0) "const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, \"default\");\n"
[unmapped] --> (5:0) "export { $$wrap_$$default as default };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:6) " default " --> (2:0) "const $$effect_default = "
(2:15) "class {}\n" --> (2:25) "class {}\n"
(2:0) "export default class {}\n" --> (3:0) "\n"
(2:0) "export default class {}\n" --> (4:0) "registerServerReference($$effect_default, \"default\");\n"
(2:0) "export default class {}\n" --> (5:0) "export default $$effect_default;\n"
```

## proxy-export

```txt
(2:0) "export default class {}\n" --> (2:0) "export default /* #__PURE__ */ createServerReference(\"default\");\n"
```
