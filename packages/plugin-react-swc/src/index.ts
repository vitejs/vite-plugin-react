import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { SourceMapPayload } from "module";
import {
  type Output,
  type ParserConfig,
  type ReactConfig,
  type JscTarget,
  transform,
  type Options as SWCOptions,
} from "@swc/core";
import type { PluginOption, UserConfig, BuildOptions } from "vite";
import { createRequire } from "module";

const runtimePublicPath = "/@react-refresh";

const preambleCode = `import { injectIntoGlobalHook } from "__PATH__";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;`;

const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));
const resolve = createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url,
).resolve;
const reactCompRE = /extends\s+(?:React\.)?(?:Pure)?Component/;
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/;

type Options = {
  /**
   * Control where the JSX factory is imported from.
   * @default "react"
   */
  jsxImportSource?: string;
  /**
   * Enable TypeScript decorators. Requires experimentalDecorators in tsconfig.
   * @default false
   */
  tsDecorators?: boolean;
  /**
   * Use SWC plugins. Enable SWC at build time.
   * @default undefined
   */
  plugins?: [string, Record<string, any>][];
  /**
   * Set the target for SWC in dev. This can avoid to down-transpile private class method for example.
   * For production target, see https://vitejs.dev/config/build-options.html#build-target
   * @default "es2020"
   */
  devTarget?: JscTarget;
  /**
   * Override the default include list (.ts, .tsx, .mts, .jsx, .mdx).
   * This requires to redefine the config for any file you want to be included.
   * If you want to trigger fast refresh on compiled JS, use `jsx: true`.
   * Exclusion of node_modules should be handled by the function if needed.
   */
  parserConfig?: (id: string) => ParserConfig | undefined;
  /**
   * The future of Vite is with OXC, and from the beginning this was a design choice
   * to not exposed too many specialties from SWC so that Vite React users can move to
   * another transformer later.
   * Also debugging why some specific version of decorators with some other unstable/legacy
   * feature doesn't work is not fun, so we won't provide support for it, hence the name `useAtYourOwnRisk`
   */
  useAtYourOwnRisk_mutateSwcOptions?: (options: SWCOptions) => void;
};

const react = (_options?: Options): PluginOption[] => {
  let hmrDisabled = false;
  const options = {
    jsxImportSource: _options?.jsxImportSource ?? "react",
    tsDecorators: _options?.tsDecorators,
    plugins: _options?.plugins
      ? _options?.plugins.map((el): typeof el => [resolve(el[0]), el[1]])
      : undefined,
    devTarget: _options?.devTarget ?? "es2020",
    parserConfig: _options?.parserConfig,
    useAtYourOwnRisk_mutateSwcOptions:
      _options?.useAtYourOwnRisk_mutateSwcOptions,
  };

  return [
    {
      name: "vite:react-swc:resolve-runtime",
      apply: "serve",
      enforce: "pre", // Run before Vite default resolve to avoid syscalls
      resolveId: (id) => (id === runtimePublicPath ? id : undefined),
      load: (id) =>
        id === runtimePublicPath
          ? readFileSync(join(_dirname, "refresh-runtime.js"), "utf-8")
          : undefined,
    },
    {
      name: "vite:react-swc",
      apply: "serve",
      config: () => ({
        esbuild: false,
        optimizeDeps: {
          include: [`${options.jsxImportSource}/jsx-dev-runtime`],
          esbuildOptions: { jsx: "automatic" },
        },
      }),
      configResolved(config) {
        if (config.server.hmr === false) hmrDisabled = true;
        const mdxIndex = config.plugins.findIndex(
          (p) => p.name === "@mdx-js/rollup",
        );
        if (
          mdxIndex !== -1 &&
          mdxIndex >
            config.plugins.findIndex((p) => p.name === "vite:react-swc")
        ) {
          throw new Error(
            "[vite:react-swc] The MDX plugin should be placed before this plugin",
          );
        }
      },
      transformIndexHtml: (_, config) => [
        {
          tag: "script",
          attrs: { type: "module" },
          children: preambleCode.replace(
            "__PATH__",
            config.server!.config.base + runtimePublicPath.slice(1),
          ),
        },
      ],
      async transform(code, _id, transformOptions) {
        const id = _id.split("?")[0];
        const refresh = !transformOptions?.ssr && !hmrDisabled;

        const result = await transformWithOptions(
          id,
          code,
          options.devTarget,
          options,
          {
            refresh,
            development: true,
            runtime: "automatic",
            importSource: options.jsxImportSource,
          },
        );
        if (!result) return;
        if (!refresh) return result;

        const hasRefresh = refreshContentRE.test(result.code);
        if (!hasRefresh && !reactCompRE.test(result.code)) return result;

        const sourceMap: SourceMapPayload = JSON.parse(result.map!);
        sourceMap.mappings = ";;" + sourceMap.mappings;

        result.code = `import * as RefreshRuntime from "${runtimePublicPath}";

${result.code}`;

        if (hasRefresh) {
          sourceMap.mappings = ";;;;;;" + sourceMap.mappings;
          result.code = `if (!window.$RefreshReg$) throw new Error("React refresh preamble was not loaded. Something is wrong.");
const prevRefreshReg = window.$RefreshReg$;
const prevRefreshSig = window.$RefreshSig$;
window.$RefreshReg$ = RefreshRuntime.getRefreshReg("${id}");
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

${result.code}

window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
`;
        }

        result.code += `
RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
  RefreshRuntime.registerExportsForReactRefresh("${id}", currentExports);
  import.meta.hot.accept((nextExports) => {
    if (!nextExports) return;
    const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("${id}", currentExports, nextExports);
    if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
  });
});
`;

        return { code: result.code, map: sourceMap };
      },
    },
    options.plugins
      ? {
          name: "vite:react-swc",
          apply: "build",
          enforce: "pre", // Run before esbuild
          config: (userConfig) => ({
            build: silenceUseClientWarning(userConfig),
          }),
          transform: (code, _id) =>
            transformWithOptions(_id.split("?")[0], code, "esnext", options, {
              runtime: "automatic",
              importSource: options.jsxImportSource,
            }),
        }
      : {
          name: "vite:react-swc",
          apply: "build",
          config: (userConfig) => ({
            build: silenceUseClientWarning(userConfig),
            esbuild: {
              jsx: "automatic",
              jsxImportSource: options.jsxImportSource,
              tsconfigRaw: {
                compilerOptions: { useDefineForClassFields: true },
              },
            },
          }),
        },
  ];
};

const transformWithOptions = async (
  id: string,
  code: string,
  target: JscTarget,
  options: Options,
  reactConfig: ReactConfig,
) => {
  const decorators = options?.tsDecorators ?? false;
  const parser: ParserConfig | undefined = options.parserConfig
    ? options.parserConfig(id)
    : id.endsWith(".tsx")
    ? { syntax: "typescript", tsx: true, decorators }
    : id.endsWith(".ts") || id.endsWith(".mts")
    ? { syntax: "typescript", tsx: false, decorators }
    : id.endsWith(".jsx")
    ? { syntax: "ecmascript", jsx: true }
    : id.endsWith(".mdx")
    ? // JSX is required to trigger fast refresh transformations, even if MDX already transforms it
      { syntax: "ecmascript", jsx: true }
    : undefined;
  if (!parser) return;

  let result: Output;
  try {
    const swcOptions: SWCOptions = {
      filename: id,
      swcrc: false,
      configFile: false,
      sourceMaps: true,
      jsc: {
        target,
        parser,
        experimental: { plugins: options.plugins },
        transform: {
          useDefineForClassFields: true,
          react: reactConfig,
        },
      },
    };
    if (options.useAtYourOwnRisk_mutateSwcOptions) {
      options.useAtYourOwnRisk_mutateSwcOptions(swcOptions);
    }
    result = await transform(code, swcOptions);
  } catch (e: any) {
    const message: string = e.message;
    const fileStartIndex = message.indexOf("╭─[");
    if (fileStartIndex !== -1) {
      const match = message.slice(fileStartIndex).match(/:(\d+):(\d+)]/);
      if (match) {
        e.line = match[1];
        e.column = match[2];
      }
    }
    throw e;
  }

  return result;
};

const silenceUseClientWarning = (userConfig: UserConfig): BuildOptions => ({
  rollupOptions: {
    onwarn(warning, defaultHandler) {
      if (
        warning.code === "MODULE_LEVEL_DIRECTIVE" &&
        warning.message.includes("use client")
      ) {
        return;
      }
      // https://github.com/vitejs/vite/issues/15012
      if (
        warning.code === "SOURCEMAP_ERROR" &&
        warning.message.includes("resolve original location") &&
        warning.pos === 0
      ) {
        return;
      }
      if (userConfig.build?.rollupOptions?.onwarn) {
        userConfig.build.rollupOptions.onwarn(warning, defaultHandler);
      } else {
        defaultHandler(warning);
      }
    },
  },
});

export default react;
