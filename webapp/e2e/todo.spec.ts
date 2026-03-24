import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const e2eUserId = process.env.E2E_USER_ID ?? 'local-e2e-user';

test.beforeEach(async () => {
  await prisma.todoItem.deleteMany({
    where: { userId: e2eUserId },
  });
  await prisma.user.deleteMany({
    where: { id: e2eUserId },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('can create, complete, and delete a todo item', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Pending Tasks \(0\)/ })).toBeVisible();
  await expect(page.getByText('No pending tasks. Great job!')).toBeVisible();

  await page.getByTestId('open-create-todo').click();
  await page.getByTestId('todo-title-input').fill('Playwright smoke test');
  await page.getByTestId('todo-description-input').fill('Created from the local E2E suite.');
  await page.getByTestId('submit-create-todo').click();

  await expect(page.getByText('Playwright smoke test')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Pending Tasks \(1\)/ })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Toggle todo status for Playwright smoke test' }).check();
  await expect(page.getByRole('heading', { name: /Completed Tasks \(1\)/ })).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('todo-item').getByText('Delete').click();

  await expect(page.getByRole('heading', { name: /Completed Tasks \(0\)/ })).toBeVisible();
  await expect(page.getByTestId('todo-item')).toHaveCount(0);
});
