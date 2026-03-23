import { test, expect } from '@playwright/test'

test.describe('router-simple navigation and surgical DOM updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app')).toBeVisible()
    await expect(page.locator('.nav')).toBeVisible()
  })

  test('initial render shows Home view with correct nav links', async ({ page }) => {
    // Home view must be visible
    await expect(page.locator('.view h1')).toHaveText('Home')

    // Nav must have 5 links: Home, About, Alice, Bob, Charlie
    const links = page.locator('.nav a')
    await expect(links).toHaveCount(5)

    // Home link must have active class
    await expect(page.locator('.nav a.active')).toHaveCount(1)
    await expect(page.locator('.nav a.active')).toHaveText('Home')
  })

  test('clicking About link renders About view and updates active class', async ({ page }) => {
    // Navigate to About
    await page.locator('.nav a', { hasText: 'About' }).click()
    await expect(page.locator('.view h1')).toHaveText('About')

    // Active class must move to About link
    await expect(page.locator('.nav a.active')).toHaveText('About')

    // Nav must still have 5 links
    await expect(page.locator('.nav a')).toHaveCount(5)
  })

  test('clicking user link shows UserProfile with route params', async ({ page }) => {
    // Navigate to Alice's profile
    await page.locator('.nav a', { hasText: 'Alice' }).click()
    await expect(page.locator('.user-profile')).toBeVisible()
    await expect(page.locator('.user-profile h1')).toHaveText('Alice')
    await expect(page.locator('.role')).toHaveText('Engineer')
    await expect(page.locator('.avatar')).toHaveText('A')

    // Active class must be on Alice link
    await expect(page.locator('.nav a.active')).toHaveText('Alice')
  })

  test('switching between user profiles updates content without rebuilding nav', async ({ page }) => {
    // Navigate to Alice
    await page.locator('.nav a', { hasText: 'Alice' }).click()
    await expect(page.locator('.user-profile h1')).toHaveText('Alice')

    // Store reference to nav element
    await page.locator('.nav').evaluate((el) => {
      ;(window as any).__navRef = el
    })

    // Navigate to Bob
    await page.locator('.nav a', { hasText: 'Bob' }).click()
    await expect(page.locator('.user-profile h1')).toHaveText('Bob')
    await expect(page.locator('.role')).toHaveText('Designer')

    // Nav must be same DOM node
    const navSame = await page.locator('.nav').evaluate((el) => {
      return el === (window as any).__navRef
    })
    expect(navSame).toBe(true)

    // Navigate to Charlie
    await page.locator('.nav a', { hasText: 'Charlie' }).click()
    await expect(page.locator('.user-profile h1')).toHaveText('Charlie')
    await expect(page.locator('.role')).toHaveText('PM')
  })

  test('unknown route shows 404 NotFound page', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.locator('.not-found')).toBeVisible()
    await expect(page.locator('.not-found h1')).toHaveText('404')

    // Click "Go Home" link to navigate back
    await page.locator('.not-found a').click()
    await expect(page.locator('.view h1')).toHaveText('Home')
  })

  test('navigating between routes preserves nav structure', async ({ page }) => {
    // Navigate through multiple routes
    await page.locator('.nav a', { hasText: 'About' }).click()
    await expect(page.locator('.view h1')).toHaveText('About')

    await page.locator('.nav a', { hasText: 'Alice' }).click()
    await expect(page.locator('.user-profile h1')).toHaveText('Alice')

    await page.locator('.nav a', { hasText: 'Home' }).click()
    await expect(page.locator('.view h1')).toHaveText('Home')

    // Nav must still have exactly 5 links after all navigations
    await expect(page.locator('.nav a')).toHaveCount(5)

    // The app container must still exist (not duplicated)
    await expect(page.locator('.app')).toHaveCount(1)
  })

  test('Link components render as <a> tags, not native <link> tags', async ({ page }) => {
    // All navigation items must be <a> tags (Link compiles to anchor)
    const navChildren = page.locator('.nav a')
    await expect(navChildren).toHaveCount(5)

    // There must be no raw <link> elements inside the nav
    const linkElements = await page.locator('.nav link').count()
    expect(linkElements).toBe(0)

    // Each link must have a valid href
    for (let i = 0; i < 5; i++) {
      const href = await navChildren.nth(i).getAttribute('href')
      expect(href).toBeTruthy()
    }
  })

  test('router.isActive toggles active classes correctly for all routes including /', async ({ page }) => {
    // At /, Home link must be active (isActive uses segment-aware matching)
    await expect(page.locator('.nav a.active')).toHaveText('Home')

    // Navigate to /users/1 — Alice link must be active
    await page.locator('.nav a', { hasText: 'Alice' }).click()
    const activeLinks = page.locator('.nav a.active')
    await expect(activeLinks).toHaveCount(1)
    await expect(activeLinks.first()).toHaveText('Alice')

    // Home should not be active
    const homeClass = await page.locator('.nav a', { hasText: 'Home' }).getAttribute('class')
    expect(homeClass).not.toContain('active')
  })

  test('direct URL navigation renders the correct view', async ({ page }) => {
    // Navigate directly to /about
    await page.goto('/about')
    await expect(page.locator('.content h1')).toHaveText('About')
    await expect(page.locator('.nav a.active')).toHaveText('About')

    // Navigate directly to /users/2 (Bob)
    await page.goto('/users/2')
    await expect(page.locator('.user-profile h1')).toHaveText('Bob')
    await expect(page.locator('.nav a.active')).toHaveText('Bob')

    // Navigate directly to an unknown route
    await page.goto('/nope')
    await expect(page.locator('.not-found h1')).toHaveText('404')
  })

  test.describe('DOM Stability', () => {
    test('page container survives route navigation', async ({ page }) => {
      // Mark the page-level container
      const container = page.locator('.app')
      await expect(container).toBeVisible()
      await container.evaluate((el) => el.setAttribute('data-dom-stability-marker', 'original'))

      // Navigate to About
      await page.locator('.nav a', { hasText: 'About' }).click()
      await expect(page.locator('.view h1')).toHaveText('About')

      // The page container should survive (only the view content changes)
      const markerSurvived = await page.locator('[data-dom-stability-marker="original"]').count()
      expect(markerSurvived).toBe(1)
    })

    test('no data-gea-compiled-child-root attributes in the DOM', async ({ page }) => {
      const count = await page.locator('[data-gea-compiled-child-root]').count()
      expect(count).toBe(0)
    })
  })
})
