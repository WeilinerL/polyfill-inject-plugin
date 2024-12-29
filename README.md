# polyfill-inject-plugin

按需注入polyfill，如果在构建后的代码中检测到了预设的api（IntersectionObserver、scrollTo等），那么插件就会将对应的polyfill代码打包进输出代码里；反之，如果构建后的代码中不包含对应的api，则不会将与之对应的polyfill打进输出代码里。

## 使用方法

**此版本仅适用于webpack@^4.x**

### 1. 安装

```bash
npm install polyfill-inject-plugin -D
```

### 2. 配置

在项目根目录的`vue.config.js`文件中添加以下代码：

```js
const PolyfillInjectPlugin = require('polyfill-inject-plugin')

module.exports = {
  chainWebpack: (config) => {
    config
      .plugin('polyfill-inject-plugin')
      .use(PolyfillInjectPlugin)
  }
}
```

目前插件提供了`scroll, scrollTo, scrollBy, IntersectionObserver, requestAnimationFrame`等api的默认兜底polyfill，也可以针对别的api添加自定义polyfill：

参数一般格式为：
```js
{
  '全局api的名称': 'npm包或polyfill文件的绝对路径'
}
```

如：

```js
.use(PolyfillInjectPlugin, [{
  // npm包或polyfill文件的绝对路径
  IntersectionObserver: 'intersection-observer'
}])
```

如果你的项目里已经有了对应的polyfill，也可以显式过滤已有规则：

```js
.use(PolyfillInjectPlugin, [{
  // npm包或polyfill文件的绝对路径
  IntersectionObserver: false,
  requestAnimationFrame: false
}])
```

这样即使代码里使用到了这些默认的`api`，也不会生成对应的polyfill，从而减小代码体积。

**注意：引入的代码需要为构建后的`IIFE`代码，插件仅注入特定代码，不提供构建**
