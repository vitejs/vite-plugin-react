## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "function recursive(depth) {\n" --> (2:0) "function recursive(depth) {\n"
(3:0) "  if (depth > 0) return recursive(depth - 1)\n" --> (3:0) "  if (depth > 0) return recursive(depth - 1)\n"
(4:0) "  return recursive.marker\n" --> (4:0) "  return recursive.marker\n"
(5:0) "}\n" --> (5:0) "}\n"
(2:0) "export function recursive(depth) {\n" --> (6:0) "recursive = /* #__PURE__ */ registerServerReference(recursive, \"recursive\");\n"
(2:0) "export function recursive(depth) {\n" --> (7:0) "export { recursive };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "function recursive(depth) {\n" --> (2:0) "function recursive(depth) {\n"
(3:0) "  if (depth > 0) return recursive(depth - 1)\n" --> (3:0) "  if (depth > 0) return recursive(depth - 1)\n"
(4:0) "  return recursive.marker\n" --> (4:0) "  return recursive.marker\n"
(5:0) "}\n" --> (5:0) "}\n"
(2:0) "export function recursive(depth) {\n" --> (6:0) "\n"
(2:0) "export function recursive(depth) {\n" --> (7:0) "registerServerReference(recursive, \"recursive\");\n"
(2:0) "export function recursive(depth) {\n" --> (8:0) "export { recursive };\n"
```

## module-export-wrap

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "function recursive(depth) {\n" --> (2:0) "\n"
(2:7) "function recursive(depth) " --> (3:0) "const $$module_0_implementation_recursive = function $$module_0_implementation_recursive(depth) "
(2:33) "{\n" --> (3:96) "{\n"
(3:0) "  if (depth > 0) return recursive(depth - 1)\n" --> (4:0) "  if (depth > 0) return recursive(depth - 1)\n"
(4:0) "  return recursive.marker\n" --> (5:0) "  return recursive.marker\n"
(5:0) "}\n" --> (6:0) "};\n"
[unmapped] --> (7:0) "/* #__PURE__ */ Object.defineProperty($$module_0_implementation_recursive, \"name\", { value: \"recursive\" });\n"
[unmapped] --> (8:0) "export const recursive = /* #__PURE__ */ registerServerReference($$module_0_implementation_recursive, \"recursive\");\n"
```
