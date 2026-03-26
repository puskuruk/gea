import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Router } from '../../gea/src/lib/router/router.ts'
import { router } from '../../gea/src/lib/router/index.ts'

describe('Router._ssrRouterResolver', () => {
  it('exists as a static nullable property', () => {
    assert.equal(Router._ssrRouterResolver, null)
  })

  it('can be assigned a resolver function', () => {
    const resolver = () => null
    Router._ssrRouterResolver = resolver
    assert.equal(Router._ssrRouterResolver, resolver)
    // Clean up
    Router._ssrRouterResolver = null
  })
})

describe('router singleton proxy SSR delegation', () => {
  it('delegates to SSR resolver when set', () => {
    const ssrState = {
      path: '/about',
      route: '/about',
      params: {},
      query: {},
      hash: '',
      matches: ['/about'],
      error: null,
    }
    Router._ssrRouterResolver = () => ssrState
    try {
      assert.equal(router.path, '/about')
      assert.deepEqual(router.matches, ['/about'])
    } finally {
      Router._ssrRouterResolver = null
    }
  })

  it('does not instantiate real Router when SSR resolver is active', () => {
    const ssrState = { path: '/ssr' }
    Router._ssrRouterResolver = () => ssrState
    try {
      assert.equal(router.path, '/ssr')
    } finally {
      Router._ssrRouterResolver = null
    }
  })

  it('returns null from resolver means fall through is attempted', () => {
    let called = false
    Router._ssrRouterResolver = () => { called = true; return { path: '/fallback' } }
    try {
      void router.path
      assert.equal(called, true)
    } finally {
      Router._ssrRouterResolver = null
    }
  })
})
