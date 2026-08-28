import {expect, test} from '../../../fixtures/test-base';
import {setupAndClearWorkspace} from "../../../helpers/workspace";

test.beforeEach(async ({ page }) => {
    await setupAndClearWorkspace(page);

    await test.step('Act: Delete existing', async () => {
        await page.getByRole('button', {name: 'Delete everything'}).click();
        await expect(page.locator('.customNode')).toHaveCount(0);

    });
});

test('User adds nodes, moves them, and connects edges', async ({page}) => {

    await test.step('Act: Delete existing, add Node 1, and move it from center', async () => {
        // Add Node 1
        await page.getByRole('button', {name: 'Add new node'}).click();
        const node1 = page.locator('.customNode').filter({hasText: 'Node 1'});
        await expect(node1).toBeVisible();

        const box = await node1.boundingBox();
        if (!box) throw new Error('Node 1 bounding box not found');

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX - 300, centerY - 150, {steps: 10});
        await page.mouse.up();
    });

    await test.step('Act: Add Node 2 and connect them', async () => {
        await page.getByRole('button', {name: 'Add new node'}).click();

        const node2 = page.locator('.customNode').filter({hasText: 'Node 2'});
        await expect(node2).toBeVisible();

        await expect(page.locator('.customNode')).toHaveCount(2);

        // Re-locate Node 1 (in case the DOM updated)
        const node1 = page.locator('.customNode').filter({hasText: 'Node 1'});

        const node1SourceHandle = node1.locator('[data-handlepos="right"]');
        const node2TargetHandle = node2.locator('[data-handlepos="left"]');

        // Drag from Node 1's handle to Node 2's handle
        await node1SourceHandle.dragTo(node2TargetHandle);

        // Verify the connection edge was successfully created
        await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    });

    await test.step("Act Modify node values in dialog", async () => {
        await page.locator('.customNode').filter({hasText: 'Node 1'}).dblclick();

        // 2. Scope locators strictly to the dialog
        const dialog = page.getByRole('dialog', {name: 'Node Properties'});
        await expect(dialog).toBeVisible();

        // 3. Target inputs by their associated <label> text and fill new values
        await dialog.getByLabel('Label').fill('Renamed Node');

        // Fill numbers (Playwright automatically clears the existing value when using .fill)
        await dialog.getByLabel('Coherence Time').fill('250');
        await dialog.getByLabel('Swap Probability').fill('0.75');

        // 4. Verify the inputs actually hold the new values
        await expect(dialog.getByLabel('Label')).toHaveValue('Renamed Node');
        await expect(dialog.getByLabel('Coherence Time')).toHaveValue('250');
        await expect(dialog.getByLabel('Swap Probability')).toHaveValue('0.75');

        // 5. Close the dialog
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();

        // 6. Verify the canvas updated to reflect the new label
        const renamedNode = page.locator('.customNode').filter({hasText: 'Renamed Node'});
        await expect(renamedNode).toBeVisible();
    });

    await test.step("Act Modify Edge values in dialog", async () => {
        await page.locator('#edge-label').dblclick();

        // 2. Scope locators strictly to the dialog
        const dialog = page.getByRole('dialog', {name: 'Edge Properties'});
        await expect(dialog).toBeVisible();

        // 3. Target inputs by their associated <label> text and fill new values
        await dialog.getByLabel('Distance').fill('200');

        // Fill numbers (Playwright automatically clears the existing value when using .fill)
        await dialog.getByLabel('Generate Quality').fill('5');
        await expect(dialog.getByLabel('Generate Quality')).toHaveValue('1');
        await dialog.getByLabel('Generate Quality').fill('0.9');
        await dialog.getByLabel('Generate Probability').fill('0.75');

        // 4. Verify the inputs actually hold the new values
        await expect(dialog.getByLabel('Distance')).toHaveValue('200');
        await expect(dialog.getByLabel('Generate Quality')).toHaveValue('0.9');
        await expect(dialog.getByLabel('Generate Probability')).toHaveValue('0.75');

        // 5. Close the dialog
        await dialog.getByRole('button', {name: 'Close'}).click();
        await expect(dialog).not.toBeVisible();

        // 6. Verify the canvas updated to reflect the new label
        const edge = page.locator('#edge-label')
        await expect(edge).toContainText('200');
    });
});

test('User can generate a layout using Auto-create', async ({page}) => {

    await test.step("Click Auto Create and check Result", async () => {
        await page.getByRole('button', {name: "Auto-create"}).click()
        await expect(page.locator('.customNode')).toHaveCount(3);
        await expect(page.locator('#edge-label')).toHaveCount(2);
    })
})