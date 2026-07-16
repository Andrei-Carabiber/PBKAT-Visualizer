import express from 'express';
import cors from 'cors';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import http from 'node:http';
import crypto from 'node:crypto';
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
const ALLOWED_COMMANDS = new Set(['run', 'execution-trace', 'probability']);

const SHARED_BUILD_DIR = '/opt/pbkat/shared-build-cache';
const execAsync = promisify(exec);

// ── HLS Worker Pool ──────────────────────────────────────────────────
const POOL_SIZE = 10;
const workerPool = [];  // Array of { id, workspacePath, hlsProcess, cachedInitializeResult }

async function spawnWorker() {
    const id = crypto.randomUUID();
    const workspacePath = await createIsolatedWorkspace(id);

    const hlsProcess = createServerProcess(
        'Haskell', 'haskell-language-server-wrapper', ['--lsp'],
        { cwd: workspacePath }
    );

    const worker = { id, workspacePath, hlsProcess, cachedInitializeResult: null, clientWriter: null };

    // Single listener for the lifetime of this HLS process.
    // During pre-warming: respond to HLS requests with stubs so it doesn't hang.
    // After a client connects: forward everything to the client's writer.
    hlsProcess.reader.listen((msg) => {
        // Cache the initialize result (has capabilities)
        if (msg.id !== undefined && msg.result && worker.cachedInitializeResult === null && msg.result.capabilities) {
            worker.cachedInitializeResult = msg;
        }

        // If a client is connected, forward all messages to them
        if (worker.clientWriter) {
            worker.clientWriter.write(msg);
            return;
        }

        // Pre-warming phase: HLS sends requests (with id + method) that need responses
        // e.g. window/workDoneProgress/create, client/registerCapability
        if (msg.id !== undefined && msg.method) {
            hlsProcess.writer.write({
                jsonrpc: '2.0',
                id: msg.id,
                result: null
            });
        }
    });

    hlsProcess.onExit?.(() => {
        console.log(`Pool worker ${id} HLS exited.`);
        const idx = workerPool.indexOf(worker);
        if (idx !== -1) workerPool.splice(idx, 1);
    });

    return worker;
}

function replenishPool() {
    const needed = POOL_SIZE - workerPool.length;
    for (let i = 0; i < needed; i++) {
        spawnWorker().then(worker => {
            workerPool.push(worker);
            console.log(`Pool: ${workerPool.length}/${POOL_SIZE} workers ready`);
        }).catch(err => {
            console.error('Failed to spawn pool worker:', err);
        });
    }
}
// ─────────────────────────────────────────────────────────────────────

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
    console.log("COMMAND RECEIVED IS : " + req.body.command)
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

        const execOpts = { cwd: workspacePath, maxBuffer: 1024 * 1024 * 10 };
        let stdout = '';
        let stderr = '';

        try {
            if (command === 'probability') {
                // "probability" is not a standalone mode: PBKAT computes it by reading
                // the convex-set JSON produced by a prior "--json run" invocation from
                // stdin. These two cabal invocations MUST run one after the other, not
                // concurrently (e.g. via a shell pipe) - running two "cabal run"
                // processes at once against the same SHARED_BUILD_DIR races on writing
                // the package registration file (ghc-pkg: cannot create ... already
                // exists) and reliably breaks the build.
                const runResult = await execAsync(
                    `cabal run playground --builddir=${SHARED_BUILD_DIR} -- --json run`,
                    execOpts
                );
                stderr += runResult.stderr;

                // cabal prints its build log (Resolving dependencies..., Building
                // executable..., etc.) to STDOUT when it needs to (re)build, with the
                // program's real output appended as the last line(s). Scan from the end
                // for the line that's actually valid JSON rather than assuming stdout
                // is JSON from the first character.
                const candidateLines = runResult.stdout.split('\n').map(l => l.trim()).filter(Boolean);
                let jsonLine = null;
                for (let i = candidateLines.length - 1; i >= 0; i--) {
                    try {
                        JSON.parse(candidateLines[i]);
                        jsonLine = candidateLines[i];
                        break;
                    } catch {
                        // not the JSON line (probably cabal build-log noise), keep scanning
                    }
                }

                if (jsonLine === null) {
                    return res.status(500).json({
                        error: '"--json run" did not produce a parseable JSON line; cannot feed it into "probability". See "debug" for the raw output.',
                        stderr,
                        debug: runResult.stdout.slice(0, 4000),
                    });
                }

                // Persist just the JSON line and feed it in as stdin for step 2, once
                // step 1 (and its build) has fully completed.
                const jsonPath = path.join(workspacePath, 'run-output.json');
                await fs.writeFile(jsonPath, jsonLine, 'utf-8');

                const probResult = await execAsync(
                    `cabal run playground --builddir=${SHARED_BUILD_DIR} -- probability < ${jsonPath}`,
                    execOpts
                );
                stderr += probResult.stderr;
                stdout = probResult.stdout;
            } else {
                const result = await execAsync(
                    `cabal run playground --builddir=${SHARED_BUILD_DIR} -- ${command}`,
                    execOpts
                );
                stdout = result.stdout;
                stderr = result.stderr;
            }
        } catch (error) {
            return res.status(500).json({ error: error.message, stderr: error.stderr ?? stderr });
        } finally {
            await fs.rm(workspacePath, { recursive: true, force: true }).catch((cleanupErr) => {
                console.error(`Failed to clean up workspace ${workspacePath}:`, cleanupErr);
            });
        }

        let msg = stdout.trim();

        // Only "run" / "execution-trace" output uses the ⦅...⦆ convex-set notation.
        // "probability" output is a bare rational (p(Goal)); cabal may still prefix it
        // with build-log noise on stdout, so take the last non-empty line as the answer
        // rather than slicing on "⦅" (indexOf returns -1 -> slice(-1) keeps just 1 char).
        if (command !== 'probability') {
            const diamondIndex = msg.indexOf("⦅");
            if (diamondIndex !== -1) {
                msg = msg.slice(diamondIndex, msg.length);
            }
        } else {
            const lines = msg.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length) {
                msg = lines[lines.length - 1];
            }
        }

        return res.json({ output: msg, stats: stderr.trim() });

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
    console.log("New client connected. Assigning worker...");

    let worker = workerPool.shift();
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

    if (worker) {
        // Use pre-warmed worker from pool
        console.log(`Assigned pool worker ${worker.id} (pool: ${workerPool.length}/${POOL_SIZE})`);
        workspacePath = worker.workspacePath;
        hlsProcess = worker.hlsProcess;
        cachedInitializeResult = worker.cachedInitializeResult;

        // Redirect the existing listener to pipe messages to this client
        // (no second hlsProcess.reader.listen — the one from spawnWorker handles it)
        worker.clientWriter = writer;

        hlsProcess.onExit?.(() => {
            console.log(`HLS Process for connection ${worker.id} exited.`);
            hlsProcess = null;
            cachedInitializeResult = null;
            activeDocUri = null;
        });

        // Replenish pool in background
        replenishPool();
    } else {
        // Fallback: no workers available, spawn inline (slow path)
        console.warn("Pool exhausted! Spawning HLS inline (slow path)...");
        const connectionId = crypto.randomUUID();

        try {
            workspacePath = await createIsolatedWorkspace(connectionId);

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

        // Also try to replenish pool
        replenishPool();
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
        const id = worker?.id ?? 'inline';
        console.log(`Client ${id} disconnected. Cleaning up...`);

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
    console.log(`Pre-warming ${POOL_SIZE} HLS workers...`);
    replenishPool();
});

// Graceful shutdown: dispose all pooled workers
async function shutdownPool() {
    console.log(`Shutting down ${workerPool.length} pooled workers...`);
    const workers = workerPool.splice(0);
    await Promise.allSettled(workers.map(async (w) => {
        try { w.hlsProcess.dispose(); } catch {}
        try { await fs.rm(w.workspacePath, { recursive: true, force: true }); } catch {}
    }));
}

process.on('SIGTERM', async () => { await shutdownPool(); process.exit(0); });
process.on('SIGINT', async () => { await shutdownPool(); process.exit(0); });