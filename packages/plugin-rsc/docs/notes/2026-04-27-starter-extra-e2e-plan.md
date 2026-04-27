# Starter-extra e2e fixture plan

## Problem statement

`examples/starter` is public-facing demo material. It should stay small, readable, and useful for users learning the minimal RSC setup.

The e2e suite currently piggybacks on starter variants for many compatibility checks, but that is inherently limited:

- adding edge-case UI or graph-shaping components makes the demo less clear
- tests against starter tend to assert broad "still works" behavior rather than specific regression shapes
- obscure fixtures can drift into implementation-only coverage that is hard for humans to validate

`examples/basic` covers many advanced cases, but it is intentionally broad and dense. It is not a good home for every medium-sized regression because new scenarios can get lost in the full matrix.

We need an intermediate fixture: more expressive than starter, much smaller and more intentional than basic.

## Proposal

Add a new `examples/starter-extra` fixture.

Use it for focused, human-readable edge cases that are too noisy for starter but do not warrant the full `examples/basic` surface area.

Guiding constraints:

- keep the starter app shape recognizable
- make every test scenario visible in rendered UI
- avoid invisible graph-shaping components unless the test also asserts their effect
- prefer one scenario per small route/section/component
- keep comments short and explain user-visible behavior first

## Initial target: CSS HMR edge cases

The current `examples/nested-rsc-css-hmr` fixture is too obscure:

- the nested RSC serialize/deserialize case does not exercise distinct CSS HMR logic compared with normal RSC CSS HMR
- shared-graph tests rely on a client component that returns `null`, so removing it may not fail the e2e assertions
- long comments explain internal mechanics, but the rendered behavior does not make the scenario self-evident

Instead, model the useful part directly in `starter-extra`.

Suggested scenario:

- one CSS module is imported by a server component and a client component
- both components render visible elements using that CSS module
- one dev HMR test edits the CSS module and asserts both visible elements update without reload
- the same test removes a CSS rule and asserts both elements fall through the cascade
- reset asserts both elements return to the original styles

This makes the "shared CSS graph" property observable. If the client-side import is removed, the client element assertion fails.

## Cloudflare starter consolidation

`examples/starter-cf-single` is another case where a copied starter fixture can drift from the main starter shape.

Once `starter-extra` exists, consider folding the Cloudflare single-worker variant into it instead of keeping a separate copied example:

- `examples/starter-extra/vite.config.ts` for the normal Vite/Node-style fixture
- `examples/starter-extra/vite.cf.config.ts` for Cloudflare
- `examples/starter-extra/wrangler.jsonc` if required by the Cloudflare plugin/scripts
- package scripts such as:
  - `dev`
  - `build`
  - `preview`
  - `cf:dev`
  - `cf:build`
  - `cf:preview`

Then `e2e/cloudflare.test.ts` can target `examples/starter-extra` with the Cloudflare script/config path rather than a separate `examples/starter-cf-single` tree.

The main design constraint is framework entry compatibility. The current Cloudflare fixture differs from starter in more than Vite config: it uses Worker-oriented response handling and embeds the `ssr` environment under the `rsc` Worker build. `starter-extra` should either:

- make the framework entries portable enough for both normal and Cloudflare modes, or
- keep tiny Cloudflare-specific entry/config files while sharing the rest of the app.

Avoid making the public `examples/starter` carry these branches. The point of `starter-extra` is to absorb this sort of test/demo complexity without degrading starter readability.

## Relationship to existing tests

`examples/starter`

- keep as public demo and broad smoke target
- ok for option variants such as `cssLinkPrecedence: false` that should pass the same starter behavior
- avoid adding test-only UI or edge-case graph structure

`examples/starter-extra`

- medium-size regression fixture
- visible, focused scenarios
- good home for CSS HMR shared graph coverage and similar "small app plus one edge case" tests

`examples/basic`

- comprehensive integration matrix
- broad framework/runtime behavior
- avoid adding narrow one-off scenarios unless they interact with existing basic routes

## Migration sketch

1. Add `examples/starter-extra` by copying starter and adding an explicit "extra checks" area.
2. Add a shared CSS module scenario:
   - `src/shared-css/card.module.css`
   - `src/shared-css/server-card.tsx`
   - `src/shared-css/client-card.tsx` with `"use client"`
3. Add `e2e/starter-extra.test.ts` or a focused `e2e/shared-css-hmr.test.ts`.
4. Move useful shared CSS HMR assertions from `nested-rsc-css-hmr.test.ts` into the new fixture.
5. Move the Cloudflare single-worker coverage from `starter-cf-single` into `starter-extra` if the entry compatibility stays readable.
6. Drop `nested-rsc-css-hmr.test.ts` and `examples/nested-rsc-css-hmr` unless a distinct nested Flight regression is identified.
7. Drop `examples/starter-cf-single` after Cloudflare coverage is represented by `starter-extra`.

## Test design notes

The shared CSS HMR test should assert the fixture shape, not just the CSS result:

- assert both server and client elements are present
- assert both have the initial CSS module styles
- edit the CSS module and assert both update
- remove one rule and assert both fall through
- reset and assert both recover

The test should fail if either side of the graph is removed.
