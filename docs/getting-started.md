# Getting Started

## Scaffold a New Project

The fastest way to start is with `create-gea`:

```bash
npm create gea@latest my-app
cd my-app
npm install
npm run dev
```

This gives you a Vite-powered project with TypeScript, a sample store, class and function components, and hot module replacement.

## Add to an Existing Vite Project

Install the core package and the Vite plugin:

```bash
npm install @geajs/core
npm install -D @geajs/vite-plugin
```

Add the plugin to your Vite config:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { geaPlugin } from '@geajs/vite-plugin'

export default defineConfig({
  plugins: [geaPlugin()]
})
```

## TypeScript Setup

Projects scaffolded with `create-gea` come with TypeScript pre-configured. If you're adding Gea to an existing project, add these settings to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@geajs/core"
  }
}
```

This enables full JSX type-checking — prop autocompletion, type errors on invalid attributes, and hover types — in any TypeScript-aware editor, without needing a framework-specific plugin.

## Create a Store

Stores hold shared application state. Extend `Store`, declare reactive properties as class fields, add methods, and export a singleton instance.

```ts
// counter-store.ts
import { Store } from '@geajs/core'

class CounterStore extends Store {
  count = 0

  increment() { this.count++ }
  decrement() { this.count-- }
}

export default new CounterStore()
```

## Create a Component

Components read from stores and return JSX from their `template()` method.

```jsx
// app.tsx
import { Component } from '@geajs/core'
import counterStore from './counter-store'

export default class App extends Component {
  template() {
    return (
      <div>
        <h1>{counterStore.count}</h1>
        <button click={counterStore.increment}>+</button>
        <button click={counterStore.decrement}>-</button>
      </div>
    )
  }
}
```

## Render to the DOM

```ts
// main.ts
import App from './app'

const app = new App()
app.render(document.getElementById('app'))
```

## HTML Entry Point

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Gea App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

## Next Steps

- Learn about [Stores](core-concepts/stores.md) and the reactivity system
- Explore [Components](core-concepts/components.md) — class and function styles
- Understand [JSX Syntax](core-concepts/jsx-syntax.md) differences from React
- Add client-side routing with the built-in [Router](gea-router/overview.md)
- Add mobile UI with [Gea Mobile](gea-mobile/overview.md)
- Use Gea without a build step — [Browser Usage](browser-usage.md)
