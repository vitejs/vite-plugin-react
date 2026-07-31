/*
Input:

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

  consume(
    inlineAction,
    inlineArrow,
    async function () {
      'use server'
      return 'inline function expression called'
    },
  )
}

Source map visualization:

https://evanw.github.io/source-map-visualization/#MTI2MwBleHBvcnQgZnVuY3Rpb24gSW5saW5lRGlyZWN0aXZlKCkgewogIGNvbnN0IGNhcHR1cmVkID0gJ2NhcHR1cmVkJwoKICBjb25zdCBpbmxpbmVBY3Rpb24gPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRob2lzdF8wX2lubGluZUFjdGlvbiwgIiQkaG9pc3RfMF9pbmxpbmVBY3Rpb24iKTsKCiAgY29uc3QgaW5saW5lQXJyb3cgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRob2lzdF8xX2lubGluZUFycm93LCAiJCRob2lzdF8xX2lubGluZUFycm93IikuYmluZChudWxsLCBlbmNyeXB0KFtjYXB0dXJlZF0pKQoKICBjb25zdW1lKAogICAgaW5saW5lQWN0aW9uLAogICAgaW5saW5lQXJyb3csCiAgICAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRob2lzdF8yX2Fub255bW91c19zZXJ2ZXJfZnVuY3Rpb24sICIkJGhvaXN0XzJfYW5vbnltb3VzX3NlcnZlcl9mdW5jdGlvbiIpLAogICkKfQoKO2V4cG9ydCBhc3luYyBmdW5jdGlvbiAkJGhvaXN0XzBfaW5saW5lQWN0aW9uKCkgewogICAgJ3VzZSBzZXJ2ZXInCiAgICByZXR1cm4gJ2lubGluZSBkaXJlY3RpdmUgY2FsbGVkJwogIH07Ci8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkoJCRob2lzdF8wX2lubGluZUFjdGlvbiwgIm5hbWUiLCB7IHZhbHVlOiAiaW5saW5lQWN0aW9uIiB9KTsKCjtleHBvcnQgYXN5bmMgZnVuY3Rpb24gJCRob2lzdF8xX2lubGluZUFycm93KCQkaG9pc3RfZW5jb2RlZCwgc3VmZml4ID0gJ2Fycm93JykgewogICAgY29uc3QgW2NhcHR1cmVkXSA9IGF3YWl0IGRlY3J5cHQoJCRob2lzdF9lbmNvZGVkKTsKJ3VzZSBzZXJ2ZXInCiAgICByZXR1cm4gYCR7Y2FwdHVyZWR9ICR7c3VmZml4fSBjYWxsZWRgCiAgfTsKLyogI19fUFVSRV9fICovIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkJGhvaXN0XzFfaW5saW5lQXJyb3csICJuYW1lIiwgeyB2YWx1ZTogImlubGluZUFycm93IiB9KTsKCjtleHBvcnQgYXN5bmMgZnVuY3Rpb24gJCRob2lzdF8yX2Fub255bW91c19zZXJ2ZXJfZnVuY3Rpb24oKSB7CiAgICAgICd1c2Ugc2VydmVyJwogICAgICByZXR1cm4gJ2lubGluZSBmdW5jdGlvbiBleHByZXNzaW9uIGNhbGxlZCcKICAgIH07Ci8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkoJCRob2lzdF8yX2Fub255bW91c19zZXJ2ZXJfZnVuY3Rpb24sICJuYW1lIiwgeyB2YWx1ZTogImFub255bW91c19zZXJ2ZXJfZnVuY3Rpb24iIH0pOwoxMzE1AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIElubGluZURpcmVjdGl2ZSgpIHtcbiAgY29uc3QgY2FwdHVyZWQgPSAnY2FwdHVyZWQnXG5cbiAgYXN5bmMgZnVuY3Rpb24gaW5saW5lQWN0aW9uKCkge1xuICAgICd1c2Ugc2VydmVyJ1xuICAgIHJldHVybiAnaW5saW5lIGRpcmVjdGl2ZSBjYWxsZWQnXG4gIH1cblxuICBjb25zdCBpbmxpbmVBcnJvdyA9IGFzeW5jIChzdWZmaXggPSAnYXJyb3cnKSA9PiB7XG4gICAgJ3VzZSBzZXJ2ZXInXG4gICAgcmV0dXJuIGAke2NhcHR1cmVkfSAke3N1ZmZpeH0gY2FsbGVkYFxuICB9XG5cbiAgY29uc3VtZShcbiAgICBpbmxpbmVBY3Rpb24sXG4gICAgaW5saW5lQXJyb3csXG4gICAgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgJ3VzZSBzZXJ2ZXInXG4gICAgICByZXR1cm4gJ2lubGluZSBmdW5jdGlvbiBleHByZXNzaW9uIGNhbGxlZCdcbiAgICB9LFxuICApXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7O0FBRTVCLENBQUM7O0FBS0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQzs7QUFLckIsQ0FBQyxDQUFDLE9BQU87QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVk7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXO0FBQ2YsQ0FBQyxDQUFDLENBQUMsb0hBR0U7QUFDTCxDQUFDLENBQUM7QUFDRjtBQWxCRTtBQUFBLGdEQUE4QjtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU07QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTTtBQUNuQyxDQUFDLENBQUM7O0FBRW9CO0FBQUEsZ0ZBQTRCO0FBQ2xELENBQUMsQ0FBQyxDQUFDO0FBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNO0FBQ3hDLENBQUMsQ0FBQzs7QUFLRTtBQUFBLDZEQUFrQjtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU07QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7In0=
*/

export function InlineDirective() {
  const captured = 'captured'

  const inlineAction = /* #__PURE__ */ registerServerReference($$hoist_0_inlineAction, "$$hoist_0_inlineAction");

  const inlineArrow = /* #__PURE__ */ registerServerReference($$hoist_1_inlineArrow, "$$hoist_1_inlineArrow").bind(null, encrypt([captured]))

  consume(
    inlineAction,
    inlineArrow,
    /* #__PURE__ */ registerServerReference($$hoist_2_anonymous_server_function, "$$hoist_2_anonymous_server_function"),
  )
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
