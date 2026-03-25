import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { EcommerceStore } from '../../../../examples/ecommerce/store'

describe('examples/ecommerce EcommerceStore', () => {
  let s: EcommerceStore
  beforeEach(() => {
    s = new EcommerceStore()
  })

  it('filteredProducts category and rating and stock', () => {
    assert.equal(s.filteredProducts.length, 8)
    s.setCategory('Electronics')
    assert.ok(s.filteredProducts.every((p) => p.category === 'Electronics'))
    s.setCategory('All')
    s.setMinRating('5')
    assert.ok(s.filteredProducts.every((p) => p.rating >= 5))
    s.setMinRating('0')
    s.toggleInStock()
    assert.ok(s.filteredProducts.every((p) => p.inStock))
  })

  it('cartCount cartTotal add merge', () => {
    assert.equal(s.cartCount, 0)
    s.addToCart('p1')
    s.addToCart('p1')
    assert.equal(s.cartCount, 2)
    assert.ok(s.cartTotal > 0)
  })

  it('removeFromCart and updateQuantity', () => {
    s.addToCart('p1')
    s.updateQuantity('p1', 2)
    assert.equal(s.cart.find((i) => i.productId === 'p1')!.quantity, 3)
    s.updateQuantity('p1', -100)
    assert.equal(s.cart.find((i) => i.productId === 'p1')!.quantity, 1)
    s.removeFromCart('p1')
    assert.equal(s.cart.length, 0)
  })

  it('cartItems joins product', () => {
    s.addToCart('p1')
    assert.equal(s.cartItems.length, 1)
    assert.equal(s.cartItems[0].product.id, 'p1')
  })

  it('checkoutValid and placeOrder', () => {
    s.addToCart('p1')
    s.openCheckout()
    s.checkoutName = 'Alex'
    s.setCheckoutEmail({ target: { value: 'alex@example.com' } } as any)
    s.setCheckoutCard({ target: { value: '4242424242424242' } } as any)
    assert.equal(s.checkoutValid, true)
    s.placeOrder()
    assert.equal(s.checkoutDone, true)
    assert.equal(s.cart.length, 0)
  })

  it('format helpers on payment fields', () => {
    s.setCheckoutCard({ target: { value: '4242424242424242' } } as any)
    assert.match(s.checkoutCard, /4242/)
  })
})
