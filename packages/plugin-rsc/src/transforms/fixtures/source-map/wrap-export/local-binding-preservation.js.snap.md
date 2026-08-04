## Input

```js
export async function direct() {}

const indirect = async () => {}
export { indirect }

consume(direct, indirect)
```

## wrap-export

**Status:** transformed

**References:** direct, indirect

[Source map visualization](https://evanw.github.io/source-map-visualization/#MzA0AGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9Cgpjb25zdCBpbmRpcmVjdCA9IGFzeW5jICgpID0+IHt9CgoKY29uc3VtZShkaXJlY3QsIGluZGlyZWN0KQpkaXJlY3QgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoZGlyZWN0LCAiZGlyZWN0Iik7CmV4cG9ydCB7IGRpcmVjdCB9Owo7CmNvbnN0ICQkd3JhcF9pbmRpcmVjdCA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZShpbmRpcmVjdCwgImluZGlyZWN0Iik7CmV4cG9ydCB7ICQkd3JhcF9pbmRpcmVjdCBhcyBpbmRpcmVjdCB9OwozNzkAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlyZWN0KCkge31cblxuY29uc3QgaW5kaXJlY3QgPSBhc3luYyAoKSA9PiB7fVxuZXhwb3J0IHsgaW5kaXJlY3QgfVxuXG5jb25zdW1lKGRpcmVjdCwgaW5kaXJlY3QpXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWhDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFHOUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVE7QUFMeEI7QUFBQTs7OzsifQ==)

```js
async function direct() {}

const indirect = async () => {}


consume(direct, indirect)
direct = /* #__PURE__ */ registerServerReference(direct, "direct");
export { direct };
;
const $$wrap_indirect = /* #__PURE__ */ registerServerReference(indirect, "indirect");
export { $$wrap_indirect as indirect };
```

## module-export-effect

**Status:** transformed

**References:** direct, indirect

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjE3AGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9Cgpjb25zdCBpbmRpcmVjdCA9IGFzeW5jICgpID0+IHt9CmV4cG9ydCB7IGluZGlyZWN0IH0KCmNvbnN1bWUoZGlyZWN0LCBpbmRpcmVjdCkKCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGRpcmVjdCwgImRpcmVjdCIpOwpleHBvcnQgeyBkaXJlY3QgfTsKCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGluZGlyZWN0LCAiaW5kaXJlY3QiKTs0MTcAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlyZWN0KCkge31cblxuY29uc3QgaW5kaXJlY3QgPSBhc3luYyAoKSA9PiB7fVxuZXhwb3J0IHsgaW5kaXJlY3QgfVxuXG5jb25zdW1lKGRpcmVjdCwgaW5kaXJlY3QpXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWhDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDOztBQUVsQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUTtBQUx4QjtBQUFBO0FBQUE7OyJ9)

```js
async function direct() {}

const indirect = async () => {}
export { indirect }

consume(direct, indirect)

registerServerReference(direct, "direct");
export { direct };

registerServerReference(indirect, "indirect");
```

## module-export-wrap

**Status:** transformed

**References:** direct, indirect

[Source map visualization](https://evanw.github.io/source-map-visualization/#NDMzAGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9Cgpjb25zdCBpbmRpcmVjdCA9IGFzeW5jICgpID0+IHt9CgoKY29uc3VtZShkaXJlY3QsIGluZGlyZWN0KQoKY29uc3QgJCRtb2R1bGVfMF9iaW5kaW5nX2RpcmVjdCA9IC8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoZGlyZWN0LCAiZGlyZWN0IiksICJuYW1lIiwgeyB2YWx1ZTogImRpcmVjdCIgfSk7CmV4cG9ydCB7ICQkbW9kdWxlXzBfYmluZGluZ19kaXJlY3QgYXMgZGlyZWN0IH07CmNvbnN0ICQkbW9kdWxlXzFfYmluZGluZ19pbmRpcmVjdCA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZShpbmRpcmVjdCwgImluZGlyZWN0Iik7CmV4cG9ydCB7ICQkbW9kdWxlXzFfYmluZGluZ19pbmRpcmVjdCBhcyBpbmRpcmVjdCB9OwozNzAAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlyZWN0KCkge31cblxuY29uc3QgaW5kaXJlY3QgPSBhc3luYyAoKSA9PiB7fVxuZXhwb3J0IHsgaW5kaXJlY3QgfVxuXG5jb25zdW1lKGRpcmVjdCwgaW5kaXJlY3QpXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWhDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFHOUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVE7Ozs7OzsifQ==)

```js
async function direct() {}

const indirect = async () => {}


consume(direct, indirect)

const $$module_0_binding_direct = /* #__PURE__ */ Object.defineProperty(registerServerReference(direct, "direct"), "name", { value: "direct" });
export { $$module_0_binding_direct as direct };
const $$module_1_binding_indirect = /* #__PURE__ */ registerServerReference(indirect, "indirect");
export { $$module_1_binding_indirect as indirect };
```
