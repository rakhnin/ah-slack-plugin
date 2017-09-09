'use strict'

const cliParser = require('minimist-string')

module.exports = {
  startPriority: 900,
  stopPriority: 100,
  loadPriority: 599,
  initialize: function (api, next) {
    api.cli = {}
    // process command line
    api.cli.processLine = function (connection, line) {
      if (connection.params.action === undefined || api.actions.actions[connection.params.action] === undefined) {
        const args = cliParser(line)
        connection.params.action = args._.join(' ')
        delete args._
        for (let key in args) {
          connection.params[key] = args[key]
        }
      }
    }
    return next()
  },
  start: function (api, next) {
    return next()
  },
  stop: function (api, next) {
    return next()
  }
}
