import { WASocket, WAMessage } from '@whiskeysockets/baileys'

export async function prosesPesan(
  sock: WASocket,
  msg: WAMessage,
  text: string,
  from: string
) {
  if (text === 'i love you') {
    await sock.readMessages([msg.key])
    await sock.sendMessage(from, { text: 'i love you too 💖' })
    return
  }
}
