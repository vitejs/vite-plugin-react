const x = 'x'

const f = /* #__PURE__ */ $$register($$hoist_0_f, "<id>", "$$hoist_0_f");

async function g() {}

export const h = /* #__PURE__ */ $$register($$hoist_1_h, "<id>", "$$hoist_1_h");

const w = /* #__PURE__ */ $$register($$hoist_2_w, "<id>", "$$hoist_2_w");
export default w;

;export async function $$hoist_0_f() {
  'use server'
  return x
};
/* #__PURE__ */ Object.defineProperty($$hoist_0_f, "name", { value: "f" });

;export async function $$hoist_1_h(formData) {
  'use server'
  return formData.get(x)
};
/* #__PURE__ */ Object.defineProperty($$hoist_1_h, "name", { value: "h" });

;export function $$hoist_2_w() {
  'use server'
};
/* #__PURE__ */ Object.defineProperty($$hoist_2_w, "name", { value: "w" });
