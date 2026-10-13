## Input

```js
'use server'

let action = async () => 'first'
export default action
action = async () => 'second'
```

## wrap-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjMwACd1c2Ugc2VydmVyJwoKbGV0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdmaXJzdCcKY29uc3QgJCRkZWZhdWx0ID0gYWN0aW9uCmFjdGlvbiA9IGFzeW5jICgpID0+ICdzZWNvbmQnCmNvbnN0ICQkd3JhcF8kJGRlZmF1bHQgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRkZWZhdWx0LCAiZGVmYXVsdCIpOwpleHBvcnQgeyAkJHdyYXBfJCRkZWZhdWx0IGFzIGRlZmF1bHQgfTsKMzc5AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmxldCBhY3Rpb24gPSBhc3luYyAoKSA9PiAnZmlyc3QnXG5leHBvcnQgZGVmYXVsdCBhY3Rpb25cbmFjdGlvbiA9IGFzeW5jICgpID0+ICdzZWNvbmQnXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQy9CLGtCQUFlO0FBQ2YsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNOzs7In0=)

```js
'use server'

let action = async () => 'first'
const $$default = action
action = async () => 'second'
const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, "default");
export { $$wrap_$$default as default };
```

## module-export-effect

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTk4ACd1c2Ugc2VydmVyJwoKbGV0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdmaXJzdCcKY29uc3QgJCRlZmZlY3RfZGVmYXVsdCA9IGFjdGlvbjsKYWN0aW9uID0gYXN5bmMgKCkgPT4gJ3NlY29uZCcKCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkZWZmZWN0X2RlZmF1bHQsICJkZWZhdWx0Iik7CmV4cG9ydCBkZWZhdWx0ICQkZWZmZWN0X2RlZmF1bHQ7CjM4NwB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5sZXQgYWN0aW9uID0gYXN5bmMgKCkgPT4gJ2ZpcnN0J1xuZXhwb3J0IGRlZmF1bHQgYWN0aW9uXG5hY3Rpb24gPSBhc3luYyAoKSA9PiAnc2Vjb25kJ1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN6QjtBQUNOLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUQ1QjtBQUFBO0FBQUE7In0=)

```js
'use server'

let action = async () => 'first'
const $$effect_default = action;
action = async () => 'second'

registerServerReference($$effect_default, "default");
export default $$effect_default;
```

## proxy-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzAACgoKZXhwb3J0IGRlZmF1bHQgLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgiZGVmYXVsdCIpOwoKCjE4OQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5sZXQgYWN0aW9uID0gYXN5bmMgKCkgPT4gJ2ZpcnN0J1xuZXhwb3J0IGRlZmF1bHQgYWN0aW9uXG5hY3Rpb24gPSBhc3luYyAoKSA9PiAnc2Vjb25kJ1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBOzs7In0=)

```js



export default /* #__PURE__ */ createServerReference("default");


```
