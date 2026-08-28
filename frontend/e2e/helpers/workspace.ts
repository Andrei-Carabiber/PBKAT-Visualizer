import { Page, expect } from '@playwright/test';

export async function setupAndClearWorkspace(page: Page) {
    await page.setViewportSize({width: 1900, height: 1200});
    await page.goto('/');

    await expect(page.getByTestId("loading-editor-spinner")).not.toBeVisible();
    await expect(page.getByRole('button', {name: 'Run'})).toBeVisible();
}