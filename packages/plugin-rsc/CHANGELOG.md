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
