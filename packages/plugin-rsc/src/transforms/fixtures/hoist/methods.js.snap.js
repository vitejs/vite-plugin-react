const key = 'computed'

export function createObject(value) {
  return {
    action: /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value),
    [key]: /* #__PURE__ */ $$register($$hoist_1_key, "<id>", "$$hoist_1_key").bind(null, value),
  }
}

export class Actions {
  static action = /* #__PURE__ */ $$register($$hoist_2_action, "<id>", "$$hoist_2_action");

  static ['computed'] = /* #__PURE__ */ $$register($$hoist_3_computed, "<id>", "$$hoist_3_computed");
}

;export async function $$hoist_0_action(value) {
      'use server'
      return value
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });

;export async function $$hoist_1_key(value) {
      'use server'
      return value + 1
    };
/* #__PURE__ */ Object.defineProperty($$hoist_1_key, "name", { value: "key" });

;export async function $$hoist_2_action() {
    'use server'
    return 1
  };
/* #__PURE__ */ Object.defineProperty($$hoist_2_action, "name", { value: "action" });

;export async function $$hoist_3_computed() {
    'use server'
    return 2
  };
/* #__PURE__ */ Object.defineProperty($$hoist_3_computed, "name", { value: "computed" });
