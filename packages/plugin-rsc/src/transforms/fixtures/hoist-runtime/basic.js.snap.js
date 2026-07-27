// names: ["$$hoist_0_noCapture","$$hoist_1_capture","$$hoist_2_exported"]

'custom directive'
export const $$hoist_0_noCapture = /* #__PURE__ */ $$register($$hoist_0_noCapture$$impl, "<id>", "$$hoist_0_noCapture");
export const $$hoist_1_capture = /* #__PURE__ */ $$register($$hoist_1_capture$$impl, "<id>", "$$hoist_1_capture");
export const $$hoist_2_exported = /* #__PURE__ */ $$register($$hoist_2_exported$$impl, "<id>", "$$hoist_2_exported");
import './setup'

const initialized = setup()

const noCapture = $$hoist_0_noCapture;

function Component() {
  const value = 'value'
  const capture = $$hoist_1_capture.bind(null, __enc([value]));
  return capture
}

export const exported = $$hoist_2_exported;

;async function $$hoist_0_noCapture$$impl() {
  'use server'
};
/* #__PURE__ */ Object.defineProperty($$hoist_0_noCapture$$impl, "name", { value: "noCapture" });

;async function $$hoist_1_capture$$impl($$hoist_encoded) {
    const [value] = __dec($$hoist_encoded);
'use server'
    return value
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_capture$$impl, "name", { value: "capture" });

;async function $$hoist_2_exported$$impl() {
  'use server'
};
/* #__PURE__ */ Object.defineProperty($$hoist_2_exported$$impl, "name", { value: "exported" });
