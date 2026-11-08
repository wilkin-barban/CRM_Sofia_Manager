import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Packages are hoisted to the repository root by npm workspaces, but a nested
// install layout must keep working for contributors who use it.
const webModules = path.resolve(import.meta.dirname, 'apps/web/node_modules')
const rootModules = path.resolve(import.meta.dirname, 'node_modules')
const workspacePackage = (name: string) => {
  const nested = path.join(webModules, name)
  return fs.existsSync(nested) ? nested : path.join(rootModules, name)
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    dedupe: ['next', 'react', 'react-dom', '@supabase/ssr', 'sharp'],
    alias: {
      '@': path.resolve(import.meta.dirname, 'apps/web/src'),
      react: workspacePackage('react'),
      'react-dom': workspacePackage('react-dom'),
      next: workspacePackage('next'),
      '@supabase/ssr': workspacePackage('@supabase/ssr'),
      sharp: workspacePackage('sharp'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      'tests/e2e/**',
      'node_modules/**',
      'tests/unit/roles-authentication-e2e.test.ts',
      'tests/unit/web-client-operator-cart-flow.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'apps/web/src/app/api/webhooks/mercadopago/route.ts',
        'apps/web/src/app/api/webhooks/telegram/route.ts',
        'apps/web/src/app/api/webhooks/evolution/route.ts',
        'apps/web/src/app/api/webhooks/whatsapp/route.ts',
        'apps/web/src/lib/auth/safe-redirect.ts',
        'apps/web/src/lib/runtime/environment.ts',
      ],
      thresholds: {
        perFile: true,
        statements: 25,
        branches: 20,
        functions: 25,
        lines: 25,
      },
    },
  },
})
