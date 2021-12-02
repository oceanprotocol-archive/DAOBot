const dotenv = require('dotenv')
const logger = require('pino')({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
})
dotenv.config()
const _get = (type, ...args) => {
  switch (type) {
    case 'log':
      logger.info(...args)
      break
    case 'error':
      logger.error(...args)
      break
    case 'warn':
      logger.warn(...args)
      break
    case 'debug':
      logger.debug(...args)
      break
    case 'trace':
      logger.trace(...args)
      break
    case 'info':
      logger.info(...args)
      break
    default:
      logger.info(...args)
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
