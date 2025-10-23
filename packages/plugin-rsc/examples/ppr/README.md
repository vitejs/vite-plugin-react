# Partial Prerendering (PPR) Example

This example demonstrates React's **Partial Prerendering (PPR)** feature with Vite and `@vitejs/plugin-rsc`.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc/examples/ppr)

## What is PPR?

Partial Prerendering (PPR) is a React feature that combines the benefits of static site generation (SSG) and server-side rendering (SSR) in a single page. With PPR:

1. **Static Shell**: The outer HTML structure and non-dynamic content are prerendered at build time
2. **Dynamic Holes**: Parts wrapped in `<Suspense>` boundaries are replaced with fallbacks in the static shell
3. **Progressive Streaming**: Dynamic content streams in as it resolves, replacing the fallbacks

This approach provides:

- **Fast initial paint**: Static content is sent immediately
- **SEO benefits**: Search engines see the static shell instantly
- **Dynamic capabilities**: User-specific or time-sensitive data still streams in
- **Better UX**: Users see meaningful content while dynamic parts load

## How This Example Works

### Static Content (Prerendered)

- Header with logo and title
- Descriptive text sections
- Page layout and structure

### Dynamic Content (Streamed)

- **User Widget**: Simulates fetching user status (800ms delay)
- **Dynamic Data**: Fetches request-specific information (1000ms delay)

Both dynamic components are wrapped in `<Suspense>` boundaries with skeleton fallbacks.

## Key Files

- **[`src/framework/entry.ssr.tsx`](./src/framework/entry.ssr.tsx)** - Uses `prerender()` from `react-dom/static.edge` instead of `renderToReadableStream()` to enable PPR
- **[`src/root.tsx`](./src/root.tsx)** - Demonstrates mixing static and dynamic content with Suspense boundaries
- **[`src/dynamic-content.tsx`](./src/dynamic-content.tsx)** - Async server component that streams in
- **[`src/dynamic-user.tsx`](./src/dynamic-user.tsx)** - Another async server component with simulated delay

## Running the Example

```sh
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Understanding the Output

When you load the page:

1. **Immediate**: You'll see the static shell with skeleton loaders
2. **~800ms**: The user widget streams in and replaces its skeleton
3. **~1000ms**: The dynamic content section streams in and replaces its skeleton

### Inspecting the Behavior

- Visit [`http://localhost:5173/`](http://localhost:5173/) - See PPR in action
- Visit [`http://localhost:5173/?__rsc`](http://localhost:5173/?__rsc) - View the raw RSC payload
- Check Network tab - You'll see the initial HTML contains the static shell, then streaming chunks arrive

## Comparison with SSR

| Feature            | Traditional SSR         | PPR                            |
| ------------------ | ----------------------- | ------------------------------ |
| Initial Response   | Waits for all data      | Sends static shell immediately |
| Dynamic Content    | Blocks HTML             | Streams in progressively       |
| Time to First Byte | Slower (waits for data) | Faster (static shell)          |
| User Experience    | All-or-nothing          | Progressive enhancement        |

## Related Resources

- [React Server Components Documentation](https://react.dev/reference/rsc/server-components)
- [Next.js PPR Discussion](https://github.com/vercel/next.js/discussions/77740#discussioncomment-12848061)
- [Waku PPR Discussion](https://github.com/wakujs/waku/discussions/1172)
- [@vitejs/plugin-rsc Documentation](../../README.md)
