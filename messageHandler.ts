import { WASocket, WAMessage } from '@whiskeysockets/baileys'
import { processMessage } from './commands.js'

const silentMode = process.argv.includes('--silent')

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
