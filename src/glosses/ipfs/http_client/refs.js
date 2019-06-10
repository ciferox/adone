'use strict'

const {
  promise: { promisify }
} = adone;

const streamToValue = require('./utils/stream-to-value')
const moduleConfig = require('./utils/module-config')

module.exports = (arg) => {
  const send = moduleConfig(arg)

  const refs = promisify((args, opts, callback) => {
    if (typeof (opts) === 'function') {
      callback = opts
      opts = {}
    }

    const request = {
      path: 'refs',
      args: args,
      qs: opts
    }

    send.andTransform(request, streamToValue, callback)
  })

  refs.local = promisify((opts, callback) => {
    if (typeof (opts) === 'function') {
      callback = opts
      opts = {}
    }

    const request = {
      path: 'refs/local',
      qs: opts
    }

    send.andTransform(request, streamToValue, callback)
  })

  return refs
}
