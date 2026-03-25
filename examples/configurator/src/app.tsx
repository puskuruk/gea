import { Component } from '@geajs/core'
import store from './configurator-store'
import OptionCard from './option-card'
import SummaryPanel from './summary-panel'

export default class App extends Component {
  template() {
    const { activeCategory, categories, selections, currentCategory, totalPrice } = store

    return (
      <div class="configurator">
        <header class="hero">
          <p class="hero-brand">MERIDIAN</p>
          <h1 class="hero-title">GT-e</h1>
          <p class="hero-tagline">Configure your electric grand tourer</p>
          <p class="hero-price">{`Starting at $${store.basePrice.toLocaleString()}`}</p>
        </header>

        <nav class="category-nav">
          {categories.map((cat) => (
            <button
              key={cat.id}
              class={`cat-tab ${activeCategory === cat.id ? 'cat-tab--active' : ''}`}
              click={() => store.setCategory(cat.id)}
            >
              <span class="cat-icon">{cat.icon}</span>
              <span class="cat-label">{cat.name}</span>
            </button>
          ))}
        </nav>

        <div class="config-body">
          <section class="options-section">
            <h2 class="options-heading">{currentCategory.name}</h2>
            <p class="options-sub">Select one option below</p>
            <div class="options-grid">
              {currentCategory.options.map((opt) => (
                <OptionCard
                  key={opt.id}
                  name={opt.name}
                  description={opt.description}
                  price={opt.price}
                  color={opt.color}
                  selected={opt.id === selections[activeCategory]}
                  onPick={() => store.selectOption(activeCategory, opt.id)}
                />
              ))}
            </div>
          </section>

          <SummaryPanel />
        </div>

        <footer class="configurator-footer">
          <p class="footer-total">
            <span class="footer-total-label">Your Meridian GT-e</span>
            <span class="footer-total-price">{`$${totalPrice.toLocaleString()}`}</span>
          </p>
        </footer>
      </div>
    )
  }
}
