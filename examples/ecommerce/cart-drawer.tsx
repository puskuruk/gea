import { Component } from '@geajs/core'
import { Button, Separator } from '@geajs/ui'
import store from './store'

export default class CartDrawer extends Component {
  template() {
    return (
      <div class="cart-backdrop" click={store.closeCart}>
        <div class="cart-drawer" click={(e: Event) => e.stopPropagation()}>
          <div class="cart-header">
            <h2 class="cart-title">Cart ({store.cartCount})</h2>
            <button class="cart-close" click={store.closeCart} aria-label="Close cart">
              ✕
            </button>
          </div>
          <Separator />

          {store.cartItems.length === 0 ? (
            <div class="cart-empty">
              <p>Your cart is empty.</p>
              <Button variant="outline" size="sm" click={store.closeCart}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <div class="cart-items">
                {store.cartItems.map(({ product, quantity, productId }) => (
                  <div key={productId} class="cart-item" data-cart-item={productId}>
                    <div class="cart-item-image">{product.name[0]}</div>
                    <div class="cart-item-details">
                      <p class="cart-item-name">{product.name}</p>
                      <p class="cart-item-price">${(product.price * quantity).toFixed(2)}</p>
                    </div>
                    <div class="cart-item-qty">
                      <button class="qty-btn" click={() => store.updateQuantity(productId, -1)}>
                        −
                      </button>
                      <span class="qty-value">{quantity}</span>
                      <button class="qty-btn" click={() => store.updateQuantity(productId, 1)}>
                        +
                      </button>
                    </div>
                    <button class="cart-item-remove" click={() => store.removeFromCart(productId)} aria-label="Remove">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div class="cart-footer">
                <Separator />
                <div class="cart-total-row">
                  <span class="cart-total-label">Total</span>
                  <span class="cart-total-value">${store.cartTotal.toFixed(2)}</span>
                </div>
                <Button class="w-full" click={store.openCheckout}>
                  Checkout
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }
}
