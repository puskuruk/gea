import { Store } from '@geajs/core'

interface ConfigOption {
  id: string
  name: string
  description: string
  price: number
  color?: string
}

interface Category {
  id: string
  name: string
  icon: string
  options: ConfigOption[]
}

const CATEGORIES: Category[] = [
  {
    id: 'color',
    name: 'Exterior Color',
    icon: '🎨',
    options: [
      {
        id: 'glacier-white',
        name: 'Glacier White',
        price: 0,
        color: '#e8e8e8',
        description: 'Pure arctic white with pearl finish',
      },
      {
        id: 'obsidian-black',
        name: 'Obsidian Black',
        price: 800,
        color: '#1a1a1a',
        description: 'Deep metallic black',
      },
      {
        id: 'midnight-blue',
        name: 'Midnight Blue',
        price: 800,
        color: '#1e3a5f',
        description: 'Deep ocean blue metallic',
      },
      {
        id: 'crimson-red',
        name: 'Crimson Red',
        price: 1200,
        color: '#8b1a1a',
        description: 'Multi-coat crimson with depth',
      },
      {
        id: 'racing-green',
        name: 'Racing Green',
        price: 1200,
        color: '#2d5a3d',
        description: 'British racing green heritage',
      },
      { id: 'lunar-silver', name: 'Lunar Silver', price: 800, color: '#a8a8a8', description: 'Liquid silver metallic' },
      {
        id: 'sunrise-gold',
        name: 'Sunrise Gold',
        price: 2500,
        color: '#b8860b',
        description: 'Exclusive three-stage gold',
      },
    ],
  },
  {
    id: 'interior',
    name: 'Interior',
    icon: '🪑',
    options: [
      {
        id: 'charcoal-fabric',
        name: 'Charcoal Fabric',
        price: 0,
        color: '#3a3a3a',
        description: 'Premium recycled textile',
      },
      {
        id: 'ivory-leather',
        name: 'Ivory Leather',
        price: 2200,
        color: '#f5f0e8',
        description: 'Full-grain Nappa leather',
      },
      {
        id: 'cognac-leather',
        name: 'Cognac Leather',
        price: 2200,
        color: '#8b4513',
        description: 'Rich tan full-grain leather',
      },
      {
        id: 'black-nappa',
        name: 'Black Nappa Leather',
        price: 3500,
        color: '#111111',
        description: 'Quilted Nappa with contrast stitching',
      },
      {
        id: 'alcantara-sport',
        name: 'Alcantara Sport',
        price: 2800,
        color: '#4a4a4a',
        description: 'Lightweight suede-like microfiber',
      },
      {
        id: 'vegan-micro',
        name: 'Vegan Microfiber',
        price: 1800,
        color: '#5c4033',
        description: 'Sustainable luxury alternative',
      },
    ],
  },
  {
    id: 'wheels',
    name: 'Wheels',
    icon: '⚙️',
    options: [
      { id: '19-aero', name: '19″ Aero', price: 0, description: 'Optimized for range and efficiency' },
      { id: '20-sport', name: '20″ Sport', price: 1200, description: 'Five-spoke forged alloy' },
      { id: '20-turbine', name: '20″ Turbine', price: 1800, description: 'Swept turbine blade pattern' },
      { id: '21-perf', name: '21″ Performance', price: 2400, description: 'Lightweight forged alloy' },
      { id: '21-carbon', name: '21″ Carbon Fiber', price: 3200, description: 'Carbon composite construction' },
    ],
  },
  {
    id: 'powertrain',
    name: 'Powertrain',
    icon: '⚡',
    options: [
      { id: 'single-rwd', name: 'Single Motor RWD', price: 0, description: '280 hp · 0–60 in 5.4 s · 340 mi range' },
      { id: 'dual-awd', name: 'Dual Motor AWD', price: 6000, description: '420 hp · 0–60 in 4.2 s · 310 mi range' },
      { id: 'perf-awd', name: 'Performance AWD', price: 12000, description: '560 hp · 0–60 in 3.1 s · 290 mi range' },
      {
        id: 'track-awd',
        name: 'Track Edition AWD',
        price: 18000,
        description: '680 hp · 0–60 in 2.6 s · 270 mi range',
      },
    ],
  },
  {
    id: 'sound',
    name: 'Sound System',
    icon: '🔊',
    options: [
      { id: 'standard-8', name: 'Standard', price: 0, description: '8 speakers · 200 W output' },
      { id: 'premium-12', name: 'Premium', price: 1400, description: '12 speakers · 450 W output' },
      { id: 'hk-16', name: 'Harman Kardon', price: 2800, description: '16 speakers · 900 W surround' },
      { id: 'bo-21', name: 'Bang & Olufsen', price: 4200, description: '21 speakers · 1,500 W immersive' },
    ],
  },
  {
    id: 'roof',
    name: 'Roof',
    icon: '☁️',
    options: [
      { id: 'steel', name: 'Steel Roof', price: 0, description: 'Body-color painted steel' },
      { id: 'pano-glass', name: 'Panoramic Glass', price: 1600, description: 'UV-filtering tinted glass panel' },
      {
        id: 'electro-glass',
        name: 'Electrochromic Glass',
        price: 2800,
        description: 'Adjustable tint at the touch of a button',
      },
      { id: 'carbon-roof', name: 'Carbon Fiber', price: 3800, description: 'Exposed weave, track-ready lightness' },
    ],
  },
  {
    id: 'assist',
    name: 'Driver Assistance',
    icon: '🛡️',
    options: [
      {
        id: 'standard-safety',
        name: 'Standard Safety',
        price: 0,
        description: 'AEB, lane-keep, blind-spot monitoring',
      },
      {
        id: 'enhanced-pilot',
        name: 'Enhanced Autopilot',
        price: 3500,
        description: 'Highway auto-steer, auto lane change, smart summon',
      },
      {
        id: 'full-self',
        name: 'Full Self-Driving',
        price: 8500,
        description: 'City navigation, auto parking, traffic light control',
      },
    ],
  },
  {
    id: 'lighting',
    name: 'Lighting',
    icon: '💡',
    options: [
      { id: 'led-standard', name: 'LED Standard', price: 0, description: 'Full LED headlights and tail lights' },
      { id: 'matrix-led', name: 'Matrix LED', price: 1200, description: 'Adaptive high-beam with 84 individual LEDs' },
      {
        id: 'matrix-ambient',
        name: 'Matrix LED + Ambient',
        price: 2200,
        description: 'Matrix headlights plus 64-color interior ambient lighting',
      },
    ],
  },
]

class ConfiguratorStore extends Store {
  activeCategory = 'color'

  selections: Record<string, string> = {
    color: 'glacier-white',
    interior: 'charcoal-fabric',
    wheels: '19-aero',
    powertrain: 'single-rwd',
    sound: 'standard-8',
    roof: 'steel',
    assist: 'standard-safety',
    lighting: 'led-standard',
  }

  basePrice = 52000
  categories = CATEGORIES

  get currentCategory() {
    return CATEGORIES.find((c) => c.id === this.activeCategory) || CATEGORIES[0]
  }

  get totalPrice() {
    let total = this.basePrice
    for (const cat of CATEGORIES) {
      const opt = cat.options.find((o) => o.id === this.selections[cat.id])
      if (opt) total += opt.price
    }
    return total
  }

  get upgrades() {
    const result: Array<{ catId: string; catName: string; optName: string; price: number }> = []
    for (const cat of CATEGORIES) {
      const opt = cat.options.find((o) => o.id === this.selections[cat.id])
      if (opt && opt.price > 0) {
        result.push({ catId: cat.id, catName: cat.name, optName: opt.name, price: opt.price })
      }
    }
    return result
  }

  setCategory(id: string) {
    this.activeCategory = id
  }

  selectOption(categoryId: string, optionId: string) {
    this.selections[categoryId] = optionId
  }
}

export default new ConfiguratorStore()
