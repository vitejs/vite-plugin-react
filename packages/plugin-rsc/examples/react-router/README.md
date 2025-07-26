# Welcome to React Router! (Experimental RSC)

⚠️ **EXPERIMENTAL**: This template demonstrates React Server Components with React Router. This is experimental technology and not recommended for production use.

A modern template for exploring React Server Components (RSC) with React Router, powered by Vite.

> [!NOTE]
> React Router now provides [official RSC support](https://reactrouter.com/how-to/react-server-components) for Vite. This example is updated to match the latest official template from @remix-run/react-router-templates.

## Features

- 🧪 **Experimental React Server Components**
- 🚀 Server-side rendering with RSC
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization with Vite
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)
- 📚 [React Server Components guide](https://reactrouter.com/how-to/react-server-components)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Running Production Build

Run the production server:

```bash
npm start
```

## Understanding React Server Components

This template includes three entry points:

- **`entry.rsc.tsx`** - React Server Components entry point
- **`entry.ssr.tsx`** - Server-side rendering entry point
- **`entry.browser.tsx`** - Client-side hydration entry point

Learn more about React Server Components with React Router in our [comprehensive guide](https://reactrouter.com/how-to/react-server-components).

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## CloudFlare Support

CloudFlare specific configurations are available in the `cf/` directory:

```bash
npm run cf-dev
npm run cf-build
npm run cf-preview
npm run cf-release
```

---

Built with ❤️ using React Router.
