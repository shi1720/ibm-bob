import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], optimizeDeps:{exclude:['@electric-sql/pglite']}, base:process.env.BASE_PATH || '/', server:{proxy:{'/api':'http://127.0.0.1:3001'}}, worker:{format:'es'}, build:{target:'es2022',chunkSizeWarningLimit:2500}, test:{testTimeout:60000,hookTimeout:60000} } as any);
