import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // MÁXIMA PROTEÇÃO ANTI-EXPOSIÇÃO DE CÓDIGO
    sourcemap: false, // NUNCA gerar source maps em build
    minify: 'terser', // Usa Terser para minificação máxima
    terserOptions: {
      compress: {
        drop_console: true, // Remove TODOS os console.logs
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.error'], // Remove todos os logs
        dead_code: true, // Remove código morto
        conditionals: true, // Otimiza condicionais
        evaluate: true, // Avalia expressões constantes
        booleans: true, // Otimiza booleanos
        loops: true, // Otimiza loops
        unused: true, // Remove código não usado
        toplevel: true, // Remove declarações não usadas no nível superior
        hoist_funs: true, // Içar declarações de função
        hoist_props: true, // Içar propriedades constantes
        hoist_vars: true, // Içar declarações var
        if_return: true, // Otimiza if-return
        join_vars: true, // Une declarações var
        cascade: true, // Otimiza sequências
        collapse_vars: true, // Colapsa variáveis
        reduce_vars: true, // Reduz referências de variáveis
        warnings: false, // Remove avisos
        negate_iife: true, // Nega IIFEs
        pure_getters: true, // Assume getters puros
        keep_fargs: false, // Remove parâmetros não usados
        keep_fnames: false, // Remove nomes de função
        passes: 3, // Múltiplas passadas de otimização
      },
      mangle: {
        // OBFUSCAÇÃO MÁXIMA
        toplevel: true, // Obfusca nomes no nível superior
        keep_classnames: false, // Obfusca nomes de classe
        keep_fnames: false, // Obfusca nomes de função
        properties: {
          regex: /^_/, // Obfusca propriedades que começam com _
        },
        safari10: true, // Compatibilidade Safari 10
      },
      format: {
        comments: false, // Remove TODOS os comentários
        preamble: "", // Remove preamble
        wrap_iife: true, // Wrap IIFEs
      },
    },
    rollupOptions: {
      output: {
        // OBFUSCAÇÃO MÁXIMA DE NOMES DE ARQUIVO
        chunkFileNames: () => {
          const randomHash = Math.random().toString(36).substring(2, 15);
          return `js/${randomHash}.[hash].js`;
        },
        entryFileNames: () => {
          const randomHash = Math.random().toString(36).substring(2, 15);
          return `js/${randomHash}.[hash].js`;
        },
        assetFileNames: () => {
          const randomHash = Math.random().toString(36).substring(2, 15);
          return `assets/${randomHash}.[hash].[ext]`;
        },
        manualChunks: {
          // Divisão complexa para dificultar análise
          'vendor-core': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-db': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    // Otimizações adicionais
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 0, // Não inline assets para dificultar análise
  },
  define: {
    // MÁXIMA PROTEÇÃO - Remove informações sensíveis
    __DEV__: false, // SEMPRE false em produção
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.DEBUG': JSON.stringify(false),
    'globalThis.__DEV__': false,
    'window.__REACT_DEVTOOLS_GLOBAL_HOOK__': '({ isDisabled: true })',
  },
}));
