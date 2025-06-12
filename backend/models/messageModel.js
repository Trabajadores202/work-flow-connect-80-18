const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const messageModel = {
  // Create a new message
  async create(messageData) {
    const { chatId, senderId, text, fileId } = messageData;
    
    // Generate UUID for the message
    const messageId = uuidv4();
    
    // Get current timestamp for createdAt and updatedAt
    const now = new Date();
    
    console.log(`Creating message: chatId=${chatId}, senderId=${senderId}, text=${text}, fileId=${fileId}`);
    
    try {
      // Verificar si existen las columnas necesarias
      const columnInfo = await this.checkColumns();
      
      // Aseguramos que la columna fileId existe
      if (fileId && !columnInfo.hasFileId) {
        await this.addFileIdColumn();
      }
      
      // Construir la consulta dinámica
      const fields = ['id', 'chatId', 'userId', 'content', 'read', 'createdAt', 'updatedAt'];
      const values = [messageId, chatId, senderId, text, false, now, now];
      let paramCounter = values.length + 1;
      
      if (columnInfo.hasDeleted || await this.addDeletedColumn()) {
        fields.push('deleted');
        values.push(false);
      }
      
      if (columnInfo.hasEdited || await this.addEditedColumn()) {
        fields.push('edited');
        values.push(false);
      }
      
      // Agregar fileId si está presente
      if (fileId) {
        fields.push('fileId');
        values.push(fileId);
      }
      
      // Construir la consulta SQL
      const fieldStr = fields.map(f => `"${f}"`).join(', ');
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `INSERT INTO "Messages" (${fieldStr}) VALUES (${placeholders}) RETURNING *`;
      
      const result = await db.query(query, values);
      
      // Añadir el senderId explícitamente para garantizar la coherencia
      const message = {
        ...result.rows[0],
        senderId: senderId,
        deleted: result.rows[0].deleted || false,
        edited: result.rows[0].edited || false
      };
      
      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },
  
  // Get messages for a chat with optional search filter
  async findByChatId(chatId, searchText = null) {
    try {
      let query = `
        SELECT m.*, m."userId" as "senderId", u.name as "senderName", u."photoURL" as "senderPhoto",
               f.id as "file_id", f.filename as "file_filename", f.content_type as "file_content_type", 
               f.size as "file_size", f.uploaded_by as "file_uploaded_by"
        FROM "Messages" m 
        LEFT JOIN "Users" u ON m."userId" = u.id 
        LEFT JOIN "Files" f ON m."fileId" = f.id
        WHERE m."chatId" = $1
      `;
      
      const params = [chatId];
      
      if (searchText) {
        query += ` AND (LOWER(m.content) LIKE LOWER($2))`;
        params.push(`%${searchText}%`);
      }
      
      query += ` ORDER BY m."createdAt" ASC`;
      
      const result = await db.query(query, params);
      
      // Formatear los mensajes incluyendo información del archivo si existe
      return result.rows.map(row => {
        const deleted = typeof row.deleted !== 'undefined' ? row.deleted : false;
        const edited = typeof row.edited !== 'undefined' ? row.edited : false;
        
        const message = {
          ...row,
          senderId: row.userId || row.senderId,
          timestamp: row.createdAt,
          deleted: deleted,
          edited: edited
        };
        
        // Si el mensaje tiene un archivo, incluir la información completa
        if (row.file_id) {
          message.file = {
            id: row.file_id,
            filename: row.file_filename,
            contentType: row.file_content_type,
            size: row.file_size,
            uploadedBy: row.file_uploaded_by
          };
        }
        
        return message;
      });
    } catch (error) {
      console.error("Error al obtener mensajes:", error);
      return [];
    }
  },
  
  // Search messages across all chats where user is participant
  async searchUserMessages(userId, searchText) {
    try {
      const query = `
        SELECT 
          m.*,
          m."userId" as "senderId",
          u.name as "senderName",
          u."photoURL" as "senderPhoto",
          c.name as "chatName",
          c."isGroup" as "chatIsGroup"
        FROM "Messages" m
        LEFT JOIN "Users" u ON m."userId" = u.id
        JOIN "Chats" c ON m."chatId" = c.id
        JOIN "ChatParticipants" cp ON c.id = cp."chatId" AND cp."userId" = $1
        WHERE LOWER(m.content) LIKE LOWER($2)
        ORDER BY m."createdAt" DESC
        LIMIT 50
      `;
      
      const result = await db.query(query, [userId, `%${searchText}%`]);
      
      // Format messages for compatibility with frontend
      return result.rows.map(row => {
        const deleted = typeof row.deleted !== 'undefined' ? row.deleted : false;
        const edited = typeof row.edited !== 'undefined' ? row.edited : false;
        
        return {
          ...row,
          senderId: row.userId || row.senderId,
          timestamp: row.createdAt,
          deleted: deleted,
          edited: edited
        };
      });
    } catch (error) {
      console.error("Error al buscar mensajes:", error);
      return [];
    }
  },
  
  // Get a single message by ID
  async findById(messageId) {
    try {
      const result = await db.query(
        'SELECT *, "userId" as "senderId" FROM "Messages" WHERE id = $1', 
        [messageId]
      );
      
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          deleted: result.rows[0].deleted || false,
          edited: result.rows[0].edited || false
        };
      }
      return null;
    } catch (error) {
      console.error("Error al buscar mensaje:", error);
      return null;
    }
  },
  
  // Update a message
  async update(messageId, text) {
    const now = new Date();
    try {
      const columnInfo = await this.checkColumns();
      
      let query;
      let values;
      
      if (columnInfo.hasEdited) {
        query = 'UPDATE "Messages" SET content = $1, "updatedAt" = $2, "edited" = true WHERE id = $3 RETURNING *, "userId" as "senderId"';
        values = [text, now, messageId];
      } else {
        // Si no existe la columna edited, primero intentamos agregarla
        await this.addEditedColumn();
        
        // Luego hacemos la actualización sin usar la columna edited para evitar errores
        query = 'UPDATE "Messages" SET content = $1, "updatedAt" = $2 WHERE id = $3 RETURNING *, "userId" as "senderId"';
        values = [text, now, messageId];
      }
      
      const result = await db.query(query, values);
      
      // Aseguramos que siempre devolvemos edited como true para mensajes actualizados
      return result.rows[0] ? {
        ...result.rows[0],
        edited: true,
        deleted: result.rows[0].deleted || false
      } : null;
    } catch (error) {
      console.error("Error al actualizar mensaje:", error);
      // Si hay un error con la columna edited, intentamos con la consulta alternativa
      try {
        const query = 'UPDATE "Messages" SET content = $1, "updatedAt" = $2 WHERE id = $3 RETURNING *, "userId" as "senderId"';
        const values = [text, now, messageId];
        
        const result = await db.query(query, values);
        
        return result.rows[0] ? {
          ...result.rows[0],
          edited: true,
          deleted: result.rows[0].deleted || false
        } : null;
      } catch (secondError) {
        console.error("Error en el segundo intento de actualizar mensaje:", secondError);
        throw secondError;
      }
    }
  },
  
  // Delete a message (marcar como eliminado)
  async delete(messageId) {
    const now = new Date();
    
    try {
      const columnInfo = await this.checkColumns();
      
      let query;
      let values;
      
      if (columnInfo.hasDeleted) {
        query = 'UPDATE "Messages" SET deleted = true, content = \'[Mensaje eliminado]\', "updatedAt" = $1 WHERE id = $2 RETURNING *, "userId" as "senderId"';
        values = [now, messageId];
      } else {
        query = 'UPDATE "Messages" SET content = \'[Mensaje eliminado]\', "updatedAt" = $1 WHERE id = $2 RETURNING *, "userId" as "senderId"';
        values = [now, messageId];
        
        // Intentar agregar la columna deleted si no existe
        await this.addDeletedColumn();
      }
      
      const result = await db.query(query, values);
      
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          deleted: true,
          content: '[Mensaje eliminado]'
        };
      }
      return null;
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      throw error;
    }
  },
  
  // Get last message for a chat
  async getLastMessage(chatId) {
    const result = await db.query(
      'SELECT *, "userId" as "senderId" FROM "Messages" WHERE "chatId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [chatId]
    );
    
    return result.rows[0] ? {
      ...result.rows[0],
      deleted: result.rows[0].deleted || false,
      edited: result.rows[0].edited || false
    } : null;
  },
  
  // Mark messages as read
  async markAsRead(chatId, userId) {
    await db.query(
      `UPDATE "Messages" 
       SET read = true 
       WHERE "chatId" = $1 AND "userId" != $2 AND NOT read`,
      [chatId, userId]
    );
    
    // Return the count of updated messages (optional)
    const result = await db.query(
      `SELECT COUNT(*) as updated_count 
       FROM "Messages" 
       WHERE "chatId" = $1 AND read = true AND "userId" != $2`,
      [chatId, userId]
    );
    
    return result.rows[0]?.updated_count || 0;
  },
  
  // Find a message by file ID
  async findByFileId(fileId) {
    try {
      // Ver si la tabla tiene la columna fileId primero
      const columnInfo = await this.checkColumns();
      
      if (!columnInfo.hasFileId) {
        await this.addFileIdColumn();
        return null; // No puede haber mensajes con fileId si la columna no existía
      }
      
      const result = await db.query(
        'SELECT *, "userId" as "senderId" FROM "Messages" WHERE "fileId" = $1', 
        [fileId]
      );
      
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          deleted: result.rows[0].deleted || false,
          edited: result.rows[0].edited || false
        };
      }
      return null;
    } catch (error) {
      console.error("Error finding message by file ID:", error);
      return null;
    }
  },
  
  // Check if columns exist
  async checkColumns() {
    try {
      const result = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Messages';
      `);
      
      const columns = result.rows.map(row => row.column_name);
      
      return {
        hasDeleted: columns.includes('deleted'),
        hasEdited: columns.includes('edited'),
        hasFileId: columns.includes('fileId')
      };
    } catch (error) {
      console.error("Error verificando columnas:", error);
      return {
        hasDeleted: false,
        hasEdited: false,
        hasFileId: false
      };
    }
  },
  
  // Add deleted column if it doesn't exist
  async addDeletedColumn() {
    try {
      const columnInfo = await this.checkColumns();
      
      if (!columnInfo.hasDeleted) {
        console.log("Agregando columna 'deleted' a la tabla Messages...");
        await db.query(`
          ALTER TABLE "Messages"
          ADD COLUMN "deleted" BOOLEAN DEFAULT false;
        `);
        console.log("Columna 'deleted' agregada con éxito");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al agregar columna deleted:", error);
      return false;
    }
  },
  
  // Add edited column if it doesn't exist
  async addEditedColumn() {
    try {
      const columnInfo = await this.checkColumns();
      
      if (!columnInfo.hasEdited) {
        console.log("Agregando columna 'edited' a la tabla Messages...");
        await db.query(`
          ALTER TABLE "Messages"
          ADD COLUMN "edited" BOOLEAN DEFAULT false;
        `);
        console.log("Columna 'edited' agregada con éxito");
        return true;
      }
      
      return false;
    } catch (error) {
      // Si el error es porque la columna ya existe, ignoramos el error
      if (error.code !== '42701') { // 42701 es el código para columna ya existente
        console.error("Error al agregar columna edited:", error);
      }
      return false;
    }
  },
  
  // Add fileId column if it doesn't exist
  async addFileIdColumn() {
    try {
      const columnInfo = await this.checkColumns();
      
      if (!columnInfo.hasFileId) {
        console.log("Agregando columna 'fileId' a la tabla Messages...");
        await db.query(`
          ALTER TABLE "Messages"
          ADD COLUMN "fileId" INTEGER REFERENCES "Files"(id) ON DELETE SET NULL;
        `);
        console.log("Columna 'fileId' agregada con éxito");
        return true;
      }
      
      return false;
    } catch (error) {
      // Si el error es porque la columna ya existe, ignoramos el error
      if (error.code === '42701') { // 42701 es el código para columna ya existente
        console.log("La columna 'fileId' ya existe en la tabla Messages");
        return true;
      }
      console.error("Error al agregar columna fileId:", error);
      return false;
    }
  }
};

module.exports = messageModel;
