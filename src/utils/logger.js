const dotenv = require('dotenv')
dotenv.config()
const _get = (type, ...args) => {
  if (process.env.GACTIONS_ENV) return
  switch (type) {
    case 'log':
      console.log(...args)
      break
    case 'error':
      console.error(...args)
      break
    case 'warn':
      console.warn(...args)
      break
    case 'info':
      console.info(...args)
      break
    case 'debug':
      console.debug(...args)
      break
    case 'trace':
      console.trace(...args)
      break
    default:
      console.log(...args)
      break
  }
}
const Logger = {
  log: (...args) => {
    _get('log', ...args)
  },

  error: (...args) => {
    _get('error', ...args)
  },

  warn: (...args) => {
    _get('warn', ...args)
  },

  info: (...args) => {
    _get('info', ...args)
  },

  debug: (...args) => {
    _get('debug', ...args)
  },

  trace: (...args) => {
    _get('trace', ...args)
  }
}
module.exports = Logger
