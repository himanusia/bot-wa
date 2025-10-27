import { WASocket, WAMessage } from '@whiskeysockets/baileys'
import { prosesPesan } from './pesan.js'

const silentMode = process.argv.includes('--silent')

export async function handleMessage(sock: WASocket, msg: WAMessage) {
  try {
    const from = msg.key.remoteJid;
    const fromName = msg.pushName || 'Unknown';
    const isFromMe = msg.key.fromMe

    const text = getMessageText(msg)
    
    if (!text) {
        if (!silentMode) {
            console.log('No text content in message')
        }
        return
    }

    // const displaySender = isFromMe ? 'Gw' : `${fromName} (${from && from.split('@')[0]})`
    // const displayRecipient = isFromMe ? (from ? from.split('@')[0] : 'Gw') : 'Gw'
    // console.log(`${displaySender} ke ${displayRecipient}: ${text}`)
    
    // buat tutorial
    console.log(`${isFromMe ? '--- gw' : fromName}: ${text}`)

    if (isFromMe) return

    // Handle messages
    await prosesPesan(sock, msg, text, from!)
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
