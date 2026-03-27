import { Component } from '@geajs/core'
import Badge from '@geajs/ui/badge'
import Button from '@geajs/ui/button'
import { Card, CardContent } from '@geajs/ui/card'
import RatingGroup from '@geajs/ui/rating-group'
import { ToastStore } from '@geajs/ui/toast'
import store from './store'
import type { Product } from './store'

export default class ProductCard extends Component {
  declare props: { product: Product }

  template({ product }: { product: Product }) {
    const inCart = store.cart.some((i) => i.productId === product.id)

    return (
      <Card class={`product-card ${!product.inStock ? 'out-of-stock' : ''}`} data-product-id={product.id}>
        <div class="product-image">
          <div class="product-image-placeholder">{product.name[0]}</div>
          {product.badge && (
            <Badge
              class="product-badge"
              variant={
                product.badge === 'Out of Stock' ? 'destructive' : product.badge === 'New' ? 'default' : 'secondary'
              }
            >
              {product.badge}
            </Badge>
          )}
        </div>
        <CardContent class="product-info">
          <p class="product-category">{product.category}</p>
          <h3 class="product-name">{product.name}</h3>
          <RatingGroup count={5} defaultValue={product.rating} readOnly />
          <div class="product-footer">
            <span class="product-price">${product.price.toFixed(2)}</span>
            <Button
              size="sm"
              variant={inCart ? 'secondary' : 'default'}
              disabled={!product.inStock}
              click={() => {
                store.addToCart(product.id)
                ToastStore.success({ title: 'Added to cart', description: `${product.name} added.` })
              }}
              data-product-id={product.id}
            >
              {inCart ? 'In Cart' : 'Add to Cart'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
}
