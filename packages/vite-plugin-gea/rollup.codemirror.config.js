import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/codemirror-bundle.js',
  output: {
    file: '../../website/playground/codemirror-bundle.js',
    format: 'es',
    inlineDynamicImports: true,
  },
  plugins: [nodeResolve({ browser: true }), commonjs()],
}
