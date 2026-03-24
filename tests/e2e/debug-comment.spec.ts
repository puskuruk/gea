import { test, expect } from '@playwright/test'

test('debug comment push', async ({ page }) => {
  page.on('console', msg => {
    if (msg.text().includes('__observeList') || msg.text().includes('Error') || msg.text().includes('error')) {
      console.log('BROWSER:', msg.text())
    }
  })
  
  await page.goto('http://localhost:5295/project/board')
  await page.waitForLoadState('networkidle')
  
  await page.locator('.issue-card').first().click()
  await expect(page.locator('.issue-details')).toBeVisible({ timeout: 10000 })
  
  // Wait a moment for all observers to settle
  await page.waitForTimeout(500)
  
  const commentsBefore = await page.locator('.comment').count()
  console.log('Comments before:', commentsBefore)
  
  // Check if the container exists
  const containerInfo = await page.evaluate(() => {
    const containers = document.querySelectorAll('.issue-details-comments')
    return {
      count: containers.length,
      hasChildren: containers[0] ? containers[0].children.length : 0,
      innerHTML: containers[0] ? containers[0].innerHTML.substring(0, 200) : 'NOT FOUND'
    }
  })
  console.log('Container info:', JSON.stringify(containerInfo))
  
  await page.locator('.comment-create-fake').click()
  await expect(page.locator('.comment-create-form')).toBeVisible()
  
  await page.locator('.comment-create-form textarea').fill('Test comment from e2e')
  await page.locator('.comment-create-form button', { hasText: 'Save' }).click()
  
  // Wait for the push to propagate
  await page.waitForTimeout(1000)
  
  const commentsAfter = await page.locator('.comment').count()
  console.log('Comments after:', commentsAfter)
  
  // Check DOM state
  const domState = await page.evaluate(() => {
    const comments = document.querySelectorAll('.comment')
    const container = document.querySelector('.issue-details-comments')
    return {
      commentCount: comments.length,
      containerChildren: container ? container.children.length : 0,
      containerHTML: container ? container.innerHTML.substring(0, 500) : 'NOT FOUND'
    }
  })
  console.log('DOM state after save:', JSON.stringify(domState))
})
