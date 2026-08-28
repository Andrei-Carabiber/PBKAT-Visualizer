import { test as base, expect } from '@playwright/test';

export const test = base.extend({
    page: async ({ page }, use) => {

        // Intercept your specific Haskell Language Server WebSocket route
        await page.routeWebSocket('ws://localhost:3000/api/*', ws => {
            ws.onMessage(message => {
                const parsed = JSON.parse(message as string);

                // Unblock the frontend by simulating a successful HLS initialization
                if (parsed.method === 'initialize') {
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        id: parsed.id,
                        result: { capabilities: { hoverProvider: true } }
                    }));
                }
            });
        });

        // Pass the fully mocked page to your tests
        await use(page);
    },
});

export { expect };