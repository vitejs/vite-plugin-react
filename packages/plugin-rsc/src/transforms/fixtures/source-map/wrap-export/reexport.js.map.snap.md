## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
[unmapped] --> (3:0) ";\n"
[unmapped] --> (4:0) "import { reexportedAction as $$import_reexportedAction } from './reexport-source';\n"
[unmapped] --> (5:0) "const $$wrap_$$import_reexportedAction = /* #__PURE__ */ registerServerReference($$import_reexportedAction, \"reexportedAction\");\n"
[unmapped] --> (6:0) "export { $$wrap_$$import_reexportedAction as reexportedAction };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "export { reexportedAction } from './reexport-source'\n" --> (2:0) "export { reexportedAction } from './reexport-source'\n"
[unmapped] --> (4:0) "import { reexportedAction as $$effect_import_reexportedAction } from './reexport-source';\n"
[unmapped] --> (5:0) "registerServerReference($$effect_import_reexportedAction, \"reexportedAction\");"
```

## proxy-export

```txt
(2:0) "export { reexportedAction } from './reexport-source'\n" --> (2:0) "export const reexportedAction = /* #__PURE__ */ createServerReference(\"reexportedAction\");\n"
```
