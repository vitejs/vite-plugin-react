## Input

```js
export function InlineDirective() {
  const captured = 'captured'

  async function inlineAction() {
    'use server'
    return 'inline directive called'
  }

  const inlineArrow = async (suffix = 'arrow') => {
    'use server'
    return `${captured} ${suffix} called`
  }

  consume(inlineAction, inlineArrow, async function () {
    'use server'
    return 'inline function expression called'
  })
}
```

## hoist

**Status:** transformed

**References:** $$hoist_0_inlineAction, $$hoist_1_inlineArrow, $$hoist_2_anonymous_server_function

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTI0MABleHBvcnQgZnVuY3Rpb24gSW5saW5lRGlyZWN0aXZlKCkgewogIGNvbnN0IGNhcHR1cmVkID0gJ2NhcHR1cmVkJwoKICBjb25zdCBpbmxpbmVBY3Rpb24gPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRob2lzdF8wX2lubGluZUFjdGlvbiwgIiQkaG9pc3RfMF9pbmxpbmVBY3Rpb24iKTsKCiAgY29uc3QgaW5saW5lQXJyb3cgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRob2lzdF8xX2lubGluZUFycm93LCAiJCRob2lzdF8xX2lubGluZUFycm93IikuYmluZChudWxsLCBlbmNyeXB0KFtjYXB0dXJlZF0pKQoKICBjb25zdW1lKGlubGluZUFjdGlvbiwgaW5saW5lQXJyb3csIC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGhvaXN0XzJfYW5vbnltb3VzX3NlcnZlcl9mdW5jdGlvbiwgIiQkaG9pc3RfMl9hbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uIikpCn0KCjtleHBvcnQgYXN5bmMgZnVuY3Rpb24gJCRob2lzdF8wX2lubGluZUFjdGlvbigpIHsKICAgICd1c2Ugc2VydmVyJwogICAgcmV0dXJuICdpbmxpbmUgZGlyZWN0aXZlIGNhbGxlZCcKICB9OwovKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkaG9pc3RfMF9pbmxpbmVBY3Rpb24sICJuYW1lIiwgeyB2YWx1ZTogImlubGluZUFjdGlvbiIgfSk7Cgo7ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uICQkaG9pc3RfMV9pbmxpbmVBcnJvdygkJGhvaXN0X2VuY29kZWQsIHN1ZmZpeCA9ICdhcnJvdycpIHsKICAgIGNvbnN0IFtjYXB0dXJlZF0gPSBhd2FpdCBkZWNyeXB0KCQkaG9pc3RfZW5jb2RlZCk7Cid1c2Ugc2VydmVyJwogICAgcmV0dXJuIGAke2NhcHR1cmVkfSAke3N1ZmZpeH0gY2FsbGVkYAogIH07Ci8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkoJCRob2lzdF8xX2lubGluZUFycm93LCAibmFtZSIsIHsgdmFsdWU6ICJpbmxpbmVBcnJvdyIgfSk7Cgo7ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uICQkaG9pc3RfMl9hbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uKCkgewogICAgJ3VzZSBzZXJ2ZXInCiAgICByZXR1cm4gJ2lubGluZSBmdW5jdGlvbiBleHByZXNzaW9uIGNhbGxlZCcKICB9OwovKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkaG9pc3RfMl9hbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uLCAibmFtZSIsIHsgdmFsdWU6ICJhbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uIiB9KTsKMTE5MgB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBJbmxpbmVEaXJlY3RpdmUoKSB7XG4gIGNvbnN0IGNhcHR1cmVkID0gJ2NhcHR1cmVkJ1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGlubGluZUFjdGlvbigpIHtcbiAgICAndXNlIHNlcnZlcidcbiAgICByZXR1cm4gJ2lubGluZSBkaXJlY3RpdmUgY2FsbGVkJ1xuICB9XG5cbiAgY29uc3QgaW5saW5lQXJyb3cgPSBhc3luYyAoc3VmZml4ID0gJ2Fycm93JykgPT4ge1xuICAgICd1c2Ugc2VydmVyJ1xuICAgIHJldHVybiBgJHtjYXB0dXJlZH0gJHtzdWZmaXh9IGNhbGxlZGBcbiAgfVxuXG4gIGNvbnN1bWUoaW5saW5lQWN0aW9uLCBpbmxpbmVBcnJvdywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc2VydmVyJ1xuICAgIHJldHVybiAnaW5saW5lIGZ1bmN0aW9uIGV4cHJlc3Npb24gY2FsbGVkJ1xuICB9KVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFROztBQUU1QixDQUFDOztBQUtELENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7O0FBS3JCLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLG9IQUdqQztBQUNIO0FBZEU7QUFBQSxnREFBOEI7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDbkMsQ0FBQyxDQUFDOztBQUVvQjtBQUFBLGdGQUE0QjtBQUNsRCxDQUFDLENBQUMsQ0FBQztBQUFDLENBQUMsR0FBRyxDQUFDLE1BQU07QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTTtBQUN4QyxDQUFDLENBQUM7O0FBRW1DO0FBQUEsNkRBQWtCO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTTtBQUM3QyxDQUFDLENBQUM7OyJ9)

```js
export function InlineDirective() {
  const captured = 'captured'

  const inlineAction = /* #__PURE__ */ registerServerReference($$hoist_0_inlineAction, "$$hoist_0_inlineAction");

  const inlineArrow = /* #__PURE__ */ registerServerReference($$hoist_1_inlineArrow, "$$hoist_1_inlineArrow").bind(null, encrypt([captured]))

  consume(inlineAction, inlineArrow, /* #__PURE__ */ registerServerReference($$hoist_2_anonymous_server_function, "$$hoist_2_anonymous_server_function"))
}

;export async function $$hoist_0_inlineAction() {
    'use server'
    return 'inline directive called'
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_inlineAction, "name", { value: "inlineAction" });

;export async function $$hoist_1_inlineArrow($$hoist_encoded, suffix = 'arrow') {
    const [captured] = await decrypt($$hoist_encoded);
'use server'
    return `${captured} ${suffix} called`
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_inlineArrow, "name", { value: "inlineArrow" });

;export async function $$hoist_2_anonymous_server_function() {
    'use server'
    return 'inline function expression called'
  };
/* #__PURE__ */ Object.defineProperty($$hoist_2_anonymous_server_function, "name", { value: "anonymous_server_function" });
```
