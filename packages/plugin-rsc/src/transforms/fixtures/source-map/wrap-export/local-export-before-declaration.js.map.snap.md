## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(3:0) "const action = async () => 'action called'\n" --> (3:0) "const action = async () => 'action called'\n"
[unmapped] --> (4:0) ";\n"
[unmapped] --> (5:0) "const $$wrap_action = /* #__PURE__ */ registerServerReference(action, \"action\");\n"
[unmapped] --> (6:0) "export { $$wrap_action as action };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "export { action }\n" --> (2:0) "export { action }\n"
(3:0) "const action = async () => 'action called'\n" --> (3:0) "const action = async () => 'action called'\n"
[unmapped] --> (5:0) "registerServerReference(action, \"action\");"
```

## module-export-wrap

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(3:0) "const action = async () => 'action called'\n" --> (3:0) "const action = async () => 'action called'\n"
[unmapped] --> (5:0) "const $$module_0_binding_action = /* #__PURE__ */ registerServerReference(action, \"action\");\n"
[unmapped] --> (6:0) "export { $$module_0_binding_action as action };\n"
```
