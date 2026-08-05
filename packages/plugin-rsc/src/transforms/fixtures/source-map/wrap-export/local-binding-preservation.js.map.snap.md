## wrap-export

```txt
(0:7) "async function direct() {}\n" --> (0:0) "async function direct() {}\n"
(2:0) "const indirect = async () => {}\n" --> (2:0) "const indirect = async () => {}\n"
(5:0) "consume(direct, indirect)\n" --> (5:0) "consume(direct, indirect)\n"
(0:0) "export async function direct() {}\n" --> (6:0) "direct = /* #__PURE__ */ registerServerReference(direct, \"direct\");\n"
(0:0) "export async function direct() {}\n" --> (7:0) "export { direct };\n"
[unmapped] --> (8:0) ";\n"
[unmapped] --> (9:0) "const $$wrap_indirect = /* #__PURE__ */ registerServerReference(indirect, \"indirect\");\n"
[unmapped] --> (10:0) "export { $$wrap_indirect as indirect };\n"
```

## module-export-effect

```txt
(0:7) "async function direct() {}\n" --> (0:0) "async function direct() {}\n"
(2:0) "const indirect = async () => {}\n" --> (2:0) "const indirect = async () => {}\n"
(3:0) "export { indirect }\n" --> (3:0) "export { indirect }\n"
(5:0) "consume(direct, indirect)\n" --> (5:0) "consume(direct, indirect)\n"
(0:0) "export async function direct() {}\n" --> (6:0) "\n"
(0:0) "export async function direct() {}\n" --> (7:0) "registerServerReference(direct, \"direct\");\n"
(0:0) "export async function direct() {}\n" --> (8:0) "export { direct };\n"
[unmapped] --> (10:0) "registerServerReference(indirect, \"indirect\");"
```

## proxy-export

```txt
(0:0) "export async function direct() {}\n" --> (0:0) "export const direct = /* #__PURE__ */ createServerReference(\"direct\");\n"
(3:0) "export { indirect }\n" --> (4:0) "export const indirect = /* #__PURE__ */ createServerReference(\"indirect\");\n"
```
