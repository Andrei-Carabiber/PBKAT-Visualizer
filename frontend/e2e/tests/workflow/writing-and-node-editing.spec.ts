import {test, expect} from '../../fixtures/test-base';

test('User writes Haskell code, adds nodes, and views compilation output', async ({ page }) => {

    await test.step('Arrange: Mock compile backend and load workspace', async () => {

        await page.goto('/');

        await expect(page.getByTestId("loading-editor-spinner")).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add new node' })).toBeVisible();
    });

    await test.step('Act: Input Haskell code and configure canvas', async () => {
        // Left Panel: Focus the Monaco/CodeMirror editor and type Haskell code
        const editor = page.locator('.monaco-editor').first();
        await editor.click();
        await page.keyboard.insertText('main = print "Calculated Value: 256"');

        const numberOfNodes = page.locator(".customNodeBody")
        const initialCount = await numberOfNodes.count();
        await page.getByRole('button', { name: 'Add new node' }).click();
        await expect(numberOfNodes).toHaveCount(initialCount + 1);

        // Trigger the backend execution
        await page.getByRole('button', { name: 'Run' }).click();
    });

    await test.step('Assert: Verify result panel is visible', async () => {
        const panel = page.locator('#result-display-window');
        await expect(panel).toBeVisible();
        await expect(panel).toContainText('Output');
        await expect(panel).toContainText('Save Results');
        await expect(panel).toContainText('Probability');
        await expect(panel).toContainText('Quality');
    });
});