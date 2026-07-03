import express from 'express';
import cors from 'cors';
import { exec } from 'node:child_process';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { createConnection, createServerProcess } from 'vscode-ws-jsonrpc/server';

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
    console.log("React app connected via WebSocket. Starting HLS...");

    const socket = {
        send: content => ws.send(content, error => {
            if (error) console.error("WebSocket send error:", error);
        }),
        onMessage: cb => ws.on('message', cb),
        onError: cb => ws.on('error', cb),
        onClose: cb => ws.on('close', cb),
        dispose: () => ws.close()
    };

    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);

    const serverConnection = createServerProcess(
        'Haskell',
        'haskell-language-server-wrapper',
        ['--lsp'],
        { cwd: '../' }
    );

    if (serverConnection.process) {
        serverConnection.process.stderr.on('data', (data) => {
            console.error(`[HLS LOG]: ${data.toString()}`);
        });
        serverConnection.process.on('exit', (code) => {
            console.error(`[HLS EXIT]: Process exited with code ${code}`);
        });
    }

    const connection = createConnection(reader, writer, () => serverConnection.dispose());

    connection.forward(serverConnection, message => {
        if (message.method) {
            console.log("Monaco sent:", message.method);
        }
        return message;
    });
});

// Start listening on port 8080
server.listen(8080, () => {
    console.log('HTTP & WebSocket Server running on port 8080');
});