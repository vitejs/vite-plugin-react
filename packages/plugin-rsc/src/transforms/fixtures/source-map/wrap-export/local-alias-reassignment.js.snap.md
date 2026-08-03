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

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTUyACd1c2Ugc2VydmVyJwoKbGV0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdmaXJzdCcKCmFjdGlvbiA9IGFzeW5jICgpID0+ICdzZWNvbmQnCgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZShhY3Rpb24sICJyZW5hbWVkIik7CmV4cG9ydCB7IGFjdGlvbiBhcyByZW5hbWVkIH0KMzkwAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmxldCBhY3Rpb24gPSBhc3luYyAoKSA9PiAnZmlyc3QnXG5leHBvcnQgeyBhY3Rpb24gYXMgcmVuYW1lZCB9XG5hY3Rpb24gPSBhc3luYyAoKSA9PiAnc2Vjb25kJ1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSzs7QUFFL0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBRDVCO0FBQUE7QUFBQTsifQ==)

```js
'use server'

let action = async () => 'first'

action = async () => 'second'

registerServerReference(action, "renamed");
export { action as renamed }
```
