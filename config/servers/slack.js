'use strict'

exports['default'] = {
  servers: {
    slack: function (api) {
      return {
        enabled: true,
        // slack bot RTM client token
        token: 'xoxb-000000000-XXXXXXXXXXXX',
        // slack bot RTM client options
        options: {

          // @param {Object} opts.dataStore A store to cache Slack info, e.g. channels, users etc. in.
          // dataStore: null,

          // @param {Boolean} opts.autoReconnect Whether or not to automatically reconnect when the connection closes. Defaults to true
          // autoReconnect: true,

          // @param {Boolean} opts.useRtmConnect  True to use rtm.connect rather than rtm.start
          // useRtmConnect: true,

          // @param {Object} opts.retryConfig The retry policy to use, defaults to forever with exponential backoff {@see https://github.com/SEAPUNK/node-retry}
          // retryConfig: null,

          // @param {Number} opts.wsPingInterval The time to wait between pings with the server
          // wsPingInterval: 10000,

          // @param {Number} opts.maxPongInterval The max time (in ms) to wait for a pong before reconnecting
          // maxPongInterval: 10000,

          // @param {String} opts.logLevel The log level for the logger
          logLevel: 'info',

          // @param {Function} opts.logger Function to use for log calls, takes (logLevel, logString)
          logger: (logLevel, logString) => {
            return api.log && api.log('slack: ' + logString, logLevel)
          }

        },
        // Delimiter string for incoming messages
        delimiter: '\n'
      }
    }
  }
}
