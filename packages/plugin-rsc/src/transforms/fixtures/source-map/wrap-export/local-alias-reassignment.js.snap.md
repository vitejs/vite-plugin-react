## Input

```js
'use server'

let action = async () => 'first'
export { action as renamed }
action = async () => 'second'
```

## wrap-export

**Status:** transformed

**References:** renamed

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTk5ACd1c2Ugc2VydmVyJwoKbGV0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdmaXJzdCcKCmFjdGlvbiA9IGFzeW5jICgpID0+ICdzZWNvbmQnCjsKY29uc3QgJCR3cmFwX2FjdGlvbiA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZShhY3Rpb24sICJyZW5hbWVkIik7CmV4cG9ydCB7ICQkd3JhcF9hY3Rpb24gYXMgcmVuYW1lZCB9OwozNzcAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxubGV0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdmaXJzdCdcbmV4cG9ydCB7IGFjdGlvbiBhcyByZW5hbWVkIH1cbmFjdGlvbiA9IGFzeW5jICgpID0+ICdzZWNvbmQnXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLOztBQUUvQixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07Ozs7In0=)

```js
'use server'

let action = async () => 'first'

action = async () => 'second'
;
const $$wrap_action = /* #__PURE__ */ registerServerReference(action, "renamed");
export { $$wrap_action as renamed };
```

## module-export-effect

**Status:** transformed

**References:** renamed

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTUwACd1c2Ugc2VydmVyJwoKbGV0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdmaXJzdCcKZXhwb3J0IHsgYWN0aW9uIGFzIHJlbmFtZWQgfQphY3Rpb24gPSBhc3luYyAoKSA9PiAnc2Vjb25kJwoKcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoYWN0aW9uLCAicmVuYW1lZCIpOzQzMAB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5sZXQgYWN0aW9uID0gYXN5bmMgKCkgPT4gJ2ZpcnN0J1xuZXhwb3J0IHsgYWN0aW9uIGFzIHJlbmFtZWQgfVxuYWN0aW9uID0gYXN5bmMgKCkgPT4gJ3NlY29uZCdcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDL0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQztBQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07OyJ9)

```js
'use server'

let action = async () => 'first'
export { action as renamed }
action = async () => 'second'

registerServerReference(action, "renamed");
```

## proxy-export

**Status:** transformed

**References:** renamed

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzgACgoKZXhwb3J0IGNvbnN0IHJlbmFtZWQgPSAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJyZW5hbWVkIik7CgoKMTk2AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmxldCBhY3Rpb24gPSBhc3luYyAoKSA9PiAnZmlyc3QnXG5leHBvcnQgeyBhY3Rpb24gYXMgcmVuYW1lZCB9XG5hY3Rpb24gPSBhc3luYyAoKSA9PiAnc2Vjb25kJ1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBOzs7In0=)

```js



export const renamed = /* #__PURE__ */ createServerReference("renamed");


```
