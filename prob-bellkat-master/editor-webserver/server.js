import express from 'express';
import cors from 'cors';
import { exec } from 'node:child_process';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { createServerProcess } from 'vscode-ws-jsonrpc/server';
import path from 'node:path';
import fs from 'node:fs/promises';

const app = express();
let corsOptions = {
    origin: 'http://localhost:3000',
}
app.use(cors(corsOptions));
app.use(express.json());

const PLAYGROUND_FILE = path.resolve('/opt/pbkat/playground-example/Playground.hs');
const ALLOWED_COMMANDS = new Set(['run', 'execution-trace', 'automaton', 'probability']);


app.post('/run-protocol', async (req, res) => {
    const code = req.body.code;
    const command = ALLOWED_COMMANDS.has(req.body.command) ? req.body.command : 'run';

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing "code" in request body' });
    }

    try {
        await fs.writeFile(PLAYGROUND_FILE, code, 'utf-8');
    } catch (err) {
        return res.status(500).json({ error: `Failed to write source: ${err.message}` });
    }

    const cmd = `cd /opt/pbkat && cabal run playground -- ${command}`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message, stderr });
        res.json({ output: stdout.trim(), stats: stderr.trim() });
    });
});

const server = http.createServer(app);


const wss = new WebSocketServer({ server });


let hlsProcess = null;
let cachedInitializeResult = null;
let activeDocUri = null;
let currentClientWriter = null; // where to send server->client responses

function startHls() {
    hlsProcess = createServerProcess(
        'Haskell', 'haskell-language-server-wrapper', ['--lsp'],
        { cwd: '/opt/pbkat' }
    );
    hlsProcess.onExit?.(() => {
        hlsProcess = null;
        cachedInitializeResult = null;
        activeDocUri = null;
    });

    hlsProcess.reader.listen((msg) => {
        // Cache the initialize result the first (real) time it comes back
        if (msg.id !== undefined && msg.result && cachedInitializeResult === null && msg.result.capabilities) {
            cachedInitializeResult = msg;
        }
        currentClientWriter?.write(msg);
    });
}
startHls(); // start once at server boot, not on first connection

wss.on('connection', (ws) => {
    console.log("Connected to frontend");

    const socket = {
        send: (content) => ws.send(content),
        onMessage: (cb) => ws.on('message', cb),
        onError: (cb) => ws.on('error', cb),
        onClose: (cb) => ws.on('close', cb),
        dispose: () => ws.close()
    };

    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);
    currentClientWriter = writer;

    let seenInitialize = false;

    reader.listen((msg) => {
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
        if (msg.method === 'shutdown' ) {
            writer.write({ jsonrpc: '2.0', id: msg.id, result: null }); // ack locally
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

    ws.on('close', () => {
        if (currentClientWriter === writer) currentClientWriter = null;
    });
});

// Start listening on port 8080
server.listen(8080, () => {
    console.log('HTTP & WebSocket Server running on port 8080');
});