import Benchmark from './benchmark.js'
import store from './store.ts'

const app = new Benchmark()
app.render(document.getElementById('main'))

// Expose internals for profiling
window.__geaStore = store
window.__geaComponent = app
window.__geaRealStore = store.__store || store
