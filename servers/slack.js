'use strict'

const RtmClient = require('@slack/client').RtmClient
const RTM_EVENTS = require('@slack/client').RTM_EVENTS
const RTM_MESSAGE_SUBTYPES = require('@slack/client').RTM_MESSAGE_SUBTYPES
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM

const initialize = function (api, options, next) {
  // ////////
  // INIT //
  // ////////

  const type = 'slack'

  const attributes = {
    canChat: false,
    logConnections: true,
    logExits: true,
    verbs: [
      // 'documentation',
      'paramAdd',
      'paramDelete',
      'paramView',
      'paramsView',
      'paramsDelete',
      // 'roomAdd',
      // 'roomLeave',
      // 'roomView',
      'detailsView'
      // 'say'
    ]
  }

  const server = new api.GenericServer(type, options, attributes)

  // ////////////////////
  // REQUIRED METHODS //
  // ////////////////////

  server.start = function (next) {
    server.server = new RtmClient(api.config.servers.slack.token, api.config.servers.slack.options)
    server.isStarted = false

    server.server.on(CLIENT_EVENTS.UNABLE_TO_RTM_START, (e) => {
      return next(new Error('Unable to connect to slack => ' + e.message))
    })

    server.server.on(CLIENT_EVENTS.AUTHENTICATED, (e) => {
      !server.isStarted && (server.isStarted = true) && next()
    })

    server.server.on(CLIENT_EVENTS.RAW_MESSAGE, (message) => {
      api.log('slack raw message', 'debug', message)
    })

    server.server.on(RTM_EVENTS.MESSAGE, handleMessage)

    server.server.start()
  }

  server.stop = function (next) {
    server.connections().forEach((connection) => {
      if (connection.pendingActions > 0) {
        server.sendMessage(connection, connection.localize('actionhero.serverShuttingDown'))
      }
      connection.destroy()
    })

    server.server && server.server.disconnect()
    server.isStarted = false
    next()
  }

  server.sendMessage = function (connection, message, messageCount) {
    if (message.error) {
      message.error = api.config.errors.serializers.servers.socket(message.error)
    }

    if (connection.respondingTo) {
      message.messageCount = messageCount
      connection.respondingTo = null
    } else if (message.context === 'response') {
      if (messageCount) {
        message.messageCount = messageCount
      } else {
        message.messageCount = connection.messageCount
      }
    }

    let msg = ''
    if (typeof message === 'string') {
      msg = message
    } else {
      if (message && message.error) {
        message.error = message.error.toString().replace(/^Error:\s/, '')
      }
      msg = JSON.stringify(message, null, 4)
    }
    // server.server.sendMessage(msg, connection.rawConnection.channel)
    server.server.send({
      text: msg,
      channel: connection.rawConnection.channel,
      type: RTM_EVENTS.MESSAGE,
      subtype: RTM_MESSAGE_SUBTYPES.BOT_MESSAGE,
      is_ephemeral: true
    })
  }

  server.sendTyping = function (connection) {
    server.server.sendTyping(connection.rawConnection.channel)
  }

  // @todo implement
  server.sendFile = function (connection, error, fileStream, mime, length) {

  }

  server.goodbye = function (connection, reason) {
    server.sendMessage(connection, connection.localize('actionhero.goodbyeMessage'))
  }

  // //////////
  // EVENTS //
  // //////////

  server.on('connection', function (connection) {
    // api.log('new', connection)
  })

  server.on('actionComplete', function (data) {
    if (data.toRender === true) {
      data.response.context = 'response'
      server.sendMessage(data.connection, data.response, data.messageCount)
    }
  })

  // ///////////
  // HELPERS //
  // ///////////

  const parseRequest = function (connection, line) {
    server.sendTyping(connection)

    // hardcoded fix quotes
    line = line.replace(/(“|”)/gi, '"')

    let words = line.split(' ')
    let verb = words.shift()
    // @todo implement file upload
    // if (verb === 'file')
    connection.verbs(verb, words, (error, data) => {
      if (!error) {
        // server.sendMessage(connection, {status: 'ok', context: 'response', data: data})
      } else if (error.toString().match('verb not found or not allowed') || error.toString().match('verbNotAllowed') || error.toString().match('verbNotFound')) {
        // check for and attempt to check single-use params
        connection.params.action = null
        try {
          let requestHash = JSON.parse()
          if (requestHash.params !== undefined) {
            connection.params = {}
            for (let v in requestHash.params) {
              connection.params[v] = requestHash.params[v]
            }
          }
          if (requestHash.action) {
            connection.params.action = requestHash.action
          }
        } catch (e) {
          // try to detect by route
          api.routes.processRoute(connection, line.split(' '))
          if (!connection.params.action) {
            // try to detect by cli args
            api.cli && api.cli.processLine(connection, line)
            if (!connection.params.action) {
              connection.params.action = verb
            }
          }
        }
        connection.error = null
        connection.response = {}
        server.processAction(connection)
      } else {
        server.sendMessage(connection, {error: error, context: 'response', data: data})
      }
    })
  }

  const handleMessage = (message) => {
    if (message.is_ephemeral || message.subtype) return
    const connectionId = (message.channel || '') + ':' + (message.user || '')

    // create connection if doesn't exist
    if (!api.connections.connections[connectionId]) {
      server.buildConnection({
        rawConnection: {
          // harcode to use routes
          method: 'get',
          channel: message.channel,
          user: message.user
        },
        id: connectionId,
        remoteAddress: '0.0.0.0',
        remotePort: '0'
      })
    }

    let connection = api.connections.connections[connectionId]
    let msg = message.text || ''
    msg.split(String(api.config.servers.slack.delimiter)).forEach(function (line) {
      if (line.length > 0) {
        connection.messageCount++
        parseRequest(connection, line)
      }
    })
  }

  next(server)
}

exports.initialize = initialize
