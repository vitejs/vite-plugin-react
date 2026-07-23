# SSR `encodeFormAction`

This example exercises the React Flight client APIs exposed by `@vitejs/plugin-rsc/ssr` for custom progressive-enhancement form encoding:

- `createFromReadableStream`
- `encodeReply`

It renders one bound server-action form and submits it without JavaScript.

## Background

During SSR, `createFromReadableStream` deserializes an RSC stream and reconstructs its server references. React attaches a default `$$FORM_ACTION` implementation to those references so that a server function can be rendered as a native HTML form action.

For an unbound server reference, React's default encoder emits an `$ACTION_ID_*` field. For a bound reference, it serializes `{ id, bound }` with the Flight reply serializer and emits `$ACTION_REF_*` plus the associated `$ACTION_*` multipart fields. A server can later pass that form data to `decodeAction` to reconstruct and invoke the action.

Frameworks can replace this behavior through the `encodeFormAction` option accepted by the SSR Flight client. The callback may customize the form's action URL, method, encoding, field name, and additional form data.

The callback replaces React's default encoder rather than decorating its result. A framework that wants to change only the action URL while preserving compatibility with `decodeAction` must therefore recreate React's default multipart field layout. Calling `encodeReply({ id, bound })` from the same Flight client instance provides the matching serializer without importing the vendored runtime directly.

## Upstream Design

React introduced `encodeFormAction` in [React PR #27563, "[Flight] Allow custom encoding of the form action"](https://github.com/react/react/pull/27563). The PR describes server-action endpoints and their protocols as meta-framework responsibilities. React provides `callServer` for browser-initiated calls and summarizes the new hook as:

> `encodeFormAction` is to the SSR what `callServer` is to the Browser.

React's default current-page POST and `$ACTION_*` multipart protocol are therefore defaults rather than requirements. An SSR framework may replace the form action URL and encoded fields through `encodeFormAction`. The browser Flight client does not accept this option because native progressive-enhancement metadata is generated during SSR.

The upstream implementation wires the callback into server references as `$$FORM_ACTION`, which React DOM reads while rendering forms. React has lower-level tests for custom `$$FORM_ACTION` metadata, but it does not have an end-to-end test that passes `encodeFormAction` through Flight deserialization and then submits the resulting form. This example covers that integration path.

## Waku Motivation

[Waku PR #2191](https://github.com/wakujs/waku/pull/2191) directly motivates exposing these APIs from `@vitejs/plugin-rsc/ssr`. Both ordinary HTML forms and React server-action forms submitted without JavaScript can use `multipart/form-data`, but React's `$ACTION_*` discriminator is inside the single-read request body. Waku cannot inspect that body to classify the request and still pass an untouched request to an ordinary form handler.

Waku supplies `encodeFormAction` during SSR to add a marker to the form's action URL. It can classify the request from the URL before consuming the body, while `encodeReply({ id, bound })` lets it preserve React's default multipart field layout for `decodeAction`.

This requirement falls between React's two supported modes. React can provide its complete default protocol, or a framework can replace it with `encodeFormAction`, but the callback cannot obtain and modify the default `ReactCustomFormAction`. Waku wants to retain the default protocol and change only the action URL, so it must reproduce React's `{ id, bound }` serialization, `$ACTION_REF_*` naming, field prefixing, and suspension behavior.

The callback also receives no stable server-reference identity, which makes it difficult to distinguish the same action when it is used both unbound and bound on the client. Waku handles this with a promise-identity heuristic and documents the remaining ambiguity.

`useActionState` exposes another gap. When a permalink is provided, React applies it after `encodeFormAction` and replaces the encoder's action URL. Waku must currently require the permalink itself to contain the marker. A complete upstream solution would let a framework transform the final action URL after permalink resolution while retaining React's default encoding, or otherwise provide a context-bound default encoder that can be composed safely.

## Next.js Comparison

Next.js takes a different approach. It does not customize `encodeFormAction` or add an action URL marker for progressive-enhancement forms. Forms submitted without JavaScript use React's default `$ACTION_ID_*` or `$ACTION_REF_*` fields, and Next treats a multipart `POST` as a possible action request before calling `decodeAction`. This works because the App Router owns the request path and does not need to preserve the body for an ordinary form handler. Hydrated server-action calls use a separate `Next-Action` request header.

Next.js does use the Flight client's `encodeReply` and `createTemporaryReferenceSet` in a server runtime for `"use cache"` key serialization, but not for its Flight-to-HTML form-rendering path. `@vitejs/plugin-rsc` follows the same pattern through its `/rsc/client` entry point, which exposes `encodeReply` and `createClientTemporaryReferenceSet` for client-protocol work inside the RSC environment.

## Plugin Scope

The `/ssr` exports expose corresponding Flight client-protocol capabilities in the separate Flight-to-HTML environment. This is a low-level unblock rather than the ideal framework API: the plugin re-exports capabilities already provided by its vendored `react-server-dom/client.edge` runtime so frameworks can implement today's workaround without deep imports or protocol-version mismatches.

The plugin does not make React's experimental `$ACTION_*` protocol stable, nor does it solve the missing default-encoding composition or final-URL transformation hooks. Those ergonomic improvements belong in an upstream React feature request.

## Example Flow

The example performs this complete round trip:

```text
RSC render
  -> SSR createFromReadableStream({ encodeFormAction })
  -> encodeReply({ id, bound })
  -> custom action URL and $ACTION_REF_* fields
  -> native multipart POST without JavaScript
  -> decodeAction
  -> bound server action execution
```

The rendered form binds the value `"bound"` to its server action and submits an input containing `"form"`. After `decodeAction` reconstructs and invokes the action, the response displays `bound:form`.

## Structure

- `src/framework/entry.rsc.tsx` handles requests, calls `decodeAction` for form submissions, renders the RSC payload, and delegates HTML rendering to the SSR environment.
- `src/framework/entry.ssr.tsx` recreates React's default bound-action encoding with a custom action URL, wires it into deserialization, and renders the payload with React DOM.
- `src/action.ts` contains the server action.
- `src/root.tsx` renders the form and action result.
- `src/state.ts` stores the result across the POST and subsequent render.

## Scope

The encoder is intentionally limited to one bound action. It uses a fixed field prefix and caches serialization by the bound-arguments promise so React can suspend and retry SSR while `encodeReply` completes.

A production framework must generate unique field prefixes and handle unbound references, multiple forms, retries, errors, and any framework-specific request classification. The custom query parameter in this example only proves that React applies the returned action URL; the request handler does not depend on that marker for classification.

## Running

```bash
pnpm dev
pnpm build
pnpm preview
```

The corresponding Playwright coverage is in `../../e2e/ssr-encode-form-action.test.ts` and runs the no-JavaScript submission in both development and production-build modes.
