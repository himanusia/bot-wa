import { WASocket, WAMessage } from '@whiskeysockets/baileys'

export async function processMessage(
  sock: WASocket,
  msg: WAMessage,
  text: string,
  from: string
) {
  if (text === 'halo') {
    await sock.readMessages([msg.key])
    await sock.sendMessage(from, { text: 'hai' })
    return
  }
}
