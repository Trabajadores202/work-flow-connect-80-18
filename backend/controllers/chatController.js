const chatModel = require('../models/chatModel');
const userModel = require('../models/userModel');
const messageModel = require('../models/messageModel');

const chatController = {
  // Get all chats for a user
  async getChats(req, res) {
    try {
      const { userId } = req.user;
      
      // Get chats
      const chats = await chatModel.findByUserId(userId);
      
      // Format chats with additional data
      const formattedChats = [];
      
      for (const chat of chats) {
        // Use the formatChatWithParticipants method to get the correct name
        const formattedChat = await chatModel.formatChatWithParticipants(chat, userId);
        
        // Get last message
        const lastMessage = await messageModel.getLastMessage(chat.id);
        if (lastMessage) {
          formattedChat.lastMessage = {
            content: lastMessage.content,
            timestamp: lastMessage.createdAt
          };
        }
        
        formattedChats.push(formattedChat);
      }
      
      res.json(formattedChats);
    } catch (error) {
      console.error('Error getting chats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Create a private chat
  async createPrivateChat(req, res) {
    try {
      const { userId: currentUserId } = req.user;
      const { userId: otherUserId } = req.body;
      
      if (!otherUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      console.log(`Creating private chat between ${currentUserId} and ${otherUserId}`);
      
      if (currentUserId === otherUserId) {
        return res.status(400).json({ message: 'Cannot create chat with yourself' });
      }
      
      // Check if other user exists
      const otherUser = await userModel.findById(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create or get private chat (now without passing the other user's name)
      const chat = await chatModel.createPrivateChat(currentUserId, otherUserId);
      
      if (!chat) {
        return res.status(500).json({ message: 'Failed to create chat' });
      }
      
      // Format chat for response with the correct name for the current user
      const formattedChat = await chatModel.formatChatWithParticipants(chat, currentUserId);
      console.log('Created private chat:', formattedChat);
      
      res.status(201).json(formattedChat);
    } catch (error) {
      console.error('Error in createPrivateChat:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Create a group chat
  async createGroupChat(req, res) {
    try {
      const { userId } = req.user;
      const { name, participants } = req.body;
      
      if (!name || !participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ message: 'Name and at least one participant are required' });
      }
      
      // Create the chat
      const chat = await chatModel.create({ name, isGroup: true });
      
      // Add all participants including current user
      const allParticipants = [...new Set([...participants, userId])];
      await chatModel.addParticipants(chat.id, allParticipants);
      
      // Format chat for response
      const formattedChat = await chatModel.formatChatWithParticipants(chat, userId);
      
      res.status(201).json(formattedChat);
    } catch (error) {
      console.error('Error creating group chat:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Add users to a chat
  async addUsersToChat(req, res) {
    try {
      const { userId } = req.user;
      const { chatId } = req.params;
      const { userIds } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: 'At least one user is required' });
      }
      
      // Check if chat exists and user is a participant
      const chat = await chatModel.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      const isParticipant = await chatModel.isParticipant(chatId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'You are not a participant in this chat' });
      }
      
      // Add users to chat
      await chatModel.addParticipants(chatId, userIds);
      
      // Format chat for response
      const formattedChat = await chatModel.formatChatWithParticipants(chat, userId);
      
      res.json(formattedChat);
    } catch (error) {
      console.error('Error adding users to chat:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Leave chat
  async leaveChat(req, res) {
    try {
      const { userId } = req.user;
      const { chatId } = req.params;
      
      // Check if chat exists
      const chat = await chatModel.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Check if user is a participant
      const isParticipant = await chatModel.isParticipant(chatId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'You are not a participant in this chat' });
      }
      
      // Remove user from chat
      await chatModel.removeParticipant(chatId, userId);
      
      res.json({ message: 'Successfully left chat', chatId });
    } catch (error) {
      console.error('Error leaving chat:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Delete a chat
  async deleteChat(req, res) {
    try {
      const { userId } = req.user;
      const { chatId } = req.params;
      
      // Check if chat exists
      const chat = await chatModel.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Check if user is a participant
      const isParticipant = await chatModel.isParticipant(chatId, userId);
      if (!isParticipant) {
        return res.status(403).json({ message: 'You are not a participant in this chat' });
      }
      
      // Delete chat
      await chatModel.delete(chatId);
      
      res.json({ message: 'Chat deleted', chatId });
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = chatController;
