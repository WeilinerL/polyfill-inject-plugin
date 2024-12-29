declare module 'polyfill-inject-plugin' {
  type keys = keyof (Window & typeof globalThis)
  type PolyfillInjectPluginOptions = Omit<{
    [key in keys]?: string
  }, 'toString' | 'valueOf'> & Record<string, string>

  export default class PolyfillInjectPlugin {
    constructor(options: PolyfillInjectPluginOptions)
  }
}
