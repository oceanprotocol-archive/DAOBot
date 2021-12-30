const dotenv = require('dotenv')
dotenv.config()
const logger = require('pino')({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'hostname,pid'
    }
  }
})
const _get = (type, ...args) => {
  switch (type) {
    case 'log':
      logger.info(args.join(', '))
      break
    case 'error':
      logger.error(args.join(', '))
      break
    case 'warn':
      logger.warn(args.join(', '))
      break
    case 'debug':
      logger.debug(args.join(', '))
      break
    case 'trace':
      logger.trace(args.join(', '))
      break
    case 'info':
      logger.info(args.join(', '))
      break
    default:
      logger.info(args.join(', '))
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
