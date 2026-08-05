## Input

```js
'use server'

async function value() {
  return 'multiple aliases called'
}

export { value as first, value as second }
```

## wrap-export

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#MzA2ACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gdmFsdWUoKSB7CiAgcmV0dXJuICdtdWx0aXBsZSBhbGlhc2VzIGNhbGxlZCcKfQoKCjsKY29uc3QgJCR3cmFwX3ZhbHVlID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKHZhbHVlLCAiZmlyc3QiKTsKZXhwb3J0IHsgJCR3cmFwX3ZhbHVlIGFzIGZpcnN0IH07CmNvbnN0ICQkd3JhcF92YWx1ZSA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSh2YWx1ZSwgInNlY29uZCIpOwpleHBvcnQgeyAkJHdyYXBfdmFsdWUgYXMgc2Vjb25kIH07CjM0MgB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5hc3luYyBmdW5jdGlvbiB2YWx1ZSgpIHtcbiAgcmV0dXJuICdtdWx0aXBsZSBhbGlhc2VzIGNhbGxlZCdcbn1cblxuZXhwb3J0IHsgdmFsdWUgYXMgZmlyc3QsIHZhbHVlIGFzIHNlY29uZCB9XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTTtBQUNqQzs7Ozs7Ozs7In0=)

```js
'use server'

async function value() {
  return 'multiple aliases called'
}


;
const $$wrap_value = /* #__PURE__ */ registerServerReference(value, "first");
export { $$wrap_value as first };
const $$wrap_value = /* #__PURE__ */ registerServerReference(value, "second");
export { $$wrap_value as second };
```

## module-export-effect

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjAzACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gdmFsdWUoKSB7CiAgcmV0dXJuICdtdWx0aXBsZSBhbGlhc2VzIGNhbGxlZCcKfQoKZXhwb3J0IHsgdmFsdWUgYXMgZmlyc3QsIHZhbHVlIGFzIHNlY29uZCB9CgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZSh2YWx1ZSwgImZpcnN0Iik7CnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKHZhbHVlLCAic2Vjb25kIik7NDI4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmFzeW5jIGZ1bmN0aW9uIHZhbHVlKCkge1xuICByZXR1cm4gJ211bHRpcGxlIGFsaWFzZXMgY2FsbGVkJ1xufVxuXG5leHBvcnQgeyB2YWx1ZSBhcyBmaXJzdCwgdmFsdWUgYXMgc2Vjb25kIH1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNO0FBQ2pDOztBQUVBLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQzs7OyJ9)

```js
'use server'

async function value() {
  return 'multiple aliases called'
}

export { value as first, value as second }

registerServerReference(value, "first");
registerServerReference(value, "second");
```

## proxy-export

**Status:** transformed

**References:** first, second

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTQ1AAoKCgpleHBvcnQgY29uc3QgZmlyc3QgPSAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJmaXJzdCIpOwpleHBvcnQgY29uc3Qgc2Vjb25kID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgic2Vjb25kIik7CgoyMTcAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuYXN5bmMgZnVuY3Rpb24gdmFsdWUoKSB7XG4gIHJldHVybiAnbXVsdGlwbGUgYWxpYXNlcyBjYWxsZWQnXG59XG5cbmV4cG9ydCB7IHZhbHVlIGFzIGZpcnN0LCB2YWx1ZSBhcyBzZWNvbmQgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFNQTtBQUFBOzsifQ==)

```js




export const first = /* #__PURE__ */ createServerReference("first");
export const second = /* #__PURE__ */ createServerReference("second");

```
