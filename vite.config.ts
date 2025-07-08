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
    // Proteções anti-exposição de código
    sourcemap: mode === 'development', // Remove source maps em produção
    minify: 'terser', // Usa Terser para minificação avançada
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.logs em produção
        drop_debugger: true, // Remove debugger statements
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
      mangle: {
        // Obfusca nomes de variáveis e funções
        properties: false, // Não obfusca propriedades para evitar quebrar código
        keep_fnames: false, // Obfusca nomes de funções
      },
      format: {
        comments: false, // Remove todos os comentários
      },
    },
    rollupOptions: {
      output: {
        // Ofusca nomes de chunks
        chunkFileNames: mode === 'production' ? 'js/[hash].js' : '[name]-[hash].js',
        entryFileNames: mode === 'production' ? 'js/[hash].js' : '[name]-[hash].js',
        assetFileNames: mode === 'production' ? 'assets/[hash].[ext]' : '[name]-[hash].[ext]',
        manualChunks: {
          // Code splitting para dificultar análise
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          forms: ['react-hook-form', '@hookform/resolvers'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  define: {
    // Remove informações de desenvolvimento em produção
    __DEV__: mode === 'development',
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
}));
