## Input

```js
'use server'

export const first = async () => 'first action called',
  second = first
```

## wrap-export

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjQ4ACd1c2Ugc2VydmVyJwoKbGV0IGZpcnN0ID0gYXN5bmMgKCkgPT4gJ2ZpcnN0IGFjdGlvbiBjYWxsZWQnLAogIHNlY29uZCA9IGZpcnN0CmZpcnN0ID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGZpcnN0LCAiZmlyc3QiKTsKZXhwb3J0IHsgZmlyc3QgfTsKc2Vjb25kID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKHNlY29uZCwgInNlY29uZCIpOwpleHBvcnQgeyBzZWNvbmQgfTsKMzU4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBjb25zdCBmaXJzdCA9IGFzeW5jICgpID0+ICdmaXJzdCBhY3Rpb24gY2FsbGVkJyxcbiAgc2Vjb25kID0gZmlyc3RcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVKLEdBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBRFg7QUFBQTtBQUFBO0FBQUE7In0=)

```js
'use server'

let first = async () => 'first action called',
  second = first
first = /* #__PURE__ */ registerServerReference(first, "first");
export { first };
second = /* #__PURE__ */ registerServerReference(second, "second");
export { second };
```

## module-export-effect

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTkxACd1c2Ugc2VydmVyJwoKY29uc3QgZmlyc3QgPSBhc3luYyAoKSA9PiAnZmlyc3QgYWN0aW9uIGNhbGxlZCcsCiAgc2Vjb25kID0gZmlyc3QKCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGZpcnN0LCAiZmlyc3QiKTsKcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2Uoc2Vjb25kLCAic2Vjb25kIik7CmV4cG9ydCB7IGZpcnN0LCBzZWNvbmQgfTsKMzU4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBjb25zdCBmaXJzdCA9IGFzeW5jICgpID0+ICdmaXJzdCBhY3Rpb24gY2FsbGVkJyxcbiAgc2Vjb25kID0gZmlyc3RcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVKLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBRFg7QUFBQTtBQUFBO0FBQUE7In0=)

```js
'use server'

const first = async () => 'first action called',
  second = first

registerServerReference(first, "first");
registerServerReference(second, "second");
export { first, second };
```

## module-export-wrap

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#NDA5ACd1c2Ugc2VydmVyJwoKY29uc3QgZmlyc3QgPSBhc3luYyAoKSA9PiAnZmlyc3QgYWN0aW9uIGNhbGxlZCcsCiAgc2Vjb25kID0gZmlyc3QKCmNvbnN0ICQkbW9kdWxlXzBfYmluZGluZ19maXJzdCA9IC8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoZmlyc3QsICJmaXJzdCIpLCAibmFtZSIsIHsgdmFsdWU6ICJmaXJzdCIgfSk7CmV4cG9ydCB7ICQkbW9kdWxlXzBfYmluZGluZ19maXJzdCBhcyBmaXJzdCB9Owpjb25zdCAkJG1vZHVsZV8xX2JpbmRpbmdfc2Vjb25kID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKHNlY29uZCwgInNlY29uZCIpOwpleHBvcnQgeyAkJG1vZHVsZV8xX2JpbmRpbmdfc2Vjb25kIGFzIHNlY29uZCB9OwozNDMAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGNvbnN0IGZpcnN0ID0gYXN5bmMgKCkgPT4gJ2ZpcnN0IGFjdGlvbiBjYWxsZWQnLFxuICBzZWNvbmQgPSBmaXJzdFxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRUosS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDdEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Ozs7OzsifQ==)

```js
'use server'

const first = async () => 'first action called',
  second = first

const $$module_0_binding_first = /* #__PURE__ */ Object.defineProperty(registerServerReference(first, "first"), "name", { value: "first" });
export { $$module_0_binding_first as first };
const $$module_1_binding_second = /* #__PURE__ */ registerServerReference(second, "second");
export { $$module_1_binding_second as second };
```
