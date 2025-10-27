import { Boom } from '@hapi/boom'
import NodeCache from '@cacheable/node-cache'
import readline from 'readline'
import makeWASocket, { CacheStore, DisconnectReason, fetchLatestBaileysVersion, getAggregateVotesInPollMessage, isJidNewsletter, makeCacheableSignalKeyStore, proto, useMultiFileAuthState, WAMessageContent, WAMessageKey } from '@whiskeysockets/baileys'
import P from 'pino'
import { handleMessage } from './messageHandler.js'
import { messageStore } from './messageStore.js'

const usePairingCode = process.argv.includes('--use-pairing-code')
const silentMode = process.argv.includes('--silent')

const logger = P({
  level: silentMode ? "error" : "trace",
  transport: {
    targets: silentMode ? [
      {
        target: "pino/file",
        options: { destination: './wa-logs.txt' },
        level: "trace",
      },
    ] : [
      {
        target: "pino-pretty",
        options: { colorize: true },
        level: "trace",
      },
      {
        target: "pino/file",
        options: { destination: './wa-logs.txt' },
        level: "trace",
      },
    ],
  },
})
logger.level = silentMode ? 'error' : 'trace'

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache() as CacheStore

const onDemandMap = new Map<string, string>()

// Read line interface
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

// start a connection
const startSock = async() => {
	const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
	// fetch latest version of WA Web
	const { version, isLatest } = await fetchLatestBaileysVersion()
	if (!silentMode) {
		console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)
	}

	const sock = makeWASocket({
		version,
		logger,
		auth: {
			creds: state.creds,
			/** caching makes the store faster to send/recv messages */
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		msgRetryCounterCache,
		generateHighQualityLinkPreview: true,
		// ignore all broadcast messages -- to receive the same
		// comment the line below out
		// shouldIgnoreJid: jid => isJidBroadcast(jid),
		// implement to handle retries & poll updates
		getMessage
	})


	// const wam = new WAMHandler(sock, state)

	// Pairing code for Web clients
	if (usePairingCode && !sock.authState.creds.registered) {
		// todo move to QR event
		const phoneNumber = await question('Please enter your phone number:\n')
		const code = await sock.requestPairingCode(phoneNumber)
		console.log(`Pairing code: ${code}`)
	} else if (!silentMode && !sock.authState.creds.registered) {
		console.log('Scan QR code to connect')
	}

	// the process function lets you process all events that just occurred
	// efficiently in a batch
	sock.ev.process(
		// events is a map for event name => event data
		async(events) => {
			// something about the connection changed
			// maybe it closed, or we received all offline message or connection opened
			if(events['connection.update']) {
				const update = events['connection.update']
				const { connection, lastDisconnect } = update
				if(connection === 'close') {
					// reconnect if not logged out
					if((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
						if (!silentMode) console.log('Connection closed. Reconnecting...')
						startSock()
					} else {
						console.log('Connection closed. You are logged out.')
					}
				} else if (connection === 'open' && !silentMode) {
					console.log('✅ Bot connected successfully!')
				}
				
				if (!silentMode) {
					console.log('connection update', update)
				}
			}

			// credentials updated -- save them
			if(events['creds.update']) {
				await saveCreds()
			}

			if(events['labels.association']) {
				if (!silentMode) {
					console.log(events['labels.association'])
				}
			}


			if(events['labels.edit']) {
				if (!silentMode) {
					console.log(events['labels.edit'])
				}
			}

			if(events.call) {
				if (!silentMode) {
					console.log('recv call event', events.call)
				}
			}

			// history received
			if(events['messaging-history.set']) {
				const { chats, contacts, messages, isLatest, progress, syncType } = events['messaging-history.set']
				if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
					if (!silentMode) {
						console.log('received on-demand history sync, messages=', messages)
					}
				}
				if (!silentMode) {
					console.log(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`)
				}
			}

			// received a new message
      if (events['messages.upsert']) {
        const upsert = events['messages.upsert']
        
        if (!silentMode) {
          console.log('recv messages ', JSON.stringify(upsert, undefined, 2))
        }

        if (!!upsert.requestId) {
          if (!silentMode) {
            console.log("placeholder message received for request of id=" + upsert.requestId, upsert)
          }
        }

        if (upsert.type === 'notify') {
          for (const msg of upsert.messages) {
            // Store message for later retrieval
            messageStore.saveMessage(msg)
            
            // Handle special commands
            if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
              const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
              
              if (text == "requestPlaceholder" && !upsert.requestId) {
                const messageId = await sock.requestPlaceholderResend(msg.key)
                if (!silentMode) {
                  console.log('requested placeholder resync, id=', messageId)
                }
                continue
              }

              if (text == "onDemandHistSync") {
                const messageId = await sock.fetchMessageHistory(50, msg.key, msg.messageTimestamp!)
                if (!silentMode) {
                  console.log('requested on-demand sync, id=', messageId)
                }
                continue
              }
            }

            // Use message handler for regular messages
            if (!msg.key.fromMe && !isJidNewsletter(msg.key?.remoteJid!)) {
              await handleMessage(sock, msg)
            }
          }
        }
      }

			// messages updated like status delivered, message deleted etc.
			if(events['messages.update']) {
				if (!silentMode) {
					console.log(
						JSON.stringify(events['messages.update'], undefined, 2)
					)
				}

				for(const { key, update } of events['messages.update']) {
					if(update.pollUpdates) {
						const pollCreation = await getMessage(key)
						if(pollCreation) {
							console.log(
								'got poll update, aggregation: ',
								getAggregateVotesInPollMessage({
									message: pollCreation,
									pollUpdates: update.pollUpdates,
								})
							)
						}
					}
				}
			}

			if(events['message-receipt.update']) {
				if (!silentMode) {
					console.log(events['message-receipt.update'])
				}
			}

			if(events['messages.reaction']) {
				if (!silentMode) {
					console.log(events['messages.reaction'])
				}
			}

			if(events['presence.update']) {
				if (!silentMode) {
					console.log(events['presence.update'])
				}
			}

			if(events['chats.update']) {
				if (!silentMode) {
					console.log(events['chats.update'])
				}
			}

			if(events['contacts.update']) {
				for(const contact of events['contacts.update']) {
					if(typeof contact.imgUrl !== 'undefined') {
						const newUrl = contact.imgUrl === null
							? null
							: await sock!.profilePictureUrl(contact.id!).catch(() => null)
						if (!silentMode) {
							console.log(
								`contact ${contact.id} has a new profile pic: ${newUrl}`,
							)
						}
					}
				}
			}

			if(events['chats.delete']) {
				if (!silentMode) {
					console.log('chats deleted ', events['chats.delete'])
				}
			}
		}
	)

	return sock

	async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
		// Retrieve message from store
		const msg = messageStore.getMessage(key)
		return msg?.message || undefined
	}
}

startSock()
