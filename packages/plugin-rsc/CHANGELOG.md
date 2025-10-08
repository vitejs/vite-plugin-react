## <small>[0.4.33](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.32...plugin-rsc@0.4.33) (2025-10-08)</small>
### Bug Fixes

* **deps:** update all non-major dependencies ([#887](https://github.com/vitejs/vite-plugin-react/issues/887)) ([407795d](https://github.com/vitejs/vite-plugin-react/commit/407795dbd0129b069cf3ac842846687485a5ef00))
* **deps:** update all non-major dependencies ([#896](https://github.com/vitejs/vite-plugin-react/issues/896)) ([2d239fc](https://github.com/vitejs/vite-plugin-react/commit/2d239fc8dec2ab499282eaea45b2bffb8d182f26))
* **rsc/cjs:** add `__filename` and `__dirname` ([#908](https://github.com/vitejs/vite-plugin-react/issues/908)) ([0ba0d71](https://github.com/vitejs/vite-plugin-react/commit/0ba0d71bc92822946f327760691db3d6f7d87106))
* **rsc/cjs:** unwrap `default` based on `__cjs_module_runner_transform` marker ([#905](https://github.com/vitejs/vite-plugin-react/issues/905)) ([1216caf](https://github.com/vitejs/vite-plugin-react/commit/1216caf70621b8760c4226624939b77e7ece4f42))

### Code Refactoring

* **rsc:** move common code for `transformCjsToEsm` ([#909](https://github.com/vitejs/vite-plugin-react/issues/909)) ([ac61c62](https://github.com/vitejs/vite-plugin-react/commit/ac61c624d8a7f860af735ad288491b5c50c656bb))

## <small>[0.4.32](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.31...plugin-rsc@0.4.32) (2025-09-26)</small>
### Bug Fixes

* **deps:** update all non-major dependencies ([#851](https://github.com/vitejs/vite-plugin-react/issues/851)) ([3c2ebf8](https://github.com/vitejs/vite-plugin-react/commit/3c2ebf89de7f5e40ed0ef932993f7d0b7695719b))
* **rsc:** reject inline "use server" inside "use client" module ([#884](https://github.com/vitejs/vite-plugin-react/issues/884)) ([5bc3f79](https://github.com/vitejs/vite-plugin-react/commit/5bc3f79fb4356ebf574b6ba28e4c7a315f4336de))

### Miscellaneous Chores

* **deps:** update all non-major dependencies ([#879](https://github.com/vitejs/vite-plugin-react/issues/879)) ([608f266](https://github.com/vitejs/vite-plugin-react/commit/608f266c8d53f41a6b1541de35b218fe2640ec05))
* **rsc:** fix typo ([#885](https://github.com/vitejs/vite-plugin-react/issues/885)) ([b81470c](https://github.com/vitejs/vite-plugin-react/commit/b81470c3076e079be517b7bf92325760ba89fd3d))

## <small>[0.4.31](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.30...plugin-rsc@0.4.31) (2025-09-17)</small>
### Bug Fixes

* **rsc:** fix plugin name in `client-only` error message ([#862](https://github.com/vitejs/vite-plugin-react/issues/862)) ([0f2fbc7](https://github.com/vitejs/vite-plugin-react/commit/0f2fbc7c1fe2b6228864c5b424cea2309323fb67))
* **rsc:** remove server style when css import is removed ([#849](https://github.com/vitejs/vite-plugin-react/issues/849)) ([4ae3f18](https://github.com/vitejs/vite-plugin-react/commit/4ae3f184eaa3e7fe559ccaf67c35e17a6e7fefa0))
* **rsc:** show import chain for server-only and client-only import error ([#867](https://github.com/vitejs/vite-plugin-react/issues/867)) ([ba16c34](https://github.com/vitejs/vite-plugin-react/commit/ba16c34f6b70e68f29bff110c6906829ec3b2e8d))

### Documentation

* **rsc:** mention `validateImports` option for build time `server-only` and `client-only` validation ([#858](https://github.com/vitejs/vite-plugin-react/issues/858)) ([a96a6b2](https://github.com/vitejs/vite-plugin-react/commit/a96a6b2ef0afc1cc914885d4514865711d978fbf))
* **rsc:** separate "Tips" section ([#864](https://github.com/vitejs/vite-plugin-react/issues/864)) ([32cfa5f](https://github.com/vitejs/vite-plugin-react/commit/32cfa5fe1e9c255e59a29c14d1b8585772f7b61e))

### Miscellaneous Chores

* **rsc:** add missing rsc-html-stream dep (fix [#857](https://github.com/vitejs/vite-plugin-react/issues/857)) ([#868](https://github.com/vitejs/vite-plugin-react/issues/868)) ([c30cf1a](https://github.com/vitejs/vite-plugin-react/commit/c30cf1a7db312a2643de426c7ac13479ce90289a))

### Tests

* **rsc:** tweak assertions for rolldown-vite ([#869](https://github.com/vitejs/vite-plugin-react/issues/869)) ([a2a287a](https://github.com/vitejs/vite-plugin-react/commit/a2a287aef6be302a771b8f7c512f190578412685))

## <small>[0.4.30](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.29...plugin-rsc@0.4.30) (2025-09-15)</small>
### Features

* **rsc:** support `export default { fetch }` as server handler entry ([#839](https://github.com/vitejs/vite-plugin-react/issues/839)) ([cb5ce55](https://github.com/vitejs/vite-plugin-react/commit/cb5ce555e234166022dd899c71c88ad3eb7e5192))

### Bug Fixes

* **rsc:** `copyPublicDir: false` for server build ([#831](https://github.com/vitejs/vite-plugin-react/issues/831)) ([12b05bb](https://github.com/vitejs/vite-plugin-react/commit/12b05bb3ec0155459b205199432b35e05ef3594a))
* **rsc:** fix cjs transform to preserve `module.exports` on `require` side and allow `exports` assignment + expose `cjsModuleRunnerPlugin` ([#833](https://github.com/vitejs/vite-plugin-react/issues/833)) ([f63bb83](https://github.com/vitejs/vite-plugin-react/commit/f63bb83c7070d07ae5f488cdc9ac643bac61ba59))
* **rsc:** keep server stylesheet link for hmr and avoid injecting css via client js ([#841](https://github.com/vitejs/vite-plugin-react/issues/841)) ([2b7b90f](https://github.com/vitejs/vite-plugin-react/commit/2b7b90f9ee94ca70beda90f288df2a5b6b260900))

### Documentation

* **rsc:** remove unimportant APIs ([#830](https://github.com/vitejs/vite-plugin-react/issues/830)) ([9cabda1](https://github.com/vitejs/vite-plugin-react/commit/9cabda1574f95a123ba5f90ed94ed9bc9f8f04fc))
* **rsc:** replace degit with create-vite ([#846](https://github.com/vitejs/vite-plugin-react/issues/846)) ([7c3edba](https://github.com/vitejs/vite-plugin-react/commit/7c3edba29b4996a77862c7dc7cb47bf51418dcd0))

### Miscellaneous Chores

* **rsc:** remove double `import.meta.hot.accept` ([#840](https://github.com/vitejs/vite-plugin-react/issues/840)) ([a4bc2e0](https://github.com/vitejs/vite-plugin-react/commit/a4bc2e0c6cf7426dcb7b8b2945ca46377a7db688))

### Code Refactoring

* **rsc:** self-accept css module direct request module on client environment ([#842](https://github.com/vitejs/vite-plugin-react/issues/842)) ([e37788b](https://github.com/vitejs/vite-plugin-react/commit/e37788bbde37daa9f6954891e90832566e65a667))
* **rsc:** use `addWatchFile` to invalidate server css virtual ([#847](https://github.com/vitejs/vite-plugin-react/issues/847)) ([78a3f56](https://github.com/vitejs/vite-plugin-react/commit/78a3f56002d98f609998fd2cdad8e0299080cb8b))

### Tests

* **rsc:** fix renderBuiltUrl runtime for css ([#838](https://github.com/vitejs/vite-plugin-react/issues/838)) ([19d14c2](https://github.com/vitejs/vite-plugin-react/commit/19d14c220bc66b1d985f5e018876dc5d5ff7b5ce))
* **rsc:** test adding css import works without reload ([#845](https://github.com/vitejs/vite-plugin-react/issues/845)) ([eab0a16](https://github.com/vitejs/vite-plugin-react/commit/eab0a16986d6cd6cd70621c5b1bf18b6d4425ca8))
* **rsc:** tweak timeout ([#854](https://github.com/vitejs/vite-plugin-react/issues/854)) ([456449d](https://github.com/vitejs/vite-plugin-react/commit/456449d5c757f3fea51976b6c92ffd69ec767640))

## <small>[0.4.29](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.28...plugin-rsc@0.4.29) (2025-09-09)</small>
### Features

* **rsc:** expose `transforms` utils ([#828](https://github.com/vitejs/vite-plugin-react/issues/828)) ([0a8e4dc](https://github.com/vitejs/vite-plugin-react/commit/0a8e4dcb664d728dbb41bd3ec12b3d258176dd7b))

### Bug Fixes

* **deps:** update all non-major dependencies ([#823](https://github.com/vitejs/vite-plugin-react/issues/823)) ([afa28f1](https://github.com/vitejs/vite-plugin-react/commit/afa28f1675e8169f6494413b2bb69577b9cbf6f5))
* **rsc:** fix build error when entire client reference module is tree-shaken ([#827](https://github.com/vitejs/vite-plugin-react/issues/827)) ([f515bd8](https://github.com/vitejs/vite-plugin-react/commit/f515bd8d82122ba4a2a80886978270182fd7bcbb))

### Code Refactoring

* **rsc:** remove top-level `transformHoistInlineDirective` export in favor of `@vitejs/plugin-rsc/transforms` ([#829](https://github.com/vitejs/vite-plugin-react/issues/829)) ([3122b0d](https://github.com/vitejs/vite-plugin-react/commit/3122b0d25e01206fb52e8c9eb30cc894126f02cf))

## <small>[0.4.28](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.27...plugin-rsc@0.4.28) (2025-09-08)</small>
### Features

* **rsc:** support browser mode build ([#801](https://github.com/vitejs/vite-plugin-react/issues/801)) ([b81bf6a](https://github.com/vitejs/vite-plugin-react/commit/b81bf6ac8a273855c5e9f39d71a32d76fd31b61c))

### Bug Fixes

* **rsc:** support `rsc.loadModuleDevProxy` top-level config ([#825](https://github.com/vitejs/vite-plugin-react/issues/825)) ([d673dd0](https://github.com/vitejs/vite-plugin-react/commit/d673dd0a525a9baf6644a89f28cd1537847741bb))

### Miscellaneous Chores

* add AGENTS.md documentation for AI agent development guidance ([#820](https://github.com/vitejs/vite-plugin-react/issues/820)) ([d1627cb](https://github.com/vitejs/vite-plugin-react/commit/d1627cbdd20ac2ce1f91185ef0ba1be882a0186b))

### Tests

* **rsc:** test `useId` ([#818](https://github.com/vitejs/vite-plugin-react/issues/818)) ([768cfd3](https://github.com/vitejs/vite-plugin-react/commit/768cfd3c7fd956497ec5e39734c0c1a62a2a441c))
* **rsc:** test middleware mode ([#817](https://github.com/vitejs/vite-plugin-react/issues/817)) ([4672651](https://github.com/vitejs/vite-plugin-react/commit/467265104995f9b07058269f2905a78a9cc0c2ce))

## <small>[0.4.27](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.26...plugin-rsc@0.4.27) (2025-09-01)</small>
### Features

* **rsc:** enable `buildApp` plugin hook by default for Vite 7 ([#815](https://github.com/vitejs/vite-plugin-react/issues/815)) ([0a02b83](https://github.com/vitejs/vite-plugin-react/commit/0a02b835efb8de7ff2f95008a5321738b9b6a0b0))
* **rsc:** support `UserConfig.rsc: RscPluginOptions` ([#810](https://github.com/vitejs/vite-plugin-react/issues/810)) ([07a64c2](https://github.com/vitejs/vite-plugin-react/commit/07a64c25ab056689c99ce348810aa721a7f1926b))

### Bug Fixes

* **deps:** update all non-major dependencies ([#809](https://github.com/vitejs/vite-plugin-react/issues/809)) ([437bab2](https://github.com/vitejs/vite-plugin-react/commit/437bab254d1f1fa3542dd335c6763ee36c8826be))
* **rsc:** delay `validateImportPlugin` setup ([#813](https://github.com/vitejs/vite-plugin-react/issues/813)) ([4da5810](https://github.com/vitejs/vite-plugin-react/commit/4da58106e9c2ba1258ff3f97e853324af24f4ed8))

### Documentation

* **rsc:** mention `@vitejs/plugin-rsc/types` ([#816](https://github.com/vitejs/vite-plugin-react/issues/816)) ([3568e89](https://github.com/vitejs/vite-plugin-react/commit/3568e890d21c8cc80ef901222f1f04ca0dbdc1c5))

### Miscellaneous Chores

* fix type in `README.md` ([#804](https://github.com/vitejs/vite-plugin-react/issues/804)) ([f9d7cd9](https://github.com/vitejs/vite-plugin-react/commit/f9d7cd96bdd86b63dc028daf6731860e13a5d3bf))

### Code Refactoring

* **rsc:** simplify `validateImportPlugin` ([#814](https://github.com/vitejs/vite-plugin-react/issues/814)) ([3969f86](https://github.com/vitejs/vite-plugin-react/commit/3969f8602cf43de95d6ae086a0612188d56a239d))

## <small>[0.4.26](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.25...plugin-rsc@0.4.26) (2025-08-29)</small>
### Features

* **rsc:** enable server-chunk-based client chunks ([#794](https://github.com/vitejs/vite-plugin-react/issues/794)) ([377a273](https://github.com/vitejs/vite-plugin-react/commit/377a273b27d0996ae9d2be50a74dc372d91cdc9c))

### Bug Fixes

* **rsc:** use `req.originalUrl` for server handler ([#797](https://github.com/vitejs/vite-plugin-react/issues/797)) ([3250231](https://github.com/vitejs/vite-plugin-react/commit/3250231b7537daf6946a27ec8bd8dc47a646d034))

### Documentation

* **rsc:** how to use `@vitejs/plugin-rsc` as framework's `dependencies` ([#796](https://github.com/vitejs/vite-plugin-react/issues/796)) ([907b9d8](https://github.com/vitejs/vite-plugin-react/commit/907b9d8323e7a21160a58d328d6ac444e5fa31da))

### Miscellaneous Chores

* **rsc:** typo in viteRscAsyncHooks naming ([#793](https://github.com/vitejs/vite-plugin-react/issues/793)) ([95e4091](https://github.com/vitejs/vite-plugin-react/commit/95e4091dcb973506136bd1564000916e8a38c440))

### Code Refactoring

* **rsc:** organize internal plugins ([#791](https://github.com/vitejs/vite-plugin-react/issues/791)) ([d8cfdfa](https://github.com/vitejs/vite-plugin-react/commit/d8cfdfa1b8aca65fae2e555b0ae8a66eb9276ed6))

## <small>[0.4.25](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.24...plugin-rsc@0.4.25) (2025-08-28)</small>
### Bug Fixes

* **rsc:** inject `AsyncLocalStorage` global via transform ([#785](https://github.com/vitejs/vite-plugin-react/issues/785)) ([2f255ad](https://github.com/vitejs/vite-plugin-react/commit/2f255ad694b976ff0b6f826f5fe8c27da5852df1))
* **rsc:** optimize `react-dom/static.edge` ([#786](https://github.com/vitejs/vite-plugin-react/issues/786)) ([e3bf733](https://github.com/vitejs/vite-plugin-react/commit/e3bf73356bf307d68e5e62c06987815afb1a1f44))
* **rsc:** propagate client reference invalidation to server ([#788](https://github.com/vitejs/vite-plugin-react/issues/788)) ([a8dc3fe](https://github.com/vitejs/vite-plugin-react/commit/a8dc3feade6fc64b1cfd851d90b39d4d7ba98b02))

### Miscellaneous Chores

* **deps:** update `@types/react-dom` to fix `formState` ([#782](https://github.com/vitejs/vite-plugin-react/issues/782)) ([af9139f](https://github.com/vitejs/vite-plugin-react/commit/af9139f0bf1e30d4ffbd23b065001b0284cfda05))

### Tests

* **rsc:** test `hydrateRoot(..., { formState })` ([#781](https://github.com/vitejs/vite-plugin-react/issues/781)) ([e622a6a](https://github.com/vitejs/vite-plugin-react/commit/e622a6a06b4d021430a42defe893353940931915))

## <small>[0.4.24](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.23...plugin-rsc@0.4.24) (2025-08-25)</small>
### Features

* **rsc:** ability to merge client reference chunks ([#766](https://github.com/vitejs/vite-plugin-react/issues/766)) ([c40234e](https://github.com/vitejs/vite-plugin-react/commit/c40234ef079e5e27e86acf88c8c987db8bb1b16c))
* **rsc:** ability to merge client reference chunks based on server chunk usage ([#767](https://github.com/vitejs/vite-plugin-react/issues/767)) ([c69f0f6](https://github.com/vitejs/vite-plugin-react/commit/c69f0f6b834ac518f183b0a76851d17ddb7a81d0))

### Bug Fixes

* **deps:** update all non-major dependencies ([#773](https://github.com/vitejs/vite-plugin-react/issues/773)) ([9989897](https://github.com/vitejs/vite-plugin-react/commit/9989897fd102ba2d46bee0961e43aacb1e4f9436))
* **rsc:** fix client reference preload when group chunk re-exports client components from entry chunk ([#768](https://github.com/vitejs/vite-plugin-react/issues/768)) ([41e4bf5](https://github.com/vitejs/vite-plugin-react/commit/41e4bf586c7ebd81fba9e25e72c90386b5e88a4d))
* **rsc:** fix CSS HMR with `?url` ([#776](https://github.com/vitejs/vite-plugin-react/issues/776)) ([4c4879b](https://github.com/vitejs/vite-plugin-react/commit/4c4879b0c1080b536ac6521a7030691a06469b3a))
* **rsc:** normalize group chunk virtual id properly ([#770](https://github.com/vitejs/vite-plugin-react/issues/770)) ([9869e2c](https://github.com/vitejs/vite-plugin-react/commit/9869e2c7c51b3f001389255dbc40beafb76cac7b))

### Miscellaneous Chores

* **rsc:** custom client chunks example ([#765](https://github.com/vitejs/vite-plugin-react/issues/765)) ([6924db4](https://github.com/vitejs/vite-plugin-react/commit/6924db40f5cbfb9e02f4e4c5beacc2671f4df0ee))
* **rsc:** fix `useBuildAppHook: true` with cloudflare plugin ([#780](https://github.com/vitejs/vite-plugin-react/issues/780)) ([8fec8e3](https://github.com/vitejs/vite-plugin-react/commit/8fec8e3b79cce570fb369b6bddd35938ad2ec37a))

### Code Refactoring

* **rsc:** add `toRelativeId` util ([#771](https://github.com/vitejs/vite-plugin-react/issues/771)) ([d9da80f](https://github.com/vitejs/vite-plugin-react/commit/d9da80ffa804ea839a99e331b2dd33b9478a7d76))
* **rsc:** organize plugin utils ([#779](https://github.com/vitejs/vite-plugin-react/issues/779)) ([789e359](https://github.com/vitejs/vite-plugin-react/commit/789e3592d756227739b2285bda95a5d5dc9e5e93))

### Tests

* **rsc:** organize css tests ([#778](https://github.com/vitejs/vite-plugin-react/issues/778)) ([e71da84](https://github.com/vitejs/vite-plugin-react/commit/e71da842f89fdb0c549e874205e65601109f41b9))

## <small>[0.4.23](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.22...plugin-rsc@0.4.23) (2025-08-23)</small>
### Bug Fixes

* **rsc:** replace `'rolldownVersion' in this.meta` with `'rolldownVersion' in vite` for Vite 6 compat ([#761](https://github.com/vitejs/vite-plugin-react/issues/761)) ([af4e16d](https://github.com/vitejs/vite-plugin-react/commit/af4e16da970f2808e0ab4484500f0a038c8b176a))

### Miscellaneous Chores

* **rsc:** remove custom `react-dom/server.edge` types ([#757](https://github.com/vitejs/vite-plugin-react/issues/757)) ([a7ca366](https://github.com/vitejs/vite-plugin-react/commit/a7ca366f57f97ea0ab540dce645095ed9efedce8))
* **rsc:** simplify react-router example ([#763](https://github.com/vitejs/vite-plugin-react/issues/763)) ([22f6538](https://github.com/vitejs/vite-plugin-react/commit/22f6538ea1536700da8588f4d9960787f51f1bcd))
* **rsc:** use `prerender` in ssg example ([#758](https://github.com/vitejs/vite-plugin-react/issues/758)) ([df8b800](https://github.com/vitejs/vite-plugin-react/commit/df8b80055c567b0248c506e2c57fb613d9da128f))

### Tests

* **rsc:** test vite 6 ([#762](https://github.com/vitejs/vite-plugin-react/issues/762)) ([a46bdf4](https://github.com/vitejs/vite-plugin-react/commit/a46bdf45712e144c07797844b31e98bec5154be4))

## <small>[0.4.22](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.21...plugin-rsc@0.4.22) (2025-08-22)</small>
### Bug Fixes

* **rsc:** ensure `.js` suffix for internal virtual modules ([#744](https://github.com/vitejs/vite-plugin-react/issues/744)) ([bffc82e](https://github.com/vitejs/vite-plugin-react/commit/bffc82e12c3e8f369442eb4616db934d4bb10916))
* **rsc:** expose only `"use server"` as server functions ([#752](https://github.com/vitejs/vite-plugin-react/issues/752)) ([d2f2e71](https://github.com/vitejs/vite-plugin-react/commit/d2f2e716773a0c95c32f5e65f0a0d7b016fc3250))
* **rsc:** handle added/removed `"use client"` during dev ([#750](https://github.com/vitejs/vite-plugin-react/issues/750)) ([232be7b](https://github.com/vitejs/vite-plugin-react/commit/232be7bd65c7b0db8f6ecd41db6a97f47a9a9c26))
* **rsc:** include non-entry optimized modules for `optimizeDeps.exclude` suggestion ([#740](https://github.com/vitejs/vite-plugin-react/issues/740)) ([2640add](https://github.com/vitejs/vite-plugin-react/commit/2640add3bfc9d0709de590b76599da59a131e506))
* **rsc:** inject `__vite_rsc_importer_resources` import only once ([#742](https://github.com/vitejs/vite-plugin-react/issues/742)) ([5b28ba5](https://github.com/vitejs/vite-plugin-react/commit/5b28ba540cdeba511d7699df7331dec844893fc1))
* **rsc:** isolate plugin state per plugin instance ([#747](https://github.com/vitejs/vite-plugin-react/issues/747)) ([596c76b](https://github.com/vitejs/vite-plugin-react/commit/596c76bfb919b668694c3768cb1126f9dbf7f878))
* **rsc:** relax async function requirement for `"use server"` module directive ([#754](https://github.com/vitejs/vite-plugin-react/issues/754)) ([08986dd](https://github.com/vitejs/vite-plugin-react/commit/08986dd4d23d8881ed9852837508d64d38ff2129))

### Code Refactoring

* **rsc:** handle added/removed `"use server"` during dev ([#753](https://github.com/vitejs/vite-plugin-react/issues/753)) ([7542e6f](https://github.com/vitejs/vite-plugin-react/commit/7542e6f3b99054d065a8dc213a6ed62e3edde531))
* **rsc:** organize internal plugins ([#745](https://github.com/vitejs/vite-plugin-react/issues/745)) ([0a6cfdf](https://github.com/vitejs/vite-plugin-react/commit/0a6cfdf874b47cee511cf308b9dae08b123eac70))
* **rsc:** organize plugin utils ([#755](https://github.com/vitejs/vite-plugin-react/issues/755)) ([53b3f48](https://github.com/vitejs/vite-plugin-react/commit/53b3f485f6e06a34ddd70f3b1ffe35f4bebab3b3))
* **rsc:** remove `__fix_cloudflare` plugin ([#746](https://github.com/vitejs/vite-plugin-react/issues/746)) ([bec6c82](https://github.com/vitejs/vite-plugin-react/commit/bec6c829e84d9ed36330ce9a16b602c0d6b73cf1))
* **rsc:** simplify plugin state for server reference ([#751](https://github.com/vitejs/vite-plugin-react/issues/751)) ([9988f54](https://github.com/vitejs/vite-plugin-react/commit/9988f5494dd49e18a51fab9017a487da4843e4b0))

## <small>[0.4.21](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.20...plugin-rsc@0.4.21) (2025-08-19)</small>
### Bug Fixes

* **deps:** update all non-major dependencies ([#729](https://github.com/vitejs/vite-plugin-react/issues/729)) ([ba0323c](https://github.com/vitejs/vite-plugin-react/commit/ba0323cfcd7343362e64f782c5aae02ed9ee3273))
* **rsc:** exclude CSS imports with special queries from automatic injection ([#580](https://github.com/vitejs/vite-plugin-react/issues/580)) ([71bb49c](https://github.com/vitejs/vite-plugin-react/commit/71bb49c7fe5c8362426d59ee8a99ea660b631b66))
* **rsc:** fix custom `root` ([#717](https://github.com/vitejs/vite-plugin-react/issues/717)) ([c7bc716](https://github.com/vitejs/vite-plugin-react/commit/c7bc716e54070a35263dad1a978635c48f6c1720))
* **rsc:** keep `import.meta.glob` during scan build for rolldown-vite ([#721](https://github.com/vitejs/vite-plugin-react/issues/721)) ([74ec0e0](https://github.com/vitejs/vite-plugin-react/commit/74ec0e0e0e21355884b0aff26ca0919404cef3f2))

### Documentation

* **rsc:** improve plugin-rsc README organization and clarity ([#723](https://github.com/vitejs/vite-plugin-react/issues/723)) ([e6d7392](https://github.com/vitejs/vite-plugin-react/commit/e6d7392f4c2b052db6ba719217641099cfa8f817))

### Miscellaneous Chores

* remove vite-plugin-inspect dependency from examples ([#730](https://github.com/vitejs/vite-plugin-react/issues/730)) ([feb5553](https://github.com/vitejs/vite-plugin-react/commit/feb55537d036dcd6f9008cb13a9748ca5ef57925))
* **rsc:** fix `examples/basic` on stackblitz ([#724](https://github.com/vitejs/vite-plugin-react/issues/724)) ([1abe044](https://github.com/vitejs/vite-plugin-react/commit/1abe044668a13d55ea5549c558f666baa6196f15))
* **rsc:** rework ssg example ([#713](https://github.com/vitejs/vite-plugin-react/issues/713)) ([28e723b](https://github.com/vitejs/vite-plugin-react/commit/28e723b6ad38c3aa15d6defb83c0b8acb6748f66))
* **rsc:** tweak React.cache example ([#725](https://github.com/vitejs/vite-plugin-react/issues/725)) ([cc1bcdf](https://github.com/vitejs/vite-plugin-react/commit/cc1bcdfce4323119d0d918f72226168abbfadb4f))
* **rsc:** use named imports ([#727](https://github.com/vitejs/vite-plugin-react/issues/727)) ([ba25233](https://github.com/vitejs/vite-plugin-react/commit/ba25233b3afafa20916ad35e4c7f1d3ecda0d0da))

### Tests

* **rsc:** fix invalid code ([#722](https://github.com/vitejs/vite-plugin-react/issues/722)) ([a39d837](https://github.com/vitejs/vite-plugin-react/commit/a39d8375cd0da1bd1e608894124bc7bfbffe6fa9))
* **rsc:** test assets ([#733](https://github.com/vitejs/vite-plugin-react/issues/733)) ([fd96308](https://github.com/vitejs/vite-plugin-react/commit/fd96308a6cde57a132b3d9e434e711aac15c6486))

## <small>[0.4.20](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.19...plugin-rsc@0.4.20) (2025-08-13)</small>
### Bug Fixes

* **rsc:** deprecate opt-out `ignoredPackageWarnings` option in favor of ont-in `DEBUG` env ([#697](https://github.com/vitejs/vite-plugin-react/issues/697)) ([5d5edd4](https://github.com/vitejs/vite-plugin-react/commit/5d5edd4d896fe6d064dddd5a3cf76594b0b0171c))
* **rsc:** keep hoisted require order ([#706](https://github.com/vitejs/vite-plugin-react/issues/706)) ([ad7584a](https://github.com/vitejs/vite-plugin-react/commit/ad7584a29b02238d685504ff356515e6f78275dc))
* **rsc:** remove duplicate server css on initial render ([#702](https://github.com/vitejs/vite-plugin-react/issues/702)) ([3114e88](https://github.com/vitejs/vite-plugin-react/commit/3114e88bcd8303d7c42da29eb7215c54ed43ce0d))
* **rsc:** warn dual module of optimized and non-optimized client reference ([#705](https://github.com/vitejs/vite-plugin-react/issues/705)) ([e5c3517](https://github.com/vitejs/vite-plugin-react/commit/e5c351776e9a6269a37a171c830a902381af8011))

### Miscellaneous Chores

* **rsc:** fix csp example for Vite server ping SharedWorker ([#704](https://github.com/vitejs/vite-plugin-react/issues/704)) ([5b73cbe](https://github.com/vitejs/vite-plugin-react/commit/5b73cbe134466650a7aabc02dc794e7d6e35b135))
* **rsc:** update package.json for starter-cf-single ([#707](https://github.com/vitejs/vite-plugin-react/issues/707)) ([2d93ee4](https://github.com/vitejs/vite-plugin-react/commit/2d93ee42cf8b4b544fd09400f1c6ed1dfdb6652d))

### Code Refactoring

* move @vitejs/plugin-rsc to devDependencies in examples ([#699](https://github.com/vitejs/vite-plugin-react/issues/699)) ([a1f4311](https://github.com/vitejs/vite-plugin-react/commit/a1f4311f87d0f983b8332ab393514e0d71263374))

## <small>[0.4.19](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.18...plugin-rsc@0.4.19) (2025-08-11)</small>
### Bug Fixes

* **rsc:** fix cjs default import on module runner ([#695](https://github.com/vitejs/vite-plugin-react/issues/695)) ([c329914](https://github.com/vitejs/vite-plugin-react/commit/c329914c572473d4f09261fa0eba77484e720d2e))
* **rsc:** replace `?v=` check with more robust `node_modules` detection ([#696](https://github.com/vitejs/vite-plugin-react/issues/696)) ([f0359c4](https://github.com/vitejs/vite-plugin-react/commit/f0359c4eca48ca6eb2ba98254a272949a13f149e))
* **rsc:** replace non-optimized server cjs warning with debug only log ([#698](https://github.com/vitejs/vite-plugin-react/issues/698)) ([a88fb2d](https://github.com/vitejs/vite-plugin-react/commit/a88fb2ded4c8b9f42f2fee70a482615f331122f4))

## <small>[0.4.18](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.17...plugin-rsc@0.4.18) (2025-08-11)</small>
### Bug Fixes

* **deps:** update all non-major dependencies ([#694](https://github.com/vitejs/vite-plugin-react/issues/694)) ([5057858](https://github.com/vitejs/vite-plugin-react/commit/50578587472d23125980a46ff993fedaabca28d2))
* **react:** always skip react-compiler on non client envrionment ([#689](https://github.com/vitejs/vite-plugin-react/issues/689)) ([2f62dc0](https://github.com/vitejs/vite-plugin-react/commit/2f62dc0778e8c527c7951d6e35b0658a07f1e6fc))
* **rsc:** support cjs on module runner ([#687](https://github.com/vitejs/vite-plugin-react/issues/687)) ([7a92083](https://github.com/vitejs/vite-plugin-react/commit/7a92083eadb6ad8d92e6e560de414bc600e977c0))

### Miscellaneous Chores

* **rsc:** add .gitignore to create-vite example ([#686](https://github.com/vitejs/vite-plugin-react/issues/686)) ([6df7192](https://github.com/vitejs/vite-plugin-react/commit/6df71929ea5c2176408054bc40bcb8dfbb370018))
* **rsc:** mention deploy example ([#685](https://github.com/vitejs/vite-plugin-react/issues/685)) ([dea484a](https://github.com/vitejs/vite-plugin-react/commit/dea484ab8c740babab89da0f716bb929e57ba2af))

## <small>[0.4.17](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.16...plugin-rsc@0.4.17) (2025-08-05)</small>
### Bug Fixes

* **deps:** update all non-major dependencies ([#670](https://github.com/vitejs/vite-plugin-react/issues/670)) ([61d777d](https://github.com/vitejs/vite-plugin-react/commit/61d777ddc8524256f890f43a2a78dbfbfd1e97ac))
* **rsc:** keep manually added link stylesheet during dev ([#663](https://github.com/vitejs/vite-plugin-react/issues/663)) ([ac20b31](https://github.com/vitejs/vite-plugin-react/commit/ac20b31279f6884169503ef6e5786639c93251df))
* **rsc:** optimize `use-sync-external-store` ([#674](https://github.com/vitejs/vite-plugin-react/issues/674)) ([556de15](https://github.com/vitejs/vite-plugin-react/commit/556de15191eb2dfa26d9c0ba396c219d4b4a2dd4))

### Documentation

* **rsc:** notes on CSS support ([#673](https://github.com/vitejs/vite-plugin-react/issues/673)) ([9b2741f](https://github.com/vitejs/vite-plugin-react/commit/9b2741f3dc3da8e9e2ef486ab8d7eaa317230f7d))

### Miscellaneous Chores

* **rsc:** tweak types and examples ([#682](https://github.com/vitejs/vite-plugin-react/issues/682)) ([7b07098](https://github.com/vitejs/vite-plugin-react/commit/7b07098746a672950f278ea7edffd04834133d1f))

### Code Refactoring

* **rsc:** update `@mjackson/node-fetch-server` to `@remix-run/node-fetch-server` ([#680](https://github.com/vitejs/vite-plugin-react/issues/680)) ([97b5f1b](https://github.com/vitejs/vite-plugin-react/commit/97b5f1b26c2260825447c7e9781f1b168bebbe62))

### Tests

* **rsc:** test `React.cache`  ([#668](https://github.com/vitejs/vite-plugin-react/issues/668)) ([26ad4ad](https://github.com/vitejs/vite-plugin-react/commit/26ad4adcb69affb8932151f245b25a8fcf95c85a))
* **rsc:** test shared module hmr ([#671](https://github.com/vitejs/vite-plugin-react/issues/671)) ([775ac61](https://github.com/vitejs/vite-plugin-react/commit/775ac6157ef7af545b4cb03ff116a01c7cffa815))

## <small>[0.4.16](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.15...plugin-rsc@0.4.16) (2025-08-01)</small>
### Features

* merge `plugin-react-oxc` into `plugin-react` ([#609](https://github.com/vitejs/vite-plugin-react/issues/609)) ([133d786](https://github.com/vitejs/vite-plugin-react/commit/133d7865f42aa3376b5d3119fdb6a71eaf600275))
* **rsc:** add `useBuildAppHook` option to switch `plugin.buildApp` or `builder.buildApp` ([#653](https://github.com/vitejs/vite-plugin-react/issues/653)) ([83a5741](https://github.com/vitejs/vite-plugin-react/commit/83a57414169684bc705a5f6ca13cf097225117d8))
* **rsc:** support `client` environment as `react-server` ([#657](https://github.com/vitejs/vite-plugin-react/issues/657)) ([5df0070](https://github.com/vitejs/vite-plugin-react/commit/5df00707522ecbcda40f2c53c620f46b517e68e6))

### Bug Fixes

* **react:** use development jsx transform for `NODE_ENV=development` build ([#649](https://github.com/vitejs/vite-plugin-react/issues/649)) ([9ffd86d](https://github.com/vitejs/vite-plugin-react/commit/9ffd86df3c0cfc2060669cac7cc0b86144158b1b))
* **rsc:** avoid unnecessary server hmr due to tailwind module deps ([#658](https://github.com/vitejs/vite-plugin-react/issues/658)) ([c1383f8](https://github.com/vitejs/vite-plugin-react/commit/c1383f870137c0f152d7687250e8095635a1177c))

### Miscellaneous Chores

* **deps:** update all non-major dependencies ([#639](https://github.com/vitejs/vite-plugin-react/issues/639)) ([1a02ba7](https://github.com/vitejs/vite-plugin-react/commit/1a02ba7f4d3fe4a1696b43bc5161d6d466802faf))

### Code Refactoring

* **rsc:** move `writeManifest` inside `buildApp` hook ([#659](https://github.com/vitejs/vite-plugin-react/issues/659)) ([a34f8c5](https://github.com/vitejs/vite-plugin-react/commit/a34f8c537df2efc27d55a510bfd3597c639842f6))
* **rsc:** split encryption runtime exports ([#660](https://github.com/vitejs/vite-plugin-react/issues/660)) ([ff44ae4](https://github.com/vitejs/vite-plugin-react/commit/ff44ae49697e6ebca4ae4b241ab8337ebe659b5e))

### Tests

* **rsc:** port transform tests from waku ([#655](https://github.com/vitejs/vite-plugin-react/issues/655)) ([c602225](https://github.com/vitejs/vite-plugin-react/commit/c602225271d4acf462ba00f8d6d8a2e42492c5cd))
* **rsc:** split more independent tests ([#652](https://github.com/vitejs/vite-plugin-react/issues/652)) ([ac0cac7](https://github.com/vitejs/vite-plugin-react/commit/ac0cac7465cc94e91e8ac40269f36e91599b8162))

## <small>[0.4.15](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.14...plugin-rsc@0.4.15) (2025-07-28)</small>
### Features

* **rsc:** show warning for non optimized cjs ([#635](https://github.com/vitejs/vite-plugin-react/issues/635)) ([da0a786](https://github.com/vitejs/vite-plugin-react/commit/da0a78607d18be534232fba5ea95bb96cc987449))

### Bug Fixes

* **rsc:** improve auto css heuristics ([#643](https://github.com/vitejs/vite-plugin-react/issues/643)) ([f0b4cff](https://github.com/vitejs/vite-plugin-react/commit/f0b4cff636558a27ed4e5527ed4ea68a2243e40e))

## <small>[0.4.14](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.13...plugin-rsc@0.4.14) (2025-07-27)</small>
### Features

* **rsc:** validate `client-only` and `server-only` import during resolve ([#624](https://github.com/vitejs/vite-plugin-react/issues/624)) ([47d02d0](https://github.com/vitejs/vite-plugin-react/commit/47d02d0643cecc8243c72fddd9e125cc3d020847))

### Bug Fixes

* **rsc:** add `getEntrySource` assertion error message ([#633](https://github.com/vitejs/vite-plugin-react/issues/633)) ([4568556](https://github.com/vitejs/vite-plugin-react/commit/45685561d7e85cd6e2f77dc383cc6728d5fc916f))
* **rsc:** handle transform errors before server hmr ([#626](https://github.com/vitejs/vite-plugin-react/issues/626)) ([d28356f](https://github.com/vitejs/vite-plugin-react/commit/d28356f5caca2867ced9af3a02a3f441ff4a5238))

### Documentation

* **rsc:** fix jsdoc ([#623](https://github.com/vitejs/vite-plugin-react/issues/623)) ([73d457b](https://github.com/vitejs/vite-plugin-react/commit/73d457b2774c26a9fd1ec0f53aee8b4ff60dacd6))

### Miscellaneous Chores

* **deps:** update react-router ([#632](https://github.com/vitejs/vite-plugin-react/issues/632)) ([b077c4a](https://github.com/vitejs/vite-plugin-react/commit/b077c4a774ebe4a059902f3e0cb043c7194cceeb))

### Tests

* **rsc:** parallel e2e ([#628](https://github.com/vitejs/vite-plugin-react/issues/628)) ([24ddea4](https://github.com/vitejs/vite-plugin-react/commit/24ddea46d016311a8efe34314a4faa9d61af0d9d))
* **rsc:** split starter tests into multiple files ([#629](https://github.com/vitejs/vite-plugin-react/issues/629)) ([707f35b](https://github.com/vitejs/vite-plugin-react/commit/707f35bfe1fb047a453fca6281885bc1565303fc))

### Continuous Integration

* **rsc:** test react nightly ([#630](https://github.com/vitejs/vite-plugin-react/issues/630)) ([3e2f5a9](https://github.com/vitejs/vite-plugin-react/commit/3e2f5a9e03f56d1a218f030a71be72ef28b91a43))

## <small>[0.4.13](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.12...plugin-rsc@0.4.13) (2025-07-24)</small>
### Features

* **rsc:** add support for `experimental.renderBuiltUrl` on assets metadata ([#612](https://github.com/vitejs/vite-plugin-react/issues/612)) ([5314ed6](https://github.com/vitejs/vite-plugin-react/commit/5314ed60572e2c89963e5a720d21bcad17687382))

### Bug Fixes

* **deps:** update all non-major dependencies ([#568](https://github.com/vitejs/vite-plugin-react/issues/568)) ([d14f31d](https://github.com/vitejs/vite-plugin-react/commit/d14f31d3bf8487346ae6f9db7e6ca7263c93066b))
* **deps:** update all non-major dependencies ([#593](https://github.com/vitejs/vite-plugin-react/issues/593)) ([9ce3b22](https://github.com/vitejs/vite-plugin-react/commit/9ce3b22e4bc7db28f549b9c9b9195d2bd82ff736))
* **rsc:** await handler to avoid unhandled rejection ([#576](https://github.com/vitejs/vite-plugin-react/issues/576)) ([fa60127](https://github.com/vitejs/vite-plugin-react/commit/fa60127be46d48ecd8a8b0d0e7e6751ed11303e2))
* **rsc:** ensure trailing slash of `BASE_URL` ([#589](https://github.com/vitejs/vite-plugin-react/issues/589)) ([fa1d260](https://github.com/vitejs/vite-plugin-react/commit/fa1d260ef384d986284aaec6e0984967f3b436ad))
* **rsc:** update rsc-html-stream v0.0.7 ([#578](https://github.com/vitejs/vite-plugin-react/issues/578)) ([df6a38e](https://github.com/vitejs/vite-plugin-react/commit/df6a38e42339cf5deecd3f1b6c0aa4dd838833c5))

### Documentation

* **rsc:** add `CONTRIBUTING.md` ([#613](https://github.com/vitejs/vite-plugin-react/issues/613)) ([4005dbe](https://github.com/vitejs/vite-plugin-react/commit/4005dbe1bb943b882d8199ef29ccaeb9d268784e))

### Miscellaneous Chores

* replace `build --app` with `build` in examples ([#572](https://github.com/vitejs/vite-plugin-react/issues/572)) ([7c564ff](https://github.com/vitejs/vite-plugin-react/commit/7c564ff4f290a554927f2eef600e82bffee16e6b))
* **rsc:** comment ([#599](https://github.com/vitejs/vite-plugin-react/issues/599)) ([b550b63](https://github.com/vitejs/vite-plugin-react/commit/b550b63fe7f6ef82588ff0d60389d11906c3cc4e))
* **rsc:** deprecate `@vitejs/plugin-rsc/extra` API ([#592](https://github.com/vitejs/vite-plugin-react/issues/592)) ([bd6a2a1](https://github.com/vitejs/vite-plugin-react/commit/bd6a2a1ff272c8550f92bc1530c7b28fb81e1c60))
* **rsc:** deprecate `rsc-html-stream` re-exports ([#602](https://github.com/vitejs/vite-plugin-react/issues/602)) ([8e0e8b6](https://github.com/vitejs/vite-plugin-react/commit/8e0e8b60c511f34df188a8e8b103cf273891d7ad))
* **rsc:** fix temporary references in examples ([#603](https://github.com/vitejs/vite-plugin-react/issues/603)) ([22e5398](https://github.com/vitejs/vite-plugin-react/commit/22e53987a5548d237fcbe61377bd1da6e86947ef))
* **rsc:** move comment ([#604](https://github.com/vitejs/vite-plugin-react/issues/604)) ([4d6c72f](https://github.com/vitejs/vite-plugin-react/commit/4d6c72f81d64972ac84735240d27516be81431f8))
* **rsc:** remove `@vite/plugin-rsc/extra` API usages from examples ([#596](https://github.com/vitejs/vite-plugin-react/issues/596)) ([87319bf](https://github.com/vitejs/vite-plugin-react/commit/87319bf94ddb07061a1a80d3eefbfadb980f7008))
* **rsc:** remove console.log ([#607](https://github.com/vitejs/vite-plugin-react/issues/607)) ([2a7ff5c](https://github.com/vitejs/vite-plugin-react/commit/2a7ff5c93e600b06aafc7ce1a6d8a11c2ad4cf2e))
* **rsc:** tweak changelog ([#570](https://github.com/vitejs/vite-plugin-react/issues/570)) ([8804446](https://github.com/vitejs/vite-plugin-react/commit/88044469a6399c8a1d909b564f6ddc039782c066))
* **rsc:** update React Router RSC references ([#581](https://github.com/vitejs/vite-plugin-react/issues/581)) ([d464e8f](https://github.com/vitejs/vite-plugin-react/commit/d464e8fc9e8e14bdc84051de9ffacec16317d2ae))

### Tests

* **rsc:** add more basic tests to starter ([#600](https://github.com/vitejs/vite-plugin-react/issues/600)) ([d7fcdd8](https://github.com/vitejs/vite-plugin-react/commit/d7fcdd8550a7a11da01887cbf48a646af898b7f1))
* **rsc:** add SSR thenable workaround in examples ([#591](https://github.com/vitejs/vite-plugin-react/issues/591)) ([bfd434f](https://github.com/vitejs/vite-plugin-react/commit/bfd434f7fdd063ad017aa3c3a41e42983efc0ef4))
* **rsc:** add transitive cjs dep example ([#611](https://github.com/vitejs/vite-plugin-react/issues/611)) ([2a81b90](https://github.com/vitejs/vite-plugin-react/commit/2a81b9015286558c1463ab8079a7a6e40a82a5c6))
* **rsc:** refactor variant tests ([#601](https://github.com/vitejs/vite-plugin-react/issues/601)) ([5167266](https://github.com/vitejs/vite-plugin-react/commit/5167266aff6671065cf5b49cf8ada3d0ace2bbb4))
* **rsc:** remove global unhandled error handlers ([#597](https://github.com/vitejs/vite-plugin-react/issues/597)) ([c5f0bab](https://github.com/vitejs/vite-plugin-react/commit/c5f0babdc06c813bbef08d3c44ee696789416116))
* **rsc:** support `fs:cp` command in `setupInlineFixture` ([#621](https://github.com/vitejs/vite-plugin-react/issues/621)) ([d9cb926](https://github.com/vitejs/vite-plugin-react/commit/d9cb92650b217abba4144d62737c5c696b55d0bb))
* **rsc:** test build with `NODE_ENV=development` and vice versa ([#606](https://github.com/vitejs/vite-plugin-react/issues/606)) ([e8fa2d0](https://github.com/vitejs/vite-plugin-react/commit/e8fa2d0b4cb6e1dd3132fe8b7f45529a74d9be03))
* **rsc:** test module runner `hmr: false` ([#595](https://github.com/vitejs/vite-plugin-react/issues/595)) ([7223093](https://github.com/vitejs/vite-plugin-react/commit/7223093d793242f3d1ef313bbfec692499f0659e))

## <small>[0.4.12](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.11...plugin-rsc@0.4.12) (2025-07-14)</small>
### Features

* **rsc:** support regex directive for `transformHoistInlineDirective` ([#527](https://github.com/vitejs/vite-plugin-react/issues/527)) ([b598bb5](https://github.com/vitejs/vite-plugin-react/commit/b598bb57d6a7d76bb4ce41ae5990913461949ec3))

### Bug Fixes

* **rsc:** support setups without an SSR environment ([#562](https://github.com/vitejs/vite-plugin-react/issues/562)) ([0fc7fcd](https://github.com/vitejs/vite-plugin-react/commit/0fc7fcdae31568dcd2568a10333ad1e79e2d5176))

## <small>[0.4.11](https://github.com/vitejs/vite-plugin-react/compare/plugin-rsc@0.4.10...plugin-rsc@0.4.11) (2025-07-07)</small>
### Miscellaneous Chores

* fix rsc release ([#543](https://github.com/vitejs/vite-plugin-react/issues/543)) ([58c8bfd](https://github.com/vitejs/vite-plugin-react/commit/58c8bfd1f4e9584d81cb5e85aa466119fd72bbbc))

## <small>0.4.10 (2025-07-07)</small>
### Features

* add `@vitejs/plugin-rsc` ([#521](https://github.com/vitejs/vite-plugin-react/issues/521)) ([0318334](https://github.com/vitejs/vite-plugin-react/commit/03183346630c73fa58ca4d403785a36913535bb6))

### Bug Fixes

* **deps:** update all non-major dependencies ([#540](https://github.com/vitejs/vite-plugin-react/issues/540)) ([cfe2912](https://github.com/vitejs/vite-plugin-react/commit/cfe29122a8eec6c1e2ed9999531237dbce140e60))
* return `Plugin[]` instead of `PluginOption[]` ([#537](https://github.com/vitejs/vite-plugin-react/issues/537)) ([11f56d6](https://github.com/vitejs/vite-plugin-react/commit/11f56d63a9ed082137732211db556c784cadb523))

## v0.4.10-alpha.1 (2025-07-04)

- feat: add `@vitejs/plugin-rsc` ([#521](https://github.com/vitejs/vite-plugin-react/pull/521))

---

Older versions were released as [`@hi-ogawa/vite-rsc`](https://www.npmjs.com/package/@hiogawa/vite-rsc).

## v0.4.9 (2025-07-03)

- feat: re-export plugin from base exports entry ([#1125](https://github.com/hi-ogawa/vite-plugins/pull/1125))
- feat: re-export `transformHoistInlineDirective` ([#1122](https://github.com/hi-ogawa/vite-plugins/pull/1122))
- fix: don't copy vite manifest from rsc to client ([#1118](https://github.com/hi-ogawa/vite-plugins/pull/1118))

## v0.4.8 (2025-07-01)

- fix: copy all server assets to client by default and output `__vite_rsc_encryption_key` to fs directly ([#1102](https://github.com/hi-ogawa/vite-plugins/pull/1102))
- fix: stable client build ([#1094](https://github.com/hi-ogawa/vite-plugins/pull/1094))

## v0.4.7 (2025-06-28)

- feat: re-export `encodeReply` and `createTemporaryReferenceSet` from `react-server-dom/client` in `rsc` ([#1089](https://github.com/hi-ogawa/vite-plugins/pull/1089))
- chore: add `use cache` example ([#1089](https://github.com/hi-ogawa/vite-plugins/pull/1089))
- refactor: output code without indent ([#1087](https://github.com/hi-ogawa/vite-plugins/pull/1087))

## v0.4.6 (2025-06-27)

- fix: correctly resolve server function created by 3rd party package during dev ([#1067](https://github.com/hi-ogawa/vite-plugins/pull/1067))
- fix: correctly resolve client boundary created by server package during dev ([#1050](https://github.com/hi-ogawa/vite-plugins/pull/1050))
- fix: copy only css assets from server build to client build by default ([#1072](https://github.com/hi-ogawa/vite-plugins/pull/1072))
- fix: fix single quote string in `loadModule('ssr', 'index')` ([#1064](https://github.com/hi-ogawa/vite-plugins/pull/1064))
- fix: stabilize server build by externalizing encryption key file ([#1069](https://github.com/hi-ogawa/vite-plugins/pull/1069))
- fix: check build instead of `import.meta.env.DEV` ([#1083](https://github.com/hi-ogawa/vite-plugins/pull/1083))
- perf: strip code during scan build ([#1066](https://github.com/hi-ogawa/vite-plugins/pull/1066))
- feat: support preserving client reference original value ([#1078](https://github.com/hi-ogawa/vite-plugins/pull/1078))
- feat: add `enableActionEncryption` option for debugging purpose ([#1084](https://github.com/hi-ogawa/vite-plugins/pull/1084))
- feat: add `ignoredClientInServerPackageWarning` option ([#1065](https://github.com/hi-ogawa/vite-plugins/pull/1065))

## v0.4.5 (2025-06-22)

- feat: rsc css transform for default export identifier ([#1046](https://github.com/hi-ogawa/vite-plugins/pull/1046))
- feat: add `import.meta.viteRsc.loadBootstrapScriptContent` ([#1042](https://github.com/hi-ogawa/vite-plugins/pull/1042))
- fix: only include jsx/tsx for rsc css export transform ([#1034](https://github.com/hi-ogawa/vite-plugins/pull/1034))
- fix: ensure server-only and client-only not externalized ([#1045](https://github.com/hi-ogawa/vite-plugins/pull/1045))
- fix: use static import for `loadCss` virtuals during build ([#1043](https://github.com/hi-ogawa/vite-plugins/pull/1043))

## v0.4.4 (2025-06-20)

- feat: automatic rsc css export transform ([#1030](https://github.com/hi-ogawa/vite-plugins/pull/1030))
- feat: add plugin to workaround cloudflare error ([#1014](https://github.com/hi-ogawa/vite-plugins/pull/1014))
- feat: add load module dev proxy ([#1012](https://github.com/hi-ogawa/vite-plugins/pull/1012))
- feat: add `serverHandler` option to allow using ssr environment as main handler  ([#1008](https://github.com/hi-ogawa/vite-plugins/pull/1008))
- feat: support `loadModule(environment, entry)` ([#1007](https://github.com/hi-ogawa/vite-plugins/pull/1007))
- refactor: tweak renderHtml types and naming ([#1029](https://github.com/hi-ogawa/vite-plugins/pull/1029))

## v0.4.3 (2025-06-18)

- feat: add rsc css export transform helper ([#1002](https://github.com/hi-ogawa/vite-plugins/pull/1002))
- feat: support `loadCss(importer)` ([#1001](https://github.com/hi-ogawa/vite-plugins/pull/1001))

## v0.4.2 (2025-06-17)

- fix: allow custom `outDir` + chore: cloudflare single worker setup ([#990](https://github.com/hi-ogawa/vite-plugins/pull/990))
- fix: transform `__webpack_require__` global ([#980](https://github.com/hi-ogawa/vite-plugins/pull/980))
- fix: inline and optimize react deps in ssr environment ([#982](https://github.com/hi-ogawa/vite-plugins/pull/982))
- refactor: resolve self runtime import instead of `dedupe` ([#975](https://github.com/hi-ogawa/vite-plugins/pull/975))
- refactor: emit assets manifest during `writeBundle` ([#972](https://github.com/hi-ogawa/vite-plugins/pull/972))
- refactor: use `../` instead of `./../` path in output ([#963](https://github.com/hi-ogawa/vite-plugins/pull/963))

## v0.4.1 (2025-06-15)

- fix: re-publish to fix vendored dependency

## v0.4.0 (2025-06-15)

- refactor!: rework multi environment API (bootstrap script) ([#958](https://github.com/hi-ogawa/vite-plugins/pull/958))
- refactor!: rework multi environment API (ssr module) ([#957](https://github.com/hi-ogawa/vite-plugins/pull/957))
- refactor!: simplify plugin options in favor of `rollupOptions.input` ([#956](https://github.com/hi-ogawa/vite-plugins/pull/956))
- feat: expose `rsc-html-stream` utils ([#950](https://github.com/hi-ogawa/vite-plugins/pull/950))
- fix: fix missing rsc css on build ([#949](https://github.com/hi-ogawa/vite-plugins/pull/949))

## v0.3.4 (2025-06-12)

- fix: fix internal import to allow stable react vendor chunk ([#824](https://github.com/hi-ogawa/vite-plugins/pull/824))
- fix: compat for old react plugin ([#939](https://github.com/hi-ogawa/vite-plugins/pull/939))

## v0.3.3 (2025-06-12)

- feat: support rolldown-vite ([#931](https://github.com/hi-ogawa/vite-plugins/pull/931))
- fix: allow usage without react plugin ([#934](https://github.com/hi-ogawa/vite-plugins/pull/934))
- chore: docs ([#921](https://github.com/hi-ogawa/vite-plugins/pull/921))

## v0.3.2 (2025-06-10)

- feat: auto initialize ([#925](https://github.com/hi-ogawa/vite-plugins/pull/925))
- fix: emit assets manifest only in server build ([#929](https://github.com/hi-ogawa/vite-plugins/pull/929))
- refactor: inline react-server-dom in ssr (2) ([#927](https://github.com/hi-ogawa/vite-plugins/pull/927))
- chore: add `@cloudflare/vite-plugin` example ([#926](https://github.com/hi-ogawa/vite-plugins/pull/926))

## v0.3.1 (2025-06-06)

- refactor: vendor react-server-dom ([#854](https://github.com/hi-ogawa/vite-plugins/pull/854))

## v0.3.0 (2025-06-05)

- feat!: rsc css code split ([#876](https://github.com/hi-ogawa/vite-plugins/pull/876))
- feat: encrypt closure bind values ([#897](https://github.com/hi-ogawa/vite-plugins/pull/897))
- fix: client element as bound arg encryption ([#905](https://github.com/hi-ogawa/vite-plugins/pull/905))
- fix: throw on client reference call on server ([#900](https://github.com/hi-ogawa/vite-plugins/pull/900))

## v0.2.4 (2025-05-26)

- fix: fix stale css import in non-boundary client module ([#887](https://github.com/hi-ogawa/vite-plugins/pull/887))
- fix: fix non-client-boundary client module hmr in tailwind example ([#886](https://github.com/hi-ogawa/vite-plugins/pull/886))

## v0.2.3 (2025-05-22)

- fix: support Windows ([#884](https://github.com/hi-ogawa/vite-plugins/pull/884))
- fix: remove stale ssr styles during dev ([#879](https://github.com/hi-ogawa/vite-plugins/pull/879))
- fix: add `vary` header to avoid rsc payload on tab re-open ([#877](https://github.com/hi-ogawa/vite-plugins/pull/877))

## v0.2.2 (2025-05-18)

- fix: emit server assets and copy to client ([#861](https://github.com/hi-ogawa/vite-plugins/pull/861))
- fix: css modules hmr ([#860](https://github.com/hi-ogawa/vite-plugins/pull/860))
- fix: fix `collectCssByUrl` error ([#856](https://github.com/hi-ogawa/vite-plugins/pull/856))
- fix: show invalid transform error with code frame ([#871](https://github.com/hi-ogawa/vite-plugins/pull/871))
- perf: preload client reference deps before non-cached import ([#850](https://github.com/hi-ogawa/vite-plugins/pull/850))

## v0.2.1 (2025-05-13)

- feat: automatic client package heuristics ([#830](https://github.com/hi-ogawa/vite-plugins/pull/830))
- fix: add browser entry to  `optimizeDeps.entries` ([#846](https://github.com/hi-ogawa/vite-plugins/pull/846))
- fix: resolve self package from project root ([#845](https://github.com/hi-ogawa/vite-plugins/pull/845))
- refactor: use `rsc-html-stream` ([#843](https://github.com/hi-ogawa/vite-plugins/pull/843))

## v0.2.0 (2025-05-12)

- feat: apply tree-shaking to all client references (2nd approach) ([#838](https://github.com/hi-ogawa/vite-plugins/pull/838))
- feat: support nonce ([#813](https://github.com/hi-ogawa/vite-plugins/pull/813))
- feat: support css in rsc environment ([#825](https://github.com/hi-ogawa/vite-plugins/pull/825))
- feat: support css in client references ([#823](https://github.com/hi-ogawa/vite-plugins/pull/823))
- fix: handle html escape and binary data in ssr rsc payload ([#839](https://github.com/hi-ogawa/vite-plugins/pull/839))
- fix: wrap virtual to workaround module runner entry issues ([#832](https://github.com/hi-ogawa/vite-plugins/pull/832))
- fix: scan build in two environments ([#820](https://github.com/hi-ogawa/vite-plugins/pull/820))
- refactor: simplify client reference mapping ([#836](https://github.com/hi-ogawa/vite-plugins/pull/836))
- refactor!: remove `entries.css` ([#831](https://github.com/hi-ogawa/vite-plugins/pull/831))
- refactor: client reference ssr preinit/preload via proxy and remove `prepareDestination` ([#828](https://github.com/hi-ogawa/vite-plugins/pull/828))
- refactor: tweak asset links api ([#826](https://github.com/hi-ogawa/vite-plugins/pull/826))

## v0.1.1 (2025-05-07)

- fix: statically import client references virtual ([#815](https://github.com/hi-ogawa/vite-plugins/pull/815))
- fix: fix base for findSourceMapURL ([#812](https://github.com/hi-ogawa/vite-plugins/pull/812))
- fix: fix module runner line offset in `findSourceMapURL` ([#810](https://github.com/hi-ogawa/vite-plugins/pull/810))

## v0.1.0 (2025-05-01)

- feat: support `findSourceMapURL` for `createServerReference` ([#796](https://github.com/hi-ogawa/vite-plugins/pull/796))
- feat: support `findSourceMapURL` for component stack and replay logs ([#779](https://github.com/hi-ogawa/vite-plugins/pull/779))
- feat: support temporary references ([#776](https://github.com/hi-ogawa/vite-plugins/pull/776))
- feat: support custom base ([#775](https://github.com/hi-ogawa/vite-plugins/pull/775))
- feat: refactor assets manifest and expose it to rsc build ([#767](https://github.com/hi-ogawa/vite-plugins/pull/767))
- feat: ssr modulepreload only for build ([#763](https://github.com/hi-ogawa/vite-plugins/pull/763))
- feat: tree shake unused reference exports ([#761](https://github.com/hi-ogawa/vite-plugins/pull/761))
- feat: re-export react-server-dom ([#744](https://github.com/hi-ogawa/vite-plugins/pull/744))
- feat: support css entry ([#737](https://github.com/hi-ogawa/vite-plugins/pull/737))
- feat wrap client packages in virtual (support `clientPackages` options) ([#718](https://github.com/hi-ogawa/vite-plugins/pull/718))
- feat: modulepreload client reference on ssr ([#703](https://github.com/hi-ogawa/vite-plugins/pull/703))
- feat: create vite-rsc ([#692](https://github.com/hi-ogawa/vite-plugins/pull/692))
