import "@vitejs/plugin-rsc/dist-DEF94lDJ";
import "@vitejs/plugin-rsc/browser-QWbIPyhO";
// @ts-ignore
import { createFromFetch, createFromReadableStream } from "@vitejs/plugin-rsc/browser-D8OPzpF5";
import "@vitejs/plugin-rsc/browser-LizIyxet";
// @ts-ignore
import { rscStream } from "@vitejs/plugin-rsc/client-edAdk2GF";
import React from "react";
import ReactDomClient from "react-dom/client";
import { jsx } from "react/jsx-runtime";
import { BundlerContext } from 'navigation-react';

//#region src/extra/browser.tsx
async function hydrate() {
    const initialPayload = await createFromReadableStream(rscStream);
    function Shell() {
        const [payload, setPayload] = React.useState(initialPayload);
        const bundler = React.useMemo(() => ({setRoot: setPayload, deserialize: fetchRSC}), []);
        return  jsx(BundlerContext.Provider, { value: bundler, children: payload.root });
    }
    const browserRoot = /* @__PURE__ */ jsx(React.StrictMode, { children: /* @__PURE__ */ jsx(Shell, {}) });
    ReactDomClient.hydrateRoot(document, browserRoot);
}
async function fetchRSC(request: any) {
    const payload = await createFromFetch(fetch(request));
    return payload.root;
}
hydrate();
