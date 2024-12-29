const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const Terser = require('terser')
const scrollAPIs = ['scroll', 'scrollTo', 'scrollyBy']
const rAFPath = path.resolve(__dirname, 'polyfills/requestAnimationFrame.js')

// 检查是否禁用了某个属性
const checkPropDisabled = (obj, prop) => {
  if (obj[prop] === undefined) {
    return false
  }
  return !Boolean(obj[prop])
}

class PolyfillInjectPlugin {
  fileName = ''
  keywords = []
  rawOptions = {}
  defaultOptions = {
    IntersectionObserver: 'intersection-observer',
    requestAnimationFrame: rAFPath
  }
  constructor(options) {
    for (const k of scrollAPIs) {
      this.defaultOptions[k] = 'smoothscroll-polyfill'
    }
    this.processOptions(options)
  }

  apply(compiler) {
    if (!this.keywords.length) {
      return
    }
    // https://webpack.js.org/api/compiler-hooks/
    compiler.hooks.emit.tapAsync(
      {
        name: this.constructor.name,
        stage: -1 // 在HtmlWebpackPlugin之前执行
      },
      async (compilation, callback) => {
        const matches = this.getMatchedKeywords(compilation.assets)
        if (!matches.length) {
          callback()
          return
        }
        const options = [...this.options.entries()].filter(([k]) =>
          matches.find(item => item.endsWith(k))
        )
        if (
          !checkPropDisabled(this.rawOptions, 'requestAnimationFrame') &&
          options.find(([name]) => scrollAPIs.includes(name))
        ) {
          options.unshift(['requestAnimationFrame', rAFPath])
        }
        try {
          const absolutePaths = [...new Set(options.map(([, p]) => p))]
          const list = await Promise.all(
            absolutePaths.map(value => {
              return new Promise((resolve, reject) => {
                const p = require.resolve(value)
                fs.readFile(p, (err, data) => {
                  err ? reject(err) : resolve(data.toString())
                })
              })
            })
          )
          const code = `(function(){${list.join(';\n')}})()`
          const minified = await Terser.minify(code)
          const hash = crypto
            .createHash('sha256')
            .update(minified.code)
            .digest('hex')
            .slice(0, 8)
          const fileName = (this.fileName = `js/polyfill.${hash}.js`)
          compilation.assets[fileName] = {
            source: () => minified.code,
            size: () => minified.code.length
          }
          // 订阅HtmlWebpackPlugin自定义的钩子
          compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tap(
            this.constructor.name,
            htmlPluginData => {
              const { js, publicPath } = htmlPluginData.assets
              // 在body中插入需要执行的js
              js.unshift(`${publicPath}${fileName}`)
              // 添加preload
              const chunks = compilation.chunks
              if (compiler.options.mode === 'development') {
                const entries = chunks.filter(chunk => chunk.hasRuntime())
                entries[0]?.files.push(fileName)
              } else {
                const vendors = chunks.find(
                  chunk => chunk.name === 'chunk-vendors'
                )
                vendors.files.push(fileName)
              }
            }
          )
          if (compilation.assetsInfo) {
            compilation.assetsInfo.set(fileName, {})
          }
        } catch (err) {
          callback(err)
        }
        callback()
      }
    )
  }
  /**
   * 处理参数
   *
   * @param {*} options
   * @memberof PolyfillInjectPlugin
   */
  processOptions(options) {
    if (typeof options !== 'object') {
      options = {}
    }
    this.rawOptions = options
    options = Object.assign({}, this.defaultOptions, options)
    for (const prop in options) {
      if (!options[prop]) {
        delete options[prop]
      }
    }
    this.options = new Map(Object.entries(options))
    this.keywords = [...this.options.keys()]
  }
  /**
   * 关键字检测
   *
   * @param {*} assets
   * @return {*} 
   * @memberof PolyfillInjectPlugin
   */
  getMatchedKeywords(assets) {
    const results = []
    for (const filename in assets) {
      if (!/\.js$/.test(filename)) {
        continue
      }
      const source = assets[filename].source()
      const m = this.findKeywordUsage(source)
      if (m) {
        results.push(...m)
      }
    }
    return results
  }
  /**
   * 代码匹配
   *
   * @param {*} code
   * @return {*} 
   * @memberof PolyfillInjectPlugin
   */
  findKeywordUsage(code) {
    const regexp = new RegExp(
      this.keywords.map(key => `((?<!\\.)\\b|window\\.)(${key})\\(`).join('|'),
      'gm'
    )
    const matches = code.match(regexp)
    if (matches) {
      return matches.map(m => m.trim().slice(0, -1))
    }
    return null
  }
}

module.exports = PolyfillInjectPlugin
