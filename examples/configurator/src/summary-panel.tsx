import { Component } from '@geajs/core'
import store from './configurator-store'

export default class SummaryPanel extends Component {
  template() {
    const { basePrice, totalPrice, upgrades } = store

    return (
      <aside class="summary">
        <h3 class="summary-title">Build Summary</h3>

        <div class="summary-car">
          <span class="summary-car-name">Meridian GT-e</span>
          <span class="summary-car-price">{`$${basePrice.toLocaleString()}`}</span>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-options">
          {upgrades.map((u) => (
            <div key={u.catId} class="summary-line">
              <div class="summary-line-info">
                <span class="summary-line-cat">{u.catName}</span>
                <span class="summary-line-opt">{u.optName}</span>
              </div>
              <span class="summary-line-price">{`+$${u.price.toLocaleString()}`}</span>
            </div>
          ))}
        </div>

        {upgrades.length === 0 && <p class="summary-empty">Base configuration — no extras selected</p>}

        <div class="summary-divider"></div>

        <div class="summary-total">
          <span class="summary-total-label">Estimated Total</span>
          <span class="summary-total-price">{`$${totalPrice.toLocaleString()}`}</span>
        </div>

        <button class="summary-cta">Complete Your Order</button>
      </aside>
    )
  }
}
