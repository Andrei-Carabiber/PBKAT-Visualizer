import express from 'express';
import cors from 'cors';
import { exec } from 'node:child_process';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { createServerProcess } from 'vscode-ws-jsonrpc/server';

const app = express();
let corsOptions = {
    origin: 'http://localhost:3000',
}
app.use(cors(corsOptions));
app.use(express.json());

app.post('/run-protocol', (req, res) => {
    const protocolName = req.body.protocol || 'probP5_1_I_parallel';
    const command = `cd .. && cabal run ${protocolName} -- +RTS -t -RTS --json run`;

    exec(command, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: error.message, stderr });
        res.json({ output: stdout.trim(), stats: stderr.trim() });
    });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

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

    const serverConnection = createServerProcess(
        'Haskell',
        'haskell-language-server-wrapper',
        ['--lsp'],
        {
            cwd: '/opt/pbkat'
        }
    );

    // 🔥 THIS is the correct wiring
    reader.listen((msg) => {
        serverConnection.writer.write(msg);
    });

    serverConnection.reader.listen((msg) => {
        writer.write(msg);
    });
});

// Start listening on port 8080
server.listen(8080, () => {
    console.log('HTTP & WebSocket Server running on port 8080');
});