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

## module-export-wrap

```txt
(0:7) "async function direct() {}\n" --> (0:0) "\n"
(0:7) "async function direct() " --> (1:0) "const $$module_0_implementation_direct = async function $$module_0_implementation_direct() "
(0:31) "{}\n" --> (1:91) "{};\n"
[unmapped] --> (2:0) "export const direct = /* #__PURE__ */ registerServerReference(Object.defineProperty($$module_0_implementation_direct, \"name\", { value: \"direct\" }), \"direct\");\n"
(2:0) "const indirect = async () => {}\n" --> (4:0) "const indirect = async () => {}\n"
(5:0) "consume(direct, indirect)\n" --> (7:0) "consume(direct, indirect)\n"
[unmapped] --> (9:0) "const $$module_1_binding_indirect = /* #__PURE__ */ registerServerReference(indirect, \"indirect\");\n"
[unmapped] --> (10:0) "export { $$module_1_binding_indirect as indirect };\n"
```
