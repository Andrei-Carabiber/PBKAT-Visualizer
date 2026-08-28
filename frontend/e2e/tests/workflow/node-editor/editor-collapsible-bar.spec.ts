import { test, expect } from '../../../fixtures/test-base';
import {setupAndClearWorkspace} from "../../../helpers/workspace";

test.describe('Utility Bar Responsive Behavior', () => {
    test('Expanded view shows all action buttons directly', async ({ page }) => {

        //This already sets width to 1900
        await setupAndClearWorkspace(page)

        await page.goto('/');

        await expect(page.getByRole('button', { name: 'Add new node' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Auto-create' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Redo' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Fit View' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Delete Everything' })).toBeVisible();
        const settingsButton = page.getByRole('button', { name: 'Settings' });
        await settingsButton.click();

        // Assuming your SettingsDialog renders a standard accessible dialog
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText("Default Nodes & Edges Values")
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible()
    });

    test('Collapsed view hides actions inside a popover menu', async ({ page }) => {
        await setupAndClearWorkspace(page)
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/');

        await expect(page.getByRole('button', { name: 'Add new node' })).toBeVisible();

        await expect(page.getByRole('button', { name: 'Undo' })).not.toBeVisible();

        const moreButton = page.getByRole('button', { name: 'More actions' });
        await moreButton.click();

        // 5. Verify the popover content rendered and click 'Delete everything'
        const deleteButton = page.getByRole('button', { name: 'Delete everything' });
        await expect(deleteButton).toBeVisible();

        // Check destructive styling logic (optional, but good for confidence)
        await expect(deleteButton).toHaveClass(/text-destructive/);

        await deleteButton.click();

        // Verify popover closed after clicking an action (setPopoverOpen(false) logic)
        await expect(deleteButton).not.toBeVisible();
    });


});
