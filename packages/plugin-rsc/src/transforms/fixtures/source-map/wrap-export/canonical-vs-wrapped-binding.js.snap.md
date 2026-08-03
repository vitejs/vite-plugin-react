## Input

```js
export async function direct() {}

let indirect = async () => {}
export { indirect }

consume(direct, indirect)
```

## wrap-export

**Status:** transformed

**References:** direct, indirect

[Source map visualization](https://evanw.github.io/source-map-visualization/#MzAyAGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9CgpsZXQgaW5kaXJlY3QgPSBhc3luYyAoKSA9PiB7fQoKCmNvbnN1bWUoZGlyZWN0LCBpbmRpcmVjdCkKZGlyZWN0ID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGRpcmVjdCwgImRpcmVjdCIpOwpleHBvcnQgeyBkaXJlY3QgfTsKOwpjb25zdCAkJHdyYXBfaW5kaXJlY3QgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoaW5kaXJlY3QsICJpbmRpcmVjdCIpOwpleHBvcnQgeyAkJHdyYXBfaW5kaXJlY3QgYXMgaW5kaXJlY3QgfTsKMzc3AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9XG5cbmxldCBpbmRpcmVjdCA9IGFzeW5jICgpID0+IHt9XG5leHBvcnQgeyBpbmRpcmVjdCB9XG5cbmNvbnN1bWUoZGlyZWN0LCBpbmRpcmVjdClcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBTyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFaEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7OztBQUc1QixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUTtBQUx4QjtBQUFBOzs7OyJ9)

```js
async function direct() {}

let indirect = async () => {}


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

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjE1AGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9CgpsZXQgaW5kaXJlY3QgPSBhc3luYyAoKSA9PiB7fQpleHBvcnQgeyBpbmRpcmVjdCB9Cgpjb25zdW1lKGRpcmVjdCwgaW5kaXJlY3QpCgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZShkaXJlY3QsICJkaXJlY3QiKTsKZXhwb3J0IHsgZGlyZWN0IH07CgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZShpbmRpcmVjdCwgImluZGlyZWN0Iik7NDE1AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9XG5cbmxldCBpbmRpcmVjdCA9IGFzeW5jICgpID0+IHt9XG5leHBvcnQgeyBpbmRpcmVjdCB9XG5cbmNvbnN1bWUoZGlyZWN0LCBpbmRpcmVjdClcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBTyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFaEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7O0FBRWxCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRO0FBTHhCO0FBQUE7QUFBQTs7In0=)

```js
async function direct() {}

let indirect = async () => {}
export { indirect }

consume(direct, indirect)

registerServerReference(direct, "direct");
export { direct };

registerServerReference(indirect, "indirect");
```

## module-export-wrap

**Status:** transformed

**References:** direct, indirect

[Source map visualization](https://evanw.github.io/source-map-visualization/#NDY2AApjb25zdCAkJG1vZHVsZV8wX2ltcGxlbWVudGF0aW9uX2RpcmVjdCA9IGFzeW5jIGZ1bmN0aW9uICQkbW9kdWxlXzBfaW1wbGVtZW50YXRpb25fZGlyZWN0KCkge307CmV4cG9ydCBjb25zdCBkaXJlY3QgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkbW9kdWxlXzBfaW1wbGVtZW50YXRpb25fZGlyZWN0LCAibmFtZSIsIHsgdmFsdWU6ICJkaXJlY3QiIH0pLCAiZGlyZWN0Iik7CgpsZXQgaW5kaXJlY3QgPSBhc3luYyAoKSA9PiB7fQoKCmNvbnN1bWUoZGlyZWN0LCBpbmRpcmVjdCkKCmNvbnN0ICQkbW9kdWxlXzFfYmluZGluZ19pbmRpcmVjdCA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZShpbmRpcmVjdCwgImluZGlyZWN0Iik7CmV4cG9ydCB7ICQkbW9kdWxlXzFfYmluZGluZ19pbmRpcmVjdCBhcyBpbmRpcmVjdCB9OwozMzkAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlyZWN0KCkge31cblxubGV0IGluZGlyZWN0ID0gYXN5bmMgKCkgPT4ge31cbmV4cG9ydCB7IGluZGlyZWN0IH1cblxuY29uc3VtZShkaXJlY3QsIGluZGlyZWN0KVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFPO0FBQUEsMkZBQXdCLENBQUM7OztBQUVoQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7O0FBRzVCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFROzs7OyJ9)

```js

const $$module_0_implementation_direct = async function $$module_0_implementation_direct() {};
export const direct = /* #__PURE__ */ registerServerReference(Object.defineProperty($$module_0_implementation_direct, "name", { value: "direct" }), "direct");

let indirect = async () => {}


consume(direct, indirect)

const $$module_1_binding_indirect = /* #__PURE__ */ registerServerReference(indirect, "indirect");
export { $$module_1_binding_indirect as indirect };
```
