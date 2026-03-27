import '@geajs/core/jsx-runtime'

declare module '@geajs/core/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}
