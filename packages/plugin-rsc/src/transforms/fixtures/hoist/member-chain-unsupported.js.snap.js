function outer1() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, x);
}

function outer2() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_1_action, "<id>", "$$hoist_1_action").bind(null, { y: x.y });
}

function outer3() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_2_action, "<id>", "$$hoist_2_action").bind(null, x);
}

function outer4() {
  const x = {}
  const y = 'y'
  const action = /* #__PURE__ */ $$register($$hoist_3_action, "<id>", "$$hoist_3_action").bind(null, x, y);
}

function outer5() {
  const x = {}
  const k = 'k'
  const action = /* #__PURE__ */ $$register($$hoist_4_action, "<id>", "$$hoist_4_action").bind(null, { y: x.y }, k);
}

function outer6() {
  const x = {}
  const y = 'y'
  const action = /* #__PURE__ */ $$register($$hoist_5_action, "<id>", "$$hoist_5_action").bind(null, x, y);
}

function outer7() {
  const a = {}
  const action = /* #__PURE__ */ $$register($$hoist_6_action, "<id>", "$$hoist_6_action").bind(null, { b: a.b });
}

function outer8() {
  const a = {}
  const b = 'b'
  const action = /* #__PURE__ */ $$register($$hoist_7_action, "<id>", "$$hoist_7_action").bind(null, a, b);
}

;export async function $$hoist_0_action(x) {
    'use server'
    return x?.y.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });

;export async function $$hoist_1_action(x) {
    'use server'
    return x.y?.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_action, "name", { value: "action" });

;export async function $$hoist_2_action(x) {
    'use server'
    return x?.y?.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_2_action, "name", { value: "action" });

;export async function $$hoist_3_action(x, y) {
    'use server'
    return x[y].z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_3_action, "name", { value: "action" });

;export async function $$hoist_4_action(x, k) {
    'use server'
    return x.y[k]
  };
/* #__PURE__ */ Object.defineProperty($$hoist_4_action, "name", { value: "action" });

;export async function $$hoist_5_action(x, y) {
    'use server'
    return x[y]?.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_5_action, "name", { value: "action" });

;export async function $$hoist_6_action(a) {
    'use server'
    return a.b?.c
  };
/* #__PURE__ */ Object.defineProperty($$hoist_6_action, "name", { value: "action" });

;export async function $$hoist_7_action(a, b) {
    'use server'
    return a[b].c
  };
/* #__PURE__ */ Object.defineProperty($$hoist_7_action, "name", { value: "action" });
