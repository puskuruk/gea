import { Component } from '@geajs/core'
import { Button, Input, Label } from '@geajs/ui'
import store from './store'

export default class CheckoutDialog extends Component {
  template() {
    if (store.checkoutDone) {
      return (
        <div class="modal-backdrop" click={store.closeCheckout}>
          <div class="modal-box checkout-success" click={(e: Event) => e.stopPropagation()}>
            <div class="success-icon">✓</div>
            <h3 class="modal-title">Order Placed!</h3>
            <p class="modal-desc">Thank you for your purchase. Your order will arrive in 3–5 business days.</p>
            <Button click={store.closeCheckout}>Continue Shopping</Button>
          </div>
        </div>
      )
    }

    return (
      <div class="modal-backdrop" click={store.closeCheckout}>
        <div class="modal-box" click={(e: Event) => e.stopPropagation()}>
          <h3 class="modal-title">Checkout</h3>
          <p class="modal-desc">
            Order total: <strong>${store.cartTotal.toFixed(2)}</strong>
          </p>

          <div class="form-field">
            <Label htmlFor="co-name">Full Name</Label>
            <Input
              inputId="co-name"
              placeholder="Jane Smith"
              value={store.checkoutName}
              onInput={store.setCheckoutName}
            />
          </div>
          <div class="form-field">
            <Label htmlFor="co-email">Email</Label>
            <Input
              inputId="co-email"
              type="email"
              placeholder="jane@example.com"
              value={store.checkoutEmail}
              onInput={store.setCheckoutEmail}
            />
          </div>
          <div class="form-field">
            <Label htmlFor="co-card">Card Number</Label>
            <Input
              inputId="co-card"
              placeholder="1234 5678 9012 3456"
              value={store.checkoutCard}
              onInput={store.setCheckoutCard}
            />
          </div>

          <div class="modal-actions">
            <Button variant="outline" click={store.closeCheckout}>
              Cancel
            </Button>
            <Button disabled={!store.checkoutValid} click={store.placeOrder}>
              Place Order
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
