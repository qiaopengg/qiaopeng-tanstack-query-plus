import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/react-query/index.ts',
    'src/core/index.ts',
    'src/core/devtools.ts',
    'src/hooks/index.ts',
    'src/hooks/useInViewPrefetch.ts',
    'src/features/index.ts',
    'src/components/index.ts',
    'src/types/index.ts',
    'src/utils/index.ts'
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-query-devtools', '@tanstack/react-query-persist-client'],
});
