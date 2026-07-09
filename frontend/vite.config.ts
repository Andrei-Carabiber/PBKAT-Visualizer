import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        babel({presets: [reactCompilerPreset()]}),
        tailwindcss(),
    ],
    server: {
        port: 3000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        }
    },
    worker: {
        format: "es"
    },
    optimizeDeps: {
        rolldownOptions: {
            plugins: [importMetaUrlPlugin]
        }
    }
})
