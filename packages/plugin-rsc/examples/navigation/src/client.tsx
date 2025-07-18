import "@vitejs/plugin-rsc/dist-DEF94lDJ";
import "@vitejs/plugin-rsc/browser-QWbIPyhO";
// @ts-ignore
import { createFromFetch, createFromReadableStream } from "@vitejs/plugin-rsc/browser-D8OPzpF5";
import "@vitejs/plugin-rsc/browser-LizIyxet";
// @ts-ignore
import { rscStream } from "@vitejs/plugin-rsc/client-edAdk2GF";
import { useState, useMemo } from "react";
import ReactDomClient from "react-dom/client";
import { BundlerContext } from 'navigation-react';

async function hydrate() {
    const initialPayload = await createFromReadableStream(rscStream);
    function Shell() {
        const [root, setRoot] = useState(initialPayload.root);
        const bundler = useMemo(() => ({setRoot, deserialize: fetchRSC}), []);
        return (
            <BundlerContext.Provider value={bundler}>
                {root}
            </BundlerContext.Provider>
        );
    }
    ReactDomClient.hydrateRoot(document, <Shell />);
}
async function fetchRSC(url: string, {body, ...options}: any) {
    const payload = await createFromFetch(fetch(url, {...options, body: JSON.stringify(body), method: 'PUT'}));
    return payload.root;
}
hydrate();
