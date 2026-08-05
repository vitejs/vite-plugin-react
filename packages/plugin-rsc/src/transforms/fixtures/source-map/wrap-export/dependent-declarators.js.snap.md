## Input

```js
'use server'

export const first = async () => 'first action called',
  second = first
```

## wrap-export

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjM3ACd1c2Ugc2VydmVyJwoKbGV0IGZpcnN0ID0gYXN5bmMgKCkgPT4gJ2ZpcnN0IGFjdGlvbiBjYWxsZWQnLAogIHNlY29uZCA9IGZpcnN0CmZpcnN0ID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGZpcnN0LCAiZmlyc3QiKTsKc2Vjb25kID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKHNlY29uZCwgInNlY29uZCIpOwpleHBvcnQgeyBmaXJzdCwgc2Vjb25kIH07CjM1MwB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgY29uc3QgZmlyc3QgPSBhc3luYyAoKSA9PiAnZmlyc3QgYWN0aW9uIGNhbGxlZCcsXG4gIHNlY29uZCA9IGZpcnN0XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFSixHQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUN0RCxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQURYO0FBQUE7QUFBQTsifQ==)

```js
'use server'

let first = async () => 'first action called',
  second = first
first = /* #__PURE__ */ registerServerReference(first, "first");
second = /* #__PURE__ */ registerServerReference(second, "second");
export { first, second };
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

## proxy-export

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTQzAAoKZXhwb3J0IGNvbnN0IGZpcnN0ID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgiZmlyc3QiKTsKZXhwb3J0IGNvbnN0IHNlY29uZCA9IC8qICNfX1BVUkVfXyAqLyBjcmVhdGVTZXJ2ZXJSZWZlcmVuY2UoInNlY29uZCIpOwoKMTc5AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBjb25zdCBmaXJzdCA9IGFzeW5jICgpID0+ICdmaXJzdCBhY3Rpb24gY2FsbGVkJyxcbiAgc2Vjb25kID0gZmlyc3RcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBO0FBQUE7OyJ9)

```js


export const first = /* #__PURE__ */ createServerReference("first");
export const second = /* #__PURE__ */ createServerReference("second");

```
