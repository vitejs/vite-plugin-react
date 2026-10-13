## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "let action = async () => 'first'\n" --> (2:0) "let action = async () => 'first'\n"
(4:0) "action = async () => 'second'\n" --> (4:0) "action = async () => 'second'\n"
[unmapped] --> (5:0) ";\n"
[unmapped] --> (6:0) "const $$wrap_action = /* #__PURE__ */ registerServerReference(action, \"renamed\");\n"
[unmapped] --> (7:0) "export { $$wrap_action as renamed };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "let action = async () => 'first'\n" --> (2:0) "let action = async () => 'first'\n"
(3:0) "export { action as renamed }\n" --> (3:0) "export { action as renamed }\n"
(4:0) "action = async () => 'second'\n" --> (4:0) "action = async () => 'second'\n"
[unmapped] --> (6:0) "registerServerReference(action, \"renamed\");"
```

## proxy-export

```txt
(3:0) "export { action as renamed }\n" --> (3:0) "export const renamed = /* #__PURE__ */ createServerReference(\"renamed\");\n"
```
