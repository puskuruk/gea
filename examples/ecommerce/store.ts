import { Store } from '@geajs/core'

export interface Product {
  id: string
  name: string
  price: number
  category: string
  rating: number
  inStock: boolean
  badge?: string
}

export interface CartItem {
  productId: string
  quantity: number
}

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Wireless Headphones',
    price: 89.99,
    category: 'Electronics',
    rating: 4,
    inStock: true,
    badge: 'Best Seller',
  },
  { id: 'p2', name: 'Mechanical Keyboard', price: 129.99, category: 'Electronics', rating: 5, inStock: true },
  {
    id: 'p3',
    name: 'USB-C Hub',
    price: 49.99,
    category: 'Electronics',
    rating: 4,
    inStock: false,
    badge: 'Out of Stock',
  },
  { id: 'p4', name: 'Standing Desk Mat', price: 39.99, category: 'Home Office', rating: 4, inStock: true },
  {
    id: 'p5',
    name: 'Monitor Light Bar',
    price: 59.99,
    category: 'Electronics',
    rating: 5,
    inStock: true,
    badge: 'New',
  },
  { id: 'p6', name: 'Ergonomic Chair', price: 349.99, category: 'Home Office', rating: 5, inStock: true },
  { id: 'p7', name: 'Webcam 4K', price: 99.99, category: 'Electronics', rating: 3, inStock: true },
  { id: 'p8', name: 'Cable Management Kit', price: 19.99, category: 'Home Office', rating: 4, inStock: true },
]

export const CATEGORIES = ['All', 'Electronics', 'Home Office']

export class EcommerceStore extends Store {
  products: Product[] = PRODUCTS
  cart: CartItem[] = []
  selectedCategory = 'All'
  minRating = 0
  inStockOnly = false
  cartOpen = false
  checkoutOpen = false
  checkoutDone = false

  // checkout form
  checkoutName = ''
  checkoutEmail = ''
  checkoutCard = ''

  get filteredProducts(): Product[] {
    return this.products.filter((p) => {
      if (this.selectedCategory !== 'All' && p.category !== this.selectedCategory) return false
      if (this.minRating > 0 && p.rating < this.minRating) return false
      if (this.inStockOnly && !p.inStock) return false
      return true
    })
  }

  get cartCount(): number {
    return this.cart.reduce((sum, i) => sum + i.quantity, 0)
  }

  get cartTotal(): number {
    return this.cart.reduce((sum, item) => {
      const p = this.products.find((p) => p.id === item.productId)
      return sum + (p ? p.price * item.quantity : 0)
    }, 0)
  }

  get cartItems(): (CartItem & { product: Product })[] {
    return this.cart
      .map((item) => {
        const product = this.products.find((p) => p.id === item.productId)
        return product ? { ...item, product } : null
      })
      .filter(Boolean) as (CartItem & { product: Product })[]
  }

  get checkoutValid(): boolean {
    return (
      this.checkoutName.trim().length > 1 &&
      this.checkoutEmail.includes('@') &&
      this.checkoutCard.replace(/\s/g, '').length === 16
    )
  }

  setCategory(cat: string): void {
    this.selectedCategory = cat
  }

  setMinRating(value: string): void {
    this.minRating = Number(value)
  }

  toggleInStock(): void {
    this.inStockOnly = !this.inStockOnly
  }

  addToCart(productId: string): void {
    const existing = this.cart.find((i) => i.productId === productId)
    if (existing) {
      existing.quantity++
    } else {
      this.cart.push({ productId, quantity: 1 })
    }
  }

  removeFromCart(productId: string): void {
    const idx = this.cart.findIndex((i) => i.productId === productId)
    if (idx !== -1) this.cart.splice(idx, 1)
  }

  updateQuantity(productId: string, delta: number): void {
    const item = this.cart.find((i) => i.productId === productId)
    if (!item) return
    item.quantity = Math.max(1, item.quantity + delta)
  }

  openCart(): void {
    this.cartOpen = true
  }

  closeCart(): void {
    this.cartOpen = false
  }

  openCheckout(): void {
    this.cartOpen = false
    this.checkoutOpen = true
    this.checkoutDone = false
    this.checkoutName = ''
    this.checkoutEmail = ''
    this.checkoutCard = ''
  }

  closeCheckout(): void {
    this.checkoutOpen = false
  }

  setCheckoutName(e: { target: { value: string } }): void {
    this.checkoutName = e.target.value
  }

  setCheckoutEmail(e: { target: { value: string } }): void {
    this.checkoutEmail = e.target.value
  }

  setCheckoutCard(e: { target: { value: string } }): void {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
    this.checkoutCard = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
  }

  placeOrder(): void {
    if (!this.checkoutValid) return
    this.checkoutDone = true
    this.cart = []
  }
}

export default new EcommerceStore()
