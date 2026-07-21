import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin';

//import * as fs from "node:fs";

export default defineConfig({
    plugins: [
        react(),
        babel({presets: [reactCompilerPreset()]}),
        tailwindcss(),
        // For adding examples
        // {
        //     name: 'save-json-plugin',
        //     configureServer(server) {
        //         server.middlewares.use('/api/save-json', (req, res) => {
        //             if (req.method === 'POST') {
        //                 let body = '';
        //                 req.on('data', chunk => {
        //                     body += chunk;
        //                 });
        //                 req.on('end', () => {
        //                     const {fileName, data} = JSON.parse(body);
        //                     const filePath = path.resolve(__dirname, 'src/examples', fileName);
        //
        //                     fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        //                     res.statusCode = 200;
        //                     res.end(JSON.stringify({status: 'success'}));
        //                 });
        //             }
        //         });
        //     }
        // }
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
        esbuildOptions: {
            plugins: [importMetaUrlPlugin]
        }
    }
})
