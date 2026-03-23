import { test, expect } from '@playwright/test'

test.describe('PWA Example', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Gea PWA Example')
  })

  test('shows online status', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#online-status')).toContainText('Online')
  })

  test('manifest is served', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest.name).toBe('Gea PWA Example')
    expect(manifest.short_name).toBe('GeaPWA')
    expect(manifest.theme_color).toBe('#3b82f6')
  })

  test('HTML includes manifest link', async ({ page }) => {
    await page.goto('/')
    const link = page.locator('link[rel="manifest"]')
    await expect(link).toHaveAttribute('href', '/manifest.webmanifest')
  })

  test('shows installed status', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#installed-status')).toContainText('Installed:')
  })

  test('page is functional even when SW registration fails in dev mode', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    await expect(page.locator('h1')).toHaveText('Gea PWA Example')
  })
})
