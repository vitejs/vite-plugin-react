## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "const source = async () => 'destructured export called'\n" --> (2:0) "const source = async () => 'destructured export called'\n"
(4:7) "const" --> (4:0) "let"
(4:12) " { action } = { action: source }\n" --> (4:3) " { action } = { action: source }\n"
(4:0) "export const { action } = { action: source }\n" --> (5:0) "action = /* #__PURE__ */ registerServerReference(action, \"action\");\n"
(4:0) "export const { action } = { action: source }\n" --> (6:0) "export { action };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "const source = async () => 'destructured export called'\n" --> (2:0) "const source = async () => 'destructured export called'\n"
(4:7) "const { action } = { action: source }\n" --> (4:0) "const { action } = { action: source }\n"
(4:0) "export const { action } = { action: source }\n" --> (5:0) "\n"
(4:0) "export const { action } = { action: source }\n" --> (6:0) "registerServerReference(action, \"action\");\n"
(4:0) "export const { action } = { action: source }\n" --> (7:0) "export { action };\n"
```

## proxy-export

```txt
(4:0) "export const { action } = { action: source }\n" --> (4:0) "export const action = /* #__PURE__ */ createServerReference(\"action\");\n"
```
