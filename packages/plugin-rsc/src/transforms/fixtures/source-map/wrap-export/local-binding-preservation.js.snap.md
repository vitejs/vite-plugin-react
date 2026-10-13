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

## proxy-export

**Status:** transformed

**References:** direct, indirect

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTUyAGV4cG9ydCBjb25zdCBkaXJlY3QgPSAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJkaXJlY3QiKTsKCgoKZXhwb3J0IGNvbnN0IGluZGlyZWN0ID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgiaW5kaXJlY3QiKTsKCgoKMjExAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpcmVjdCgpIHt9XG5cbmNvbnN0IGluZGlyZWN0ID0gYXN5bmMgKCkgPT4ge31cbmV4cG9ydCB7IGluZGlyZWN0IH1cblxuY29uc3VtZShkaXJlY3QsIGluZGlyZWN0KVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBR0E7Ozs7In0=)

```js
export const direct = /* #__PURE__ */ createServerReference("direct");



export const indirect = /* #__PURE__ */ createServerReference("indirect");



```
