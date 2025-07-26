import { useState, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { hydrate as _hydrate } from '@vitejs/plugin-rsc/extra/browser'
import { createFromFetch, createFromReadableStream } from "@vitejs/plugin-rsc/browser";
import { BundlerContext } from 'navigation-react';

declare global{interface Window { __FLIGHT_DATA: any;}}

let encoder = new TextEncoder();
let streamController: any;
let rscStream = new ReadableStream({ start(controller) {
	if (typeof window === "undefined") return;
	let handleChunk = (chunk: any) => {
		if (typeof chunk === "string") controller.enqueue(encoder.encode(chunk));
		else controller.enqueue(chunk);
	};
	window.__FLIGHT_DATA ||= [];
	window.__FLIGHT_DATA.forEach(handleChunk);
	window.__FLIGHT_DATA.push = (chunk: any) => {
		handleChunk(chunk);
	};
	streamController = controller;
} });
if (typeof document !== "undefined" && document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => {
	streamController?.close();
});
else streamController?.close();

async function hydrate() {
    const initialPayload = await createFromReadableStream(rscStream) as any;
    function Shell() {
        const [root, setRoot] = useState(initialPayload.root);
        const bundler = useMemo(() => ({setRoot, deserialize: fetchRSC}), []);
        return (
            <BundlerContext.Provider value={bundler}>
                {root}
            </BundlerContext.Provider>
        );
    }
    ReactDOM.hydrateRoot(document, <Shell />);
}
async function fetchRSC(url: string, {body, ...options}: any) {
    const payload = await createFromFetch(fetch(url, {...options, body: JSON.stringify(body), method: 'PUT'})) as any;
    return payload.root;
}
hydrate();
