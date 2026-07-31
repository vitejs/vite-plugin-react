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

## module-export

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#Mjc0ACd1c2Ugc2VydmVyJwoKY29uc3QgZmlyc3QkJGltcGwgPSBhc3luYyAoKSA9PiAnZmlyc3QgYWN0aW9uIGNhbGxlZCcsCiAgc2Vjb25kJCRpbXBsID0gZmlyc3QKY29uc3QgZmlyc3QgPSByZWdpc3RlclNlcnZlclJlZmVyZW5jZShmaXJzdCQkaW1wbCwgImZpcnN0Iik7CmV4cG9ydCB7IGZpcnN0IGFzIGZpcnN0IH07CmNvbnN0IHNlY29uZCA9IHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKHNlY29uZCQkaW1wbCwgInNlY29uZCIpOwpleHBvcnQgeyBzZWNvbmQgYXMgc2Vjb25kIH07CgozNDMAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGNvbnN0IGZpcnN0ID0gYXN5bmMgKCkgPT4gJ2ZpcnN0IGFjdGlvbiBjYWxsZWQnLFxuICBzZWNvbmQgPSBmaXJzdFxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRUosS0FBSyxDQUFDLFdBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDdEQsQ0FBQyxDQUFDLFlBQU0sQ0FBQyxDQUFDLENBQUM7Ozs7OzsifQ==)

```js
'use server'

const first$$impl = async () => 'first action called',
  second$$impl = first
const first = registerServerReference(first$$impl, "first");
export { first as first };
const second = registerServerReference(second$$impl, "second");
export { second as second };

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

## module-export-hoist

**Status:** transformed

**References:** first

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjkzACd1c2Ugc2VydmVyJwoKZXhwb3J0IGNvbnN0IGZpcnN0ID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkbW9kdWxlX2hvaXN0XzBfZmlyc3QsICJmaXJzdCIpLAogIHNlY29uZCA9IGZpcnN0Cgo7YXN5bmMgZnVuY3Rpb24gJCRtb2R1bGVfaG9pc3RfMF9maXJzdCgpIHsgcmV0dXJuICdmaXJzdCBhY3Rpb24gY2FsbGVkJyB9OwovKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkbW9kdWxlX2hvaXN0XzBfZmlyc3QsICJuYW1lIiwgeyB2YWx1ZTogImZpcnN0IiB9KTsKMzIyAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBjb25zdCBmaXJzdCA9IGFzeW5jICgpID0+ICdmaXJzdCBhY3Rpb24gY2FsbGVkJyxcbiAgc2Vjb25kID0gZmlyc3RcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMseUVBQWtDO0FBQ3RELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBRFU7QUFBQSxrREFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTTs7In0=)

```js
'use server'

export const first = /* #__PURE__ */ registerServerReference($$module_hoist_0_first, "first"),
  second = first

;async function $$module_hoist_0_first() { return 'first action called' };
/* #__PURE__ */ Object.defineProperty($$module_hoist_0_first, "name", { value: "first" });
```
