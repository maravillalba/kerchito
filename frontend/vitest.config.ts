import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      // Los tests que recorren la app completa se acercan a los 5 s por defecto
      // cuando corren con cobertura o en una máquina cargada.
      testTimeout: 15_000,
      // npm run coverage: tabla en la terminal y reporte HTML en coverage/.
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/setupTests.ts',
          'src/test-utils.tsx',
          'src/main.tsx',
        ],
      },
    },
  })
)