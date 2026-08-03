## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "async function localAlias() {\n" --> (2:0) "async function localAlias() {\n"
(3:0) "  return 'local alias called'\n" --> (3:0) "  return 'local alias called'\n"
(4:0) "}\n" --> (4:0) "}\n"
[unmapped] --> (7:0) ";\n"
[unmapped] --> (8:0) "const $$wrap_localAlias = /* #__PURE__ */ registerServerReference(localAlias, \"aliasedAction\");\n"
[unmapped] --> (9:0) "export { $$wrap_localAlias as aliasedAction };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "async function localAlias() {\n" --> (2:0) "async function localAlias() {\n"
(3:0) "  return 'local alias called'\n" --> (3:0) "  return 'local alias called'\n"
(4:0) "}\n" --> (4:0) "}\n"
(6:0) "export { localAlias as aliasedAction }\n" --> (6:0) "export { localAlias as aliasedAction }\n"
[unmapped] --> (8:0) "registerServerReference(localAlias, \"aliasedAction\");"
```

## module-export-wrap

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:0) "async function localAlias() {\n" --> (2:0) "\n"
(2:0) "async function localAlias() " --> (3:0) "const $$module_0_implementation_localAlias = async function $$module_0_implementation_localAlias() "
(2:28) "{\n" --> (3:99) "{\n"
(3:0) "  return 'local alias called'\n" --> (4:0) "  return 'local alias called'\n"
(4:0) "}\n" --> (5:0) "};\n"
[unmapped] --> (6:0) "const localAlias = /* #__PURE__ */ registerServerReference(Object.defineProperty($$module_0_implementation_localAlias, \"name\", { value: \"localAlias\" }), \"aliasedAction\");\n"
(6:0) "export { localAlias as aliasedAction }\n" --> (8:0) "export { localAlias as aliasedAction }\n"
```
