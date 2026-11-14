function Form(defaultTitle) {
  const save = /* #__PURE__ */ $$register($$hoist_0_save, "<id>", "$$hoist_0_save").bind(null, defaultTitle);
}

;export async function $$hoist_0_save(defaultTitle, title = defaultTitle) {
    'use server'
    return title
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_save, "name", { value: "save" });
