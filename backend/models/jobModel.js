const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const jobModel = {
  // Create a new job
  async create(jobData) {
    const { title, description, budget, category, skills, userId } = jobData;
    const id = uuidv4();
    const status = 'open';
    const now = new Date();
    
    const result = await db.query(
      `INSERT INTO "Jobs" (id, title, description, budget, category, skills, status, "userId", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id, title, description, budget, category, skills, status, "userId", "createdAt", "updatedAt"`,
      [id, title, description, budget, category, skills, status, userId, now, now]
    );
    
    console.log('Job created with dates:', { createdAt: now, updatedAt: now });
    return result.rows[0];
  },
  
  // Get all jobs with optional filtering
  async findAll(filter = {}) {
    let query = `
      SELECT j.id, j.title, j.description, j.budget, j.category, j.skills, j.status, 
             j."userId", j."createdAt", j."updatedAt"
      FROM "Jobs" j
    `;
    
    const params = [];
    const conditions = [];
    
    if (filter.category) {
      params.push(filter.category);
      conditions.push(`j.category = $${params.length}`);
    }
    
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`j.status = $${params.length}`);
    }
    
    if (filter.userId) {
      params.push(filter.userId);
      conditions.push(`j."userId" = $${params.length}`);
    }
    
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(j.title ILIKE $${params.length} OR j.description ILIKE $${params.length})`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY j."createdAt" DESC`;
    
    const result = await db.query(query, params);
    return result.rows;
  },
  
  // Find job by ID with like and save status for a specific user
  async findById(jobId, userId = null) {
    const result = await db.query(
      `SELECT j.id, j.title, j.description, j.budget, j.category, j.skills, j.status, 
              j."userId", j."createdAt", j."updatedAt"
       FROM "Jobs" j
       WHERE j.id = $1`,
      [jobId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const job = result.rows[0];
    
    // Get comments for this job
    job.comments = await jobModel.getComments(jobId);
    
    // If userId is provided, check if user has liked or saved this job
    if (userId) {
      // Check if user has liked this job
      const likeResult = await db.query(
        'SELECT COUNT(*) as count FROM "JobLikes" WHERE "JobId" = $1 AND "UserId" = $2',
        [jobId, userId]
      );
      job.isLiked = parseInt(likeResult.rows[0].count) > 0;
      
      // Check if user has saved this job
      const saveResult = await db.query(
        'SELECT COUNT(*) as count FROM "SavedJobs" WHERE "JobId" = $1 AND "UserId" = $2',
        [jobId, userId]
      );
      job.isSaved = parseInt(saveResult.rows[0].count) > 0;
    }
    
    // Get total likes count
    const likesCountResult = await db.query(
      'SELECT COUNT(*) as count FROM "JobLikes" WHERE "JobId" = $1',
      [jobId]
    );
    job.likesCount = parseInt(likesCountResult.rows[0].count);
    
    // Get total saves count
    const savesCountResult = await db.query(
      'SELECT COUNT(*) as count FROM "SavedJobs" WHERE "JobId" = $1',
      [jobId]
    );
    job.savesCount = parseInt(savesCountResult.rows[0].count);
    
    return job;
  },
  
  // Update a job
  async update(jobId, jobData) {
    const { title, description, budget, category, skills, status } = jobData;
    
    // Build the SET part of the query dynamically based on the provided fields
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push(`title = $${updates.length + 1}`);
      values.push(title);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${updates.length + 1}`);
      values.push(description);
    }
    
    if (budget !== undefined) {
      updates.push(`budget = $${updates.length + 1}`);
      values.push(budget);
    }
    
    if (category !== undefined) {
      updates.push(`category = $${updates.length + 1}`);
      values.push(category);
    }
    
    if (skills !== undefined) {
      updates.push(`skills = $${updates.length + 1}`);
      values.push(skills);
    }
    
    if (status !== undefined) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(status);
    }
    
    // Add updated_at with current timestamp
    updates.push(`"updatedAt" = $${updates.length + 1}`);
    values.push(new Date());
    
    // Add jobId to values array
    values.push(jobId);
    
    const query = `
      UPDATE "Jobs" 
      SET ${updates.join(', ')} 
      WHERE id = $${values.length} 
      RETURNING id, title, description, budget, category, skills, status, "userId", "createdAt", "updatedAt"
    `;
    
    const result = await db.query(query, values);
    
    return result.rows[0];
  },
  
  // Delete a job and all its associated comments and replies
  async delete(jobId) {
    try {
      // Start a transaction
      await db.query('BEGIN');
      
      // First, delete all replies to comments of this job
      // Find all comments for this job
      const commentsResult = await db.query(
        'SELECT id FROM "Comments" WHERE "jobId" = $1',
        [jobId]
      );
      
      // Delete replies for each comment
      const commentIds = commentsResult.rows.map(comment => comment.id);
      if (commentIds.length > 0) {
        console.log(`Deleting replies for comments: ${commentIds.join(', ')}`);
        // Delete replies for all comments of this job at once
        await db.query(
          'DELETE FROM "Replies" WHERE "commentId" IN (SELECT id FROM "Comments" WHERE "jobId" = $1)',
          [jobId]
        );
      }
      
      // Delete all comments for this job
      console.log(`Deleting all comments for job ${jobId}`);
      await db.query('DELETE FROM "Comments" WHERE "jobId" = $1', [jobId]);
      
      // Delete all likes for this job
      console.log(`Deleting all likes for job ${jobId}`);
      await db.query('DELETE FROM "JobLikes" WHERE "JobId" = $1', [jobId]);
      
      // Delete all saves for this job
      console.log(`Deleting all saves for job ${jobId}`);
      await db.query('DELETE FROM "SavedJobs" WHERE "JobId" = $1', [jobId]);
      
      // Finally, delete the job itself
      console.log(`Deleting job ${jobId}`);
      await db.query('DELETE FROM "Jobs" WHERE id = $1', [jobId]);
      
      // Commit the transaction
      await db.query('COMMIT');
      
      return true;
    } catch (error) {
      // If there's an error, rollback the transaction
      await db.query('ROLLBACK');
      console.error('Error in delete job transaction:', error);
      throw error;
    }
  },

  // Get all comments for a job with their replies
  async getComments(jobId) {
    try {
      // First, get all comments for the job
      const commentsResult = await db.query(
        `SELECT c.id, c.content, c."jobId", c."userId", c."createdAt", c."updatedAt",
                u.name as "userName", u."photoURL" as "userPhoto"
         FROM "Comments" c
         JOIN "Users" u ON c."userId" = u.id
         WHERE c."jobId" = $1
         ORDER BY c."createdAt" ASC`,
        [jobId]
      );

      const comments = commentsResult.rows;
      console.log(`Found ${comments.length} comments for job ${jobId}`);

      // For each comment, get its replies
      for (const comment of comments) {
        const repliesResult = await db.query(
          `SELECT r.id, r.content, r."userId", r."commentId", r."createdAt", r."updatedAt",
                  u.name as "userName", u."photoURL" as "userPhoto"
           FROM "Replies" r
           JOIN "Users" u ON r."userId" = u.id
           WHERE r."commentId" = $1
           ORDER BY r."createdAt" ASC`,
          [comment.id]
        );

        // Format the comment and replies to match frontend expectations
        comment.text = comment.content;
        comment.timestamp = new Date(comment.createdAt).getTime();
        comment.replies = repliesResult.rows.map(reply => ({
          ...reply,
          text: reply.content,
          timestamp: new Date(reply.createdAt).getTime()
        }));
      }

      return comments;
    } catch (error) {
      console.error(`Error getting comments for job ${jobId}:`, error);
      return [];
    }
  },
  
  // Add a comment to a job
  async addComment(jobId, commentData) {
    const { content, userId } = commentData;
    const id = uuidv4();
    const now = new Date();

    const result = await db.query(
      `INSERT INTO "Comments" (id, content, "jobId", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, content, "jobId", "userId", "createdAt", "updatedAt"`,
      [id, content, jobId, userId, now, now]
    );

    const comment = result.rows[0];

    // Get user information for the comment
    const userResult = await db.query(
      `SELECT name, "photoURL" FROM "Users" WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      comment.userName = user.name;
      comment.userPhoto = user.photoURL;
    }

    // Format the comment to match frontend expectations
    comment.text = comment.content;
    comment.timestamp = new Date(comment.createdAt).getTime();
    comment.replies = [];

    return comment;
  },
  
  // Add a reply to a comment
  async addReplyToComment(commentId, replyData) {
    const { content, userId } = replyData;
    const id = uuidv4();
    const now = new Date();

    const result = await db.query(
      `INSERT INTO "Replies" (id, content, "userId", "commentId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, content, "userId", "commentId", "createdAt", "updatedAt"`,
      [id, content, userId, commentId, now, now]
    );

    const reply = result.rows[0];

    // Get user information for the reply
    const userResult = await db.query(
      `SELECT name, "photoURL" FROM "Users" WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      reply.userName = user.name;
      reply.userPhoto = user.photoURL;
    }

    // Format the reply to match frontend expectations
    reply.text = reply.content;
    reply.timestamp = new Date(reply.createdAt).getTime();

    return reply;
  },
  
  // New function: Update a comment
  async updateComment(commentId, content) {
    try {
      const now = new Date();
      const result = await db.query(
        `UPDATE "Comments" 
         SET content = $1, "updatedAt" = $2
         WHERE id = $3
         RETURNING id, content, "jobId", "userId", "createdAt", "updatedAt"`,
        [content, now, commentId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const comment = result.rows[0];
      
      // Get user information for the comment
      const userResult = await db.query(
        `SELECT name, "photoURL" FROM "Users" WHERE id = $1`,
        [comment.userId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        comment.userName = user.name;
        comment.userPhoto = user.photoURL;
      }
      
      // Get replies for this comment
      comment.replies = await this.getRepliesForComment(commentId);
      
      return comment;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },
  
  // Get replies for a specific comment
  async getRepliesForComment(commentId) {
    try {
      const repliesResult = await db.query(
        `SELECT r.id, r.content, r."userId", r."commentId", r."createdAt", r."updatedAt",
                u.name as "userName", u."photoURL" as "userPhoto"
         FROM "Replies" r
         JOIN "Users" u ON r."userId" = u.id
         WHERE r."commentId" = $1
         ORDER BY r."createdAt" ASC`,
        [commentId]
      );
      
      // Format the replies to match frontend expectations
      return repliesResult.rows.map(reply => ({
        ...reply,
        text: reply.content,
        timestamp: new Date(reply.createdAt).getTime()
      }));
    } catch (error) {
      console.error(`Error getting replies for comment ${commentId}:`, error);
      return [];
    }
  },
  
  // Delete a comment and all its replies
  async deleteComment(commentId) {
    try {
      // Start a transaction
      await db.query('BEGIN');
      
      // First, delete all replies to this comment
      await db.query('DELETE FROM "Replies" WHERE "commentId" = $1', [commentId]);
      
      // Then, delete the comment itself
      const result = await db.query(
        'DELETE FROM "Comments" WHERE id = $1 RETURNING "jobId"',
        [commentId]
      );
      
      // Commit the transaction
      await db.query('COMMIT');
      
      // Return the jobId if available
      return result.rows.length > 0 ? result.rows[0].jobId : null;
      
    } catch (error) {
      // If there's an error, rollback the transaction
      await db.query('ROLLBACK');
      console.error('Error deleting comment:', error);
      throw error;
    }
  },
  
  // Update a reply
  async updateReply(replyId, content) {
    try {
      const now = new Date();
      const result = await db.query(
        `UPDATE "Replies" 
         SET content = $1, "updatedAt" = $2
         WHERE id = $3
         RETURNING id, content, "userId", "commentId", "createdAt", "updatedAt"`,
        [content, now, replyId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const reply = result.rows[0];
      
      // Get user information for the reply
      const userResult = await db.query(
        `SELECT name, "photoURL" FROM "Users" WHERE id = $1`,
        [reply.userId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        reply.userName = user.name;
        reply.userPhoto = user.photoURL;
      }
      
      // Format the reply to match frontend expectations
      reply.text = reply.content;
      reply.timestamp = new Date(reply.createdAt).getTime();
      
      return reply;
    } catch (error) {
      console.error('Error updating reply:', error);
      throw error;
    }
  },
  
  // Delete a reply
  async deleteReply(replyId) {
    try {
      const result = await db.query(
        'DELETE FROM "Replies" WHERE id = $1 RETURNING "commentId"',
        [replyId]
      );
      
      return result.rows.length > 0 ? result.rows[0].commentId : null;
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  },
  
  // Toggle like status for a job
  async toggleLike(jobId, userId) {
    try {
      // Check if user has already liked this job
      const existingLike = await db.query(
        'SELECT * FROM "JobLikes" WHERE "JobId" = $1 AND "UserId" = $2',
        [jobId, userId]
      );
      
      const now = new Date();
      
      if (existingLike.rows.length > 0) {
        // Unlike the job
        await db.query(
          'DELETE FROM "JobLikes" WHERE "JobId" = $1 AND "UserId" = $2',
          [jobId, userId]
        );
        return { isLiked: false, message: 'Job unliked successfully' };
      } else {
        // Like the job
        await db.query(
          'INSERT INTO "JobLikes" ("JobId", "UserId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4)',
          [jobId, userId, now, now]
        );
        return { isLiked: true, message: 'Job liked successfully' };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  },
  
  // Toggle save status for a job
  async toggleSave(jobId, userId) {
    try {
      // Check if user has already saved this job
      const existingSave = await db.query(
        'SELECT * FROM "SavedJobs" WHERE "JobId" = $1 AND "UserId" = $2',
        [jobId, userId]
      );
      
      const now = new Date();
      
      if (existingSave.rows.length > 0) {
        // Unsave the job
        await db.query(
          'DELETE FROM "SavedJobs" WHERE "JobId" = $1 AND "UserId" = $2',
          [jobId, userId]
        );
        return { isSaved: false, message: 'Job removed from saved list' };
      } else {
        // Save the job
        await db.query(
          'INSERT INTO "SavedJobs" ("JobId", "UserId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4)',
          [jobId, userId, now, now]
        );
        return { isSaved: true, message: 'Job saved successfully' };
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      throw error;
    }
  },
  
  // Get saved jobs for a user
  async getUserSavedJobs(userId) {
    try {
      const result = await db.query(
        `SELECT j.id, j.title, j.description, j.budget, j.category, j.skills, j.status, 
                j."userId", j."createdAt", j."updatedAt", sj."createdAt" as "savedAt"
         FROM "SavedJobs" sj
         JOIN "Jobs" j ON sj."JobId" = j.id
         WHERE sj."UserId" = $1
         ORDER BY sj."createdAt" DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting saved jobs:', error);
      throw error;
    }
  },
  
  // Get liked jobs for a user
  async getUserLikedJobs(userId) {
    try {
      const result = await db.query(
        `SELECT j.id, j.title, j.description, j.budget, j.category, j.skills, j.status, 
                j."userId", j."createdAt", j."updatedAt", jl."createdAt" as "likedAt"
         FROM "JobLikes" jl
         JOIN "Jobs" j ON jl."JobId" = j.id
         WHERE jl."UserId" = $1
         ORDER BY jl."createdAt" DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting liked jobs:', error);
      throw error;
    }
  }
};

module.exports = jobModel;
