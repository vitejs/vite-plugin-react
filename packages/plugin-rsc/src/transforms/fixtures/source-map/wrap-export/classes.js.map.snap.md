## wrap-export

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "class NamedClass {}\n" --> (2:0) "class NamedClass {}\n"
(4:7) "const" --> (4:0) "let"
(4:12) " ClassExpression = class InnerClass {}\n" --> (4:3) " ClassExpression = class InnerClass {}\n"
(6:15) "class DefaultClass {}\n" --> (6:0) "class DefaultClass {}\n"
(2:0) "export class NamedClass {}\n" --> (7:0) "NamedClass = /* #__PURE__ */ registerServerReference(NamedClass, \"NamedClass\");\n"
(2:0) "export class NamedClass {}\n" --> (8:0) "export { NamedClass };\n"
(4:0) "export const ClassExpression = class InnerClass {}\n" --> (9:0) "ClassExpression = /* #__PURE__ */ registerServerReference(ClassExpression, \"ClassExpression\");\n"
(4:0) "export const ClassExpression = class InnerClass {}\n" --> (10:0) "export { ClassExpression };\n"
[unmapped] --> (11:0) ";\n"
[unmapped] --> (12:0) "const $$wrap_DefaultClass = /* #__PURE__ */ registerServerReference(DefaultClass, \"default\");\n"
[unmapped] --> (13:0) "export { $$wrap_DefaultClass as default };\n"
```

## module-export-effect

```txt
(0:0) "'use server'\n" --> (0:0) "'use server'\n"
(2:7) "class NamedClass {}\n" --> (2:0) "class NamedClass {}\n"
(4:7) "const ClassExpression = class InnerClass {}\n" --> (4:0) "const ClassExpression = class InnerClass {}\n"
(6:15) "class DefaultClass {}\n" --> (6:0) "class DefaultClass {}\n"
(2:0) "export class NamedClass {}\n" --> (7:0) "\n"
(2:0) "export class NamedClass {}\n" --> (8:0) "registerServerReference(NamedClass, \"NamedClass\");\n"
(2:0) "export class NamedClass {}\n" --> (9:0) "export { NamedClass };\n"
(4:0) "export const ClassExpression = class InnerClass {}\n" --> (10:0) "\n"
(4:0) "export const ClassExpression = class InnerClass {}\n" --> (11:0) "registerServerReference(ClassExpression, \"ClassExpression\");\n"
(4:0) "export const ClassExpression = class InnerClass {}\n" --> (12:0) "export { ClassExpression };\n"
(6:0) "export default class DefaultClass {}\n" --> (13:0) "\n"
(6:0) "export default class DefaultClass {}\n" --> (14:0) "registerServerReference(DefaultClass, \"default\");\n"
(6:0) "export default class DefaultClass {}\n" --> (15:0) "export default DefaultClass;\n"
```

## proxy-export

```txt
(2:0) "export class NamedClass {}\n" --> (2:0) "export const NamedClass = /* #__PURE__ */ createServerReference(\"NamedClass\");\n"
(4:0) "export const ClassExpression = class InnerClass {}\n" --> (5:0) "export const ClassExpression = /* #__PURE__ */ createServerReference(\"ClassExpression\");\n"
(6:0) "export default class DefaultClass {}\n" --> (8:0) "export default /* #__PURE__ */ createServerReference(\"default\");\n"
```
