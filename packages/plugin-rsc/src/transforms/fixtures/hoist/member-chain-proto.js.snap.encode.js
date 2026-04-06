function outer() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([{ ["__proto__"]: { y: x.__proto__.y }, a: { ["__proto__"]: { b: x.a.__proto__.b } } }]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [x] = __dec($$hoist_encoded);
'use server'
    return [x.__proto__.y, x.a.__proto__.b]
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
