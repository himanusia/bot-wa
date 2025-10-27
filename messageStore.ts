import { WAMessage, WAMessageKey, proto } from '@whiskeysockets/baileys'

/**
 * Simple in-memory message store
 * Stores messages for retrieval (used by getMessage function)
 */
class MessageStore {
  private messages: Map<string, WAMessage> = new Map()
  private maxMessages = 1000 // Limit to prevent memory issues

  /**
   * Generate unique key for message
   */
  private getMessageKey(key: WAMessageKey): string {
    return `${key.remoteJid}_${key.id}`
  }

  /**
   * Store a message
   */
  saveMessage(msg: WAMessage) {
    if (!msg.key.id) return
    
    const messageKey = this.getMessageKey(msg.key)
    this.messages.set(messageKey, msg)

    // Clean old messages if limit exceeded
    if (this.messages.size > this.maxMessages) {
      const firstKey = this.messages.keys().next().value
      if (firstKey) {
        this.messages.delete(firstKey)
      }
    }
  }

  /**
   * Retrieve a message by key
   */
  getMessage(key: WAMessageKey): WAMessage | undefined {
    if (!key.id) return undefined
    
    const messageKey = this.getMessageKey(key)
    return this.messages.get(messageKey)
  }

  /**
   * Clear all messages
   */
  clear() {
    this.messages.clear()
  }

  /**
   * Get store size
   */
  size(): number {
    return this.messages.size
  }
}

export const messageStore = new MessageStore()
