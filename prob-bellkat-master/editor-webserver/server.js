import express from 'express';
import cors from 'cors';
import { exec } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto'; // Built-in UUID generator (no npm install needed!)
import { WebSocketServer } from 'ws';
import { WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { createServerProcess } from 'vscode-ws-jsonrpc/server';
import path from 'node:path';
import fs from 'node:fs/promises';

const app = express();
const corsOptions = {
    origin: 'http://localhost:3000',
};
app.use(cors(corsOptions));
app.use(express.json());

const TEMPLATE_DIR = path.resolve('/opt/pbkat');
const ALLOWED_COMMANDS = new Set(['run', 'execution-trace', 'automaton', 'probability']);

const SHARED_BUILD_DIR = '/opt/pbkat/shared-build-cache';


async function createIsolatedWorkspace(id) {
    const workspacePath = path.resolve(`/tmp/pbkat-workspace-${id}`);
    await fs.mkdir(workspacePath, { recursive: true });

    try {
        const entries = await fs.readdir(TEMPLATE_DIR, { withFileTypes: true });
        for (const entry of entries) {
            // Ignore heavy folders we don't want to copy
            if (
                entry.name === 'dist-newstyle' ||
                entry.name === '.git' ||
                entry.name === 'shared-build-cache'
            ) {
                continue;
            }

            const srcPath = path.join(TEMPLATE_DIR, entry.name);
            const destPath = path.join(workspacePath, entry.name);
            await fs.cp(srcPath, destPath, { recursive: true });
        }
        return workspacePath;
    } catch (err) {
        // Cleanup if something goes wrong during copying
        await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => {});
        throw err;
    }
}

app.post('/run-protocol', async (req, res) => {
    const code = req.body.code;
    const command = ALLOWED_COMMANDS.has(req.body.command) ? req.body.command : 'run';

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing "code" in request body' });
    }

    const requestId = crypto.randomUUID();
    let workspacePath;

    try {
        workspacePath = await createIsolatedWorkspace(requestId);

        const playgroundFile = path.join(workspacePath, 'playground-example/Playground.hs');
        await fs.writeFile(playgroundFile, code, 'utf-8');

        const cmd = `cabal run playground --builddir=${SHARED_BUILD_DIR} -- ${command}`;

        exec(cmd, { cwd: workspacePath, maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
            //Cleanup
            try {
                await fs.rm(workspacePath, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error(`Failed to clean up workspace ${workspacePath}:`, cleanupErr);
            }

            if (error) {
                return res.status(500).json({ error: error.message, stderr });
            }

            let msg = stdout.trim()
            
            msg = msg.slice(msg.indexOf("⦅"), msg.length)
            res.json({ output: msg, stats: stderr.trim() });
        });

    } catch (err) {
        if (workspacePath) {
            await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => {});
        }
        return res.status(500).json({ error: `Server failed to initialize run: ${err.message}` });
    }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });


wss.on('connection', async (ws) => {
    console.log("New client connected. Setting up isolated environment...");

    const connectionId = crypto.randomUUID();
    let workspacePath;
    let hlsProcess = null;
    let cachedInitializeResult = null;
    let activeDocUri = null;

    const socket = {
        send: (content) => ws.send(content),
        onMessage: (cb) => ws.on('message', cb),
        onError: (cb) => ws.on('error', cb),
        onClose: (cb) => ws.on('close', cb),
        dispose: () => ws.close()
    };

    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);

    try {
        // Create a unique folder for this WebSocket connection
        workspacePath = await createIsolatedWorkspace(connectionId);

        // Spawn a DEDICATED HLS process pointing exclusively to this workspace
        hlsProcess = createServerProcess(
            'Haskell', 'haskell-language-server-wrapper', ['--lsp'],
            { cwd: workspacePath }
        );

        hlsProcess.onExit?.(() => {
            console.log(`HLS Process for connection ${connectionId} exited.`);
            hlsProcess = null;
            cachedInitializeResult = null;
            activeDocUri = null;
        });

        // Pipe HLS stdout/diagnostics back ONLY to this connected client
        hlsProcess.reader.listen((msg) => {
            if (msg.id !== undefined && msg.result && cachedInitializeResult === null && msg.result.capabilities) {
                cachedInitializeResult = msg;
            }
            writer.write(msg);
        });

    } catch (err) {
        console.error("Failed to initialize client environment:", err);
        ws.close();
        return;
    }

    let seenInitialize = false;

    reader.listen((msg) => {
        if (!hlsProcess) return;

        if (msg.method === 'initialize' && cachedInitializeResult) {
            if (activeDocUri) {
                hlsProcess.writer.write({
                    jsonrpc: '2.0',
                    method: 'textDocument/didClose',
                    params: { textDocument: { uri: activeDocUri } }
                });
                activeDocUri = null;
            }
            writer.write({ ...cachedInitializeResult, id: msg.id });
            seenInitialize = true;
            return;
        }
        if (msg.method === 'initialized' && seenInitialize) {
            return;
        }
        if (msg.method === 'shutdown') {
            writer.write({ jsonrpc: '2.0', id: msg.id, result: null });
            return;
        }
        if (msg.method === 'exit') {
            return;
        }
        if (msg.method === '$/setTrace') {
            return;
        }
        if (msg.method === 'textDocument/didOpen') {
            activeDocUri = msg.params?.textDocument?.uri ?? activeDocUri;
        }

        hlsProcess.writer.write(msg);
    });

    ws.on('close', async () => {
        console.log(`Client ${connectionId} disconnected. Cleaning up...`);

        if (hlsProcess) {
            try {
                hlsProcess.dispose();
            } catch (e) {
                console.error("Error disposing HLS process:", e);
            }
        }

        if (workspacePath) {
            try {
                await fs.rm(workspacePath, { recursive: true, force: true });
                console.log(`Workspace ${workspacePath} deleted.`);
            } catch (cleanupErr) {
                console.error(`Failed to delete workspace ${workspacePath}:`, cleanupErr);
            }
        }
    });
});

server.listen(8080, () => {
    console.log('HTTP & WebSocket Server running on port 8080');
});