const messageModel = require('../models/messageModel');
const chatModel = require('../models/chatModel');
const fileModel = require('../models/fileModel');

const messageController = {
  // Get messages for a chat
  async getMessages(req, res) {
    try {
      const { chatId } = req.params;
      const { search } = req.query;
      const userId = req.user.userId;

      // Check if user is participant
      const isParticipant = await chatModel.isParticipant(chatId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'You are not a participant in this chat' });
      }

      // Get messages
      const messages = await messageModel.findByChatId(chatId, search);
      
      // For each message that has a fileId, get the complete file information
      const messagesWithFiles = await Promise.all(messages.map(async (message) => {
        if (message.fileId) {
          try {
            const file = await fileModel.findById(message.fileId);
            if (file) {
              return {
                ...message,
                file: {
                  id: file.id,
                  filename: file.filename,
                  contentType: file.content_type,
                  size: file.size,
                  uploadedBy: file.uploaded_by
                }
              };
            }
          } catch (error) {
            console.error('Error getting file info for message:', error);
          }
        }
        return message;
      }));

      res.json(messagesWithFiles);
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Send a message
  async sendMessage(req, res) {
    try {
      const { chatId, content } = req.body;
      const senderId = req.user.userId;
      
      console.log(`Sending message from user ${senderId} to chat ${chatId}: "${content}"`);
      
      // Check if user is a participant
      const isParticipant = await chatModel.isParticipant(chatId, senderId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'You are not a participant in this chat' });
      }
      
      // Create message
      const message = await messageModel.create({
        chatId,
        senderId: senderId,
        text: content
      });
      
      // Get sender information for real-time updates
      const result = await chatModel.getParticipants(chatId);
      const sender = result.find(user => user.id === senderId);
      
      // Format message for response with sender info
      const formattedMessage = {
        ...message,
        senderId: senderId, 
        senderName: sender ? sender.name : 'Unknown User',
        senderPhoto: sender ? sender.photoURL : null,
        timestamp: message.createdAt,
        deleted: message.deleted || false,
        edited: message.edited || false
      };
      
      console.log('Formatted message to send:', formattedMessage);
      
      // Update last message in chat
      await chatModel.updateLastMessage(chatId);
      
      // IMPORTANTE: No usamos socket desde aquí para evitar duplicados
      // Ya que los clientes envían primero por socket y solo como fallback por HTTP
      // El socketHandler ya se encarga de emitir el mensaje si llegó por socket
      
      // Solo enviamos por socket si la petición es explícitamente HTTP (no viene de socket)
      const isSocketRequest = req.headers['x-socket-request'] === 'true';
      
      if (!isSocketRequest) {
        // Get the socket service from the app
        const socketService = req.app.get('socketService');
        if (socketService) {
          // Get all participants of the chat
          const participants = await chatModel.getParticipants(chatId);
          const participantIds = participants.map(p => p.id);
          
          // Notify all participants about the new message
          socketService.notifyUsers(participantIds, 'chat:message', chatId, formattedMessage);
        }
      }
      
      res.status(201).json(formattedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Update a message
  async updateMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { text } = req.body;
      
      // Get message
      const message = await messageModel.findById(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Check if user is the sender
      if (message.senderId !== req.user.userId && message.userId !== req.user.userId) {
        return res.status(403).json({ message: 'You can only edit your own messages' });
      }
      
      // Update message
      const updatedMessage = await messageModel.update(messageId, text);
      
      // Get chat and sender information for real-time updates
      const chatId = message.chatId;
      const result = await chatModel.getParticipants(chatId);
      const sender = result.find(user => user.id === req.user.userId);
      
      // Format message for response with sender info
      const formattedMessage = {
        ...updatedMessage,
        senderId: updatedMessage.senderId || updatedMessage.userId,
        senderName: sender ? sender.name : 'Unknown User',
        senderPhoto: sender ? sender.photoURL : null,
        timestamp: updatedMessage.updatedAt,
        edited: true, // Aseguramos que edited siempre sea true para mensajes actualizados
        deleted: updatedMessage.deleted || false
      };
      
      // Get the socket service from the app
      const socketService = req.app.get('socketService');
      if (socketService) {
        // Get all participants of the chat
        const participants = await chatModel.getParticipants(chatId);
        const participantIds = participants.map(p => p.id);
        
        // Notify all participants about the updated message
        socketService.notifyUsers(participantIds, 'chat:message:update', chatId, formattedMessage);
      }
      
      res.json(formattedMessage);
    } catch (error) {
      console.error('Error updating message:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Delete a message
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      
      // Get message
      const message = await messageModel.findById(messageId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Check if user is the sender
      if (message.senderId !== req.user.userId && message.userId !== req.user.userId) {
        return res.status(403).json({ message: 'You can only delete your own messages' });
      }
      
      // Get chat ID for notifications before deleting
      const chatId = message.chatId;
      
      // Marcar el mensaje como eliminado en vez de borrarlo físicamente
      const deletedMessage = await messageModel.delete(messageId);
      
      // Update last message in the chat
      await chatModel.updateLastMessage(chatId);
      
      // Get the socket service from the app
      const socketService = req.app.get('socketService');
      if (socketService) {
        // Get all participants of the chat
        const participants = await chatModel.getParticipants(chatId);
        const participantIds = participants.map(p => p.id);
        
        // Notify all participants about the "deleted" message with updated content
        socketService.notifyUsers(participantIds, 'chat:message:delete', chatId, {
          id: messageId,
          chatId,
          deleted: true,
          content: '[Mensaje eliminado]',
          timestamp: deletedMessage.updatedAt
        });
      }
      
      res.json({ message: 'Message deleted', messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Search messages in all chats
  async searchMessages(req, res) {
    try {
      const { query } = req.query;
      const userId = req.user.userId;
      
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
      }

      // Get messages from all user's chats containing the search query
      const messages = await messageModel.searchUserMessages(userId, query);
      
      console.log(`Found ${messages.length} messages matching query "${query}" for user ${userId}`);
      
      res.json(messages);
    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = messageController;
