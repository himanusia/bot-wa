import { WASocket, WAMessage, AnyMessageContent } from '@whiskeysockets/baileys'

const silentMode = process.argv.includes('--silent')

/**
 * Process message and send response
 */
async function processMessage(
  sock: WASocket,
  msg: WAMessage,
  text: string,
  from: string
) {
    if (text === "halo") {
        await sock.readMessages([msg.key])
        await sendMessage(sock, from, { text: 'Halo! Ada yang bisa saya bantu?' })
    }
}


export async function handleMessage(sock: WASocket, msg: WAMessage) {
  try {
    const from = msg.key.remoteJid
    const isFromMe = msg.key.fromMe

    if (isFromMe) return

    const text = getMessageText(msg)
    
    if (!text) {
      if (!silentMode) {
        console.log('No text content in message')
      }
      return
    }

    if (!silentMode) {
      console.log(`Message from ${from}: ${text}`)
    }


    // Handle different commands or messages
    await processMessage(sock, msg, text, from!)
  } catch (error) {
    console.error('Error handling message:', error)
  }
}

/**
 * Extract text from different message types
 */
function getMessageText(msg: WAMessage): string | null {
  const message = msg.message
  if (!message) return null

  if (message.conversation) {
    return message.conversation
  }

  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text
  }

  if (message.imageMessage?.caption) {
    return message.imageMessage.caption
  }

  if (message.videoMessage?.caption) {
    return message.videoMessage.caption
  }

  return null
}


/**
 * Send message with typing indicator
 */
async function sendMessage(
  sock: WASocket,
  jid: string,
  content: AnyMessageContent,
  isDelayed: boolean = false
) {
  try {
    if (!isDelayed) {
        await sock.sendMessage(jid, content)
        return
    }

    await sock.presenceSubscribe(jid)
    await sock.sendPresenceUpdate('composing', jid)
    await delay(1000)
    await sock.sendPresenceUpdate('paused', jid)
    await sock.sendMessage(jid, content)
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

/**
 * Utility function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
