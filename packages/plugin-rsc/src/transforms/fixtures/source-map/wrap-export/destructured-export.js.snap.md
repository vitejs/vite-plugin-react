## Input

```js
'use server'

const source = async () => 'destructured export called'

export const { action } = { action: source }
```

## wrap-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTk0ACd1c2Ugc2VydmVyJwoKY29uc3Qgc291cmNlID0gYXN5bmMgKCkgPT4gJ2Rlc3RydWN0dXJlZCBleHBvcnQgY2FsbGVkJwoKbGV0IHsgYWN0aW9uIH0gPSB7IGFjdGlvbjogc291cmNlIH0KYWN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwpleHBvcnQgeyBhY3Rpb24gfTsKNDMwAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmNvbnN0IHNvdXJjZSA9IGFzeW5jICgpID0+ICdkZXN0cnVjdHVyZWQgZXhwb3J0IGNhbGxlZCdcblxuZXhwb3J0IGNvbnN0IHsgYWN0aW9uIH0gPSB7IGFjdGlvbjogc291cmNlIH1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTTs7QUFFL0MsR0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQTNDO0FBQUE7In0=)

```js
'use server'

const source = async () => 'destructured export called'

let { action } = { action: source }
action = /* #__PURE__ */ registerServerReference(action, "action");
export { action };
```

## module-export

**Status:** error

```text
unsupported destructured export declaration
```

## module-export-effect

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTYwACd1c2Ugc2VydmVyJwoKY29uc3Qgc291cmNlID0gYXN5bmMgKCkgPT4gJ2Rlc3RydWN0dXJlZCBleHBvcnQgY2FsbGVkJwoKZXhwb3J0IGNvbnN0IHsgYWN0aW9uIH0gPSB7IGFjdGlvbjogc291cmNlIH0KCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwo0MzEAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuY29uc3Qgc291cmNlID0gYXN5bmMgKCkgPT4gJ2Rlc3RydWN0dXJlZCBleHBvcnQgY2FsbGVkJ1xuXG5leHBvcnQgY29uc3QgeyBhY3Rpb24gfSA9IHsgYWN0aW9uOiBzb3VyY2UgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNOztBQUV0RCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDOzs7In0=)

```js
'use server'

const source = async () => 'destructured export called'

export const { action } = { action: source }

registerServerReference(action, "action");
```

## module-export-hoist

**Status:** unchanged

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTE2ACd1c2Ugc2VydmVyJwoKY29uc3Qgc291cmNlID0gYXN5bmMgKCkgPT4gJ2Rlc3RydWN0dXJlZCBleHBvcnQgY2FsbGVkJwoKZXhwb3J0IGNvbnN0IHsgYWN0aW9uIH0gPSB7IGFjdGlvbjogc291cmNlIH0KNDI5AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmNvbnN0IHNvdXJjZSA9IGFzeW5jICgpID0+ICdkZXN0cnVjdHVyZWQgZXhwb3J0IGNhbGxlZCdcblxuZXhwb3J0IGNvbnN0IHsgYWN0aW9uIH0gPSB7IGFjdGlvbjogc291cmNlIH1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTTs7QUFFdEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQzsifQ==)

```js
'use server'

const source = async () => 'destructured export called'

export const { action } = { action: source }
```
