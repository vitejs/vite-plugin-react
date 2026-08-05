## proxy-export

```txt
(2:0) "// This represents Waku's output after its DCE retains the dependencies and\n" --> (2:0) "// This represents Waku's output after its DCE retains the dependencies and\n"
(3:0) "// initializers that need to survive proxy generation.\n" --> (3:0) "// initializers that need to survive proxy generation.\n"
(7:0) "export const countAtom = atom(local)\n" --> (7:0) "export const countAtom = /* #__PURE__ */ createServerReference(\"countAtom\");\n"
(9:0) "export const Component = () => {\n" --> (10:0) "export const Component = /* #__PURE__ */ createServerReference(\"Component\");\n"
```

## proxy-export-keep

```txt
(0:0) "'use client'\n" --> (0:0) "'use client'\n"
(2:0) "// This represents Waku's output after its DCE retains the dependencies and\n" --> (2:0) "// This represents Waku's output after its DCE retains the dependencies and\n"
(3:0) "// initializers that need to survive proxy generation.\n" --> (3:0) "// initializers that need to survive proxy generation.\n"
(4:0) "import { atom } from 'jotai/vanilla'\n" --> (4:0) "import { atom } from 'jotai/vanilla'\n"
(6:0) "const local = 1\n" --> (6:0) "const local = 1\n"
(7:0) "export const countAtom = atom(local)\n" --> (7:0) "export const countAtom = /* #__PURE__ */ createServerReference(atom(local), \"countAtom\");\n"
(9:0) "export const Component = () => {\n" --> (9:0) "export const Component = /* #__PURE__ */ createServerReference(() => {\n"
(9:0) "export const Component = () => {\n" --> (10:0) "  throw new Error('not available on the server')\n"
(9:0) "export const Component = () => {\n" --> (11:0) "}, \"Component\");\n"
```
