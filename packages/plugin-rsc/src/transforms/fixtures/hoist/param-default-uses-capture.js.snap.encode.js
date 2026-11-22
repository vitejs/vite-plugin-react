function Form(defaultTitle) {
  const save = /* #__PURE__ */ $$register($$hoist_0_save, "<id>", "$$hoist_0_save").bind(null, __enc([defaultTitle]));
}

;export async function $$hoist_0_save($$hoist_encoded, ...$$hoist_args) {
    const [defaultTitle] = __dec($$hoist_encoded);
var [title = defaultTitle] = $$hoist_args;
'use server'
    return title
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_save, "name", { value: "save" });
