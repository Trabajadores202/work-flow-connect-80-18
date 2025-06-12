
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const chatModel = {
  // Create a new chat
  async create(chatData) {
    const { name = '', isGroup = false } = chatData;
    const id = uuidv4(); // Generate a UUID for the chat
    
    const result = await db.query(
      'INSERT INTO "Chats" (id, name, "isGroup", "createdAt", "updatedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      [id, name, isGroup]
    );
    
    return result.rows[0];
  },
  
  // Find a chat by ID
  async findById(id) {
    const result = await db.query('SELECT * FROM "Chats" WHERE id = $1', [id]);
    return result.rows[0];
  },
  
  // Get all chats for a user
  async findByUserId(userId) {
    const result = await db.query(
      `
        SELECT c.* FROM "Chats" c
        JOIN "ChatParticipants" cp ON c.id = cp."chatId"
        WHERE cp."userId" = $1
        ORDER BY c."updatedAt" DESC
      `,
      [userId]
    );
    
    return result.rows;
  },
  
  // Add participants to a chat
  async addParticipants(chatId, userIds) {
    const participants = [];
    
    for (const userId of userIds) {
      const participantId = uuidv4(); // Generate UUID for each participant
      
      // Check if user already exists in chat
      const checkResult = await db.query(
        'SELECT * FROM "ChatParticipants" WHERE "chatId" = $1 AND "userId" = $2',
        [chatId, userId]
      );
      
      // Only add if not already in chat
      if (checkResult.rows.length === 0) {
        const result = await db.query(
          'INSERT INTO "ChatParticipants" (id, "userId", "chatId", "createdAt", "updatedAt") VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
          [participantId, userId, chatId]
        );
        
        participants.push(result.rows[0]);
      }
    }
    
    return participants;
  },
  
  // Create a private chat between two users
  async createPrivateChat(userId1, userId2, otherUserName = '') {
    console.log(`Creating private chat between users ${userId1} and ${userId2}`);
    
    // Check if chat already exists
    const existingChat = await this.findPrivateChat(userId1, userId2);
    
    if (existingChat) {
      console.log('Chat already exists:', existingChat);
      return existingChat;
    }
    
    // Create a new chat WITHOUT a specific name (we'll handle names dynamically)
    console.log('Creating new private chat');
    const chat = await this.create({ 
      name: '', // Empty name for private chats - will be determined dynamically
      isGroup: false 
    });
    
    // Add participants
    await this.addParticipants(chat.id, [userId1, userId2]);
    
    // Get the full chat with participants
    const chatWithParticipants = await this.findById(chat.id);
    console.log('New chat created:', chatWithParticipants);
    
    return chatWithParticipants;
  },
  
  // Find a private chat between two users
  async findPrivateChat(userId1, userId2) {
    console.log(`Finding private chat between users ${userId1} and ${userId2}`);
    
    const result = await db.query(
      `
        SELECT c.* FROM "Chats" c
        WHERE c."isGroup" = false
        AND EXISTS (
          SELECT 1 FROM "ChatParticipants" cp1
          WHERE cp1."chatId" = c.id AND cp1."userId" = $1
        )
        AND EXISTS (
          SELECT 1 FROM "ChatParticipants" cp2
          WHERE cp2."chatId" = c.id AND cp2."userId" = $2
        )
        AND (
          SELECT COUNT(*) FROM "ChatParticipants" cp
          WHERE cp."chatId" = c.id
        ) = 2
      `,
      [userId1, userId2]
    );
    
    if (result.rows.length > 0) {
      console.log('Found existing private chat:', result.rows[0]);
    } else {
      console.log('No existing private chat found');
    }
    
    return result.rows[0];
  },
  
  // Update the last message timestamp in a chat
  async updateLastMessage(chatId) {
    await db.query(
      'UPDATE "Chats" SET "lastMessageAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1',
      [chatId]
    );
  },
  
  // Remove a user from a chat
  async removeParticipant(chatId, userId) {
    await db.query(
      'DELETE FROM "ChatParticipants" WHERE "chatId" = $1 AND "userId" = $2',
      [chatId, userId]
    );
  },
  
  // Delete a chat
  async delete(id) {
    // Delete all participants
    await db.query('DELETE FROM "ChatParticipants" WHERE "chatId" = $1', [id]);
    
    // Delete the chat
    await db.query('DELETE FROM "Chats" WHERE id = $1', [id]);
  },
  
  // Check if a user is a participant in a chat
  async isParticipant(chatId, userId) {
    const result = await db.query(
      'SELECT 1 FROM "ChatParticipants" WHERE "chatId" = $1 AND "userId" = $2',
      [chatId, userId]
    );
    
    return result.rows.length > 0;
  },
  
  // Get chat participants
  async getParticipants(chatId) {
    const result = await db.query(
      `
        SELECT u.id, u.name, u.email, u."photoURL", u."isOnline"
        FROM "Users" u
        JOIN "ChatParticipants" cp ON u.id = cp."userId"
        WHERE cp."chatId" = $1
      `,
      [chatId]
    );
    
    return result.rows;
  },
  
  // Format chat data with participants for frontend
  async formatChatWithParticipants(chat, currentUserId) {
    if (!chat) return null;
    
    // Get participants
    const participants = await this.getParticipants(chat.id);
    
    // Get participant IDs
    const participantIds = participants.map(p => p.id);
    
    // Find other user in private chats and determine the chat name
    let otherUser = null;
    let chatName = chat.name;
    
    if (!chat.isGroup) {
      otherUser = participants.find(p => p.id !== currentUserId);
      // For private chats, the name should be the other user's name
      chatName = otherUser ? otherUser.name : 'Usuario desconocido';
    }
    
    return {
      ...chat,
      name: chatName, // Override the name with the correct one for this user
      participants: participantIds,
      otherUser,
      participantDetails: participants
    };
  }
};

module.exports = chatModel;
