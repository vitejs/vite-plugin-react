## Input

```js
'use server'

void action

export async function action() {
  return 'action called'
}
```

## wrap-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTY3ACd1c2Ugc2VydmVyJwoKdm9pZCBhY3Rpb24KCmFzeW5jIGZ1bmN0aW9uIGFjdGlvbigpIHsKICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnCn0KYWN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwpleHBvcnQgeyBhY3Rpb24gfTsKMzE4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbnZvaWQgYWN0aW9uXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3Rpb24oKSB7XG4gIHJldHVybiAnYWN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLElBQUksQ0FBQzs7QUFFRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQ3ZCO0FBRkE7QUFBQTsifQ==)

```js
'use server'

void action

async function action() {
  return 'action called'
}
action = /* #__PURE__ */ registerServerReference(action, "action");
export { action };
```

## module-export-effect

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTQzACd1c2Ugc2VydmVyJwoKdm9pZCBhY3Rpb24KCmFzeW5jIGZ1bmN0aW9uIGFjdGlvbigpIHsKICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnCn0KCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwpleHBvcnQgeyBhY3Rpb24gfTsKMzIzAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbnZvaWQgYWN0aW9uXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3Rpb24oKSB7XG4gIHJldHVybiAnYWN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLElBQUksQ0FBQzs7QUFFRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQ3ZCO0FBRkE7QUFBQTtBQUFBOyJ9)

```js
'use server'

void action

async function action() {
  return 'action called'
}

registerServerReference(action, "action");
export { action };
```

## module-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MzU4ACd1c2Ugc2VydmVyJwoKCmNvbnN0ICQkbW9kdWxlXzBfaW1wbGVtZW50YXRpb25fYWN0aW9uID0gYXN5bmMgZnVuY3Rpb24gJCRtb2R1bGVfMF9pbXBsZW1lbnRhdGlvbl9hY3Rpb24oKSB7CiAgcmV0dXJuICdhY3Rpb24gY2FsbGVkJwp9OwovKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkbW9kdWxlXzBfaW1wbGVtZW50YXRpb25fYWN0aW9uLCAibmFtZSIsIHsgdmFsdWU6ICJhY3Rpb24iIH0pOwp2b2lkIGFjdGlvbgoKZXhwb3J0IGNvbnN0IGFjdGlvbiA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJG1vZHVsZV8wX2ltcGxlbWVudGF0aW9uX2FjdGlvbiwgImFjdGlvbiIpOwoyODIAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxudm9pZCBhY3Rpb25cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjdGlvbigpIHtcbiAgcmV0dXJuICdhY3Rpb24gY2FsbGVkJ1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBSUo7QUFBQSwyRkFBd0I7QUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQ3ZCOztBQUpBLElBQUksQ0FBQzs7OyJ9)

```js
'use server'


const $$module_0_implementation_action = async function $$module_0_implementation_action() {
  return 'action called'
};
/* #__PURE__ */ Object.defineProperty($$module_0_implementation_action, "name", { value: "action" });
void action

export const action = /* #__PURE__ */ registerServerReference($$module_0_implementation_action, "action");
```
