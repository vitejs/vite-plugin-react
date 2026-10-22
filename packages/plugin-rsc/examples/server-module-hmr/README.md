# RSC Server Module HMR Reproduction

This app loads a server component through `import.meta.glob` and passes its rendered output to a client component.

Run `pnpm dev`, open the printed URL, and edit `app/workflow-components/demo/component.tsx`. Before the HMR fix, the page keeps the old text until a full reload.
