function outer1() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([x]));
}

function outer2() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_1_action, "<id>", "$$hoist_1_action").bind(null, __enc([{ y: x.y }]));
}

function outer3() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_2_action, "<id>", "$$hoist_2_action").bind(null, __enc([x]));
}

function outer4() {
  const x = {}
  const y = 'y'
  const action = /* #__PURE__ */ $$register($$hoist_3_action, "<id>", "$$hoist_3_action").bind(null, __enc([x, y]));
}

function outer5() {
  const x = {}
  const k = 'k'
  const action = /* #__PURE__ */ $$register($$hoist_4_action, "<id>", "$$hoist_4_action").bind(null, __enc([{ y: x.y }, k]));
}

function outer6() {
  const x = {}
  const y = 'y'
  const action = /* #__PURE__ */ $$register($$hoist_5_action, "<id>", "$$hoist_5_action").bind(null, __enc([x, y]));
}

function outer7() {
  const a = {}
  const action = /* #__PURE__ */ $$register($$hoist_6_action, "<id>", "$$hoist_6_action").bind(null, __enc([{ b: a.b }]));
}

function outer8() {
  const a = {}
  const b = 'b'
  const action = /* #__PURE__ */ $$register($$hoist_7_action, "<id>", "$$hoist_7_action").bind(null, __enc([a, b]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [x] = __dec($$hoist_encoded);
'use server'
    return x?.y.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });

;export async function $$hoist_1_action($$hoist_encoded) {
    const [x] = __dec($$hoist_encoded);
'use server'
    return x.y?.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_action, "name", { value: "action" });

;export async function $$hoist_2_action($$hoist_encoded) {
    const [x] = __dec($$hoist_encoded);
'use server'
    return x?.y?.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_2_action, "name", { value: "action" });

;export async function $$hoist_3_action($$hoist_encoded) {
    const [x,y] = __dec($$hoist_encoded);
'use server'
    return x[y].z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_3_action, "name", { value: "action" });

;export async function $$hoist_4_action($$hoist_encoded) {
    const [x,k] = __dec($$hoist_encoded);
'use server'
    return x.y[k]
  };
/* #__PURE__ */ Object.defineProperty($$hoist_4_action, "name", { value: "action" });

;export async function $$hoist_5_action($$hoist_encoded) {
    const [x,y] = __dec($$hoist_encoded);
'use server'
    return x[y]?.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_5_action, "name", { value: "action" });

;export async function $$hoist_6_action($$hoist_encoded) {
    const [a] = __dec($$hoist_encoded);
'use server'
    return a.b?.c
  };
/* #__PURE__ */ Object.defineProperty($$hoist_6_action, "name", { value: "action" });

;export async function $$hoist_7_action($$hoist_encoded) {
    const [a,b] = __dec($$hoist_encoded);
'use server'
    return a[b].c
  };
/* #__PURE__ */ Object.defineProperty($$hoist_7_action, "name", { value: "action" });
