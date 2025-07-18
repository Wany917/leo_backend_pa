import Ws from '#services/ws'
import { userSockets } from '#controllers/messages_controller'

export default class WebSocketMessagesController {

  public async sendMessage(senderId: number, receiverId: number, content: string) {
    try {

      const receiverSocket = userSockets.get(receiverId)
      if (receiverSocket) {
        receiverSocket.emit('new_message', {
          senderId,
          content,
          timestamp: new Date().toISOString(),
        })
      }

      return { success: true }
    } catch (error) {

      return { success: false, error: 'Failed to send message' }
    }
  }


  public async markMessageAsRead(messageId: number, userId: number) {
    try {
      const senderId = 0
      const senderSocket = userSockets.get(senderId)
      if (senderSocket) {
        senderSocket.emit('message_read', { messageId })
      }

      return { success: true }
    } catch (error) {

      return { success: false, error: 'Failed to mark message as read' }
    }
  }


  public notifyTyping(senderId: number, receiverId: number) {
    try {
      const receiverSocket = userSockets.get(receiverId)
      if (receiverSocket) {
        receiverSocket.emit('user_typing', { userId: senderId })
      }
      return { success: true }
    } catch (error) {

      return { success: false, error: 'Failed to notify typing' }
    }
  }


  public broadcastUserStatus(userId: number, status: 'online' | 'offline' | 'away') {
    try {
      Ws.broadcast('user_status_change', { userId, status })
      return { success: true }
    } catch (error) {

      return { success: false, error: 'Failed to broadcast user status' }
    }
  }
}
