// The hoist transform must preserve `function*` / `async function*` syntax.
// Previously the `*` was dropped, making `yield` a SyntaxError.
function outer() {
  const items = [1, 2, 3]

  const stream = /* #__PURE__ */ $$register($$hoist_0_stream, "<id>", "$$hoist_0_stream").bind(null, items);

  return stream
}

;export async function* $$hoist_0_stream(items) {
    'use server'
    for (const item of items) {
      yield item
    }
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_stream, "name", { value: "stream" });
