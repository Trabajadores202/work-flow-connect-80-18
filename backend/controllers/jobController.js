
const jobModel = require('../models/jobModel');
const userModel = require('../models/userModel');
const db = require('../config/database');

const jobController = {
  // Create a new job
  async createJob(req, res) {
    try {
      const { title, description, budget, category, skills } = req.body;
      const userId = req.user.userId;
      
      console.log('Creating job with data:', { title, description, budget, category, skills, userId });
      
      // Validate required fields
      if (!title || !description || !budget || !category) {
        console.error('Missing required fields:', { title, description, budget, category });
        return res.status(400).json({
          success: false,
          message: 'Missing required fields (title, description, budget, category)'
        });
      }
      
      // Create the job
      const job = await jobModel.create({
        title,
        description,
        budget: parseFloat(budget),
        category,
        skills: Array.isArray(skills) ? skills : [],
        userId
      });
      
      console.log('Job created successfully:', job);
      
      // Get user info for the response
      const user = await userModel.findById(userId);
      
      const jobWithUser = {
        ...job,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      return res.status(201).json({
        success: true,
        message: 'Job created successfully',
        job: jobWithUser
      });
      
    } catch (error) {
      console.error('Error creating job:', error);
      
      // Proporcionar un mensaje más descriptivo basado en el error
      let errorMessage = 'Error creating job';
      if (error.code === '23502') { // Error de restricción de no nulo
        errorMessage = `Required field "${error.column}" cannot be null`;
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
        details: error.detail || null,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },
  
  // Get all jobs with filters
  async getAllJobs(req, res) {
    try {
      const { category, search, status, userId } = req.query;
      
      const filter = {};
      
      // Filter by category
      if (category) {
        filter.category = category;
      }
      
      // Filter by status
      if (status) {
        filter.status = status;
      }
      
      // Filter by userId (new filter)
      if (userId) {
        filter.userId = userId;
      }
      
      // Search by title or description (simplified for PostgreSQL)
      if (search) {
        filter.search = search;
      }
      
      const jobs = await jobModel.findAll(filter);
      
      // Get user info for each job
      const jobsWithUserInfo = await Promise.all(jobs.map(async (job) => {
        const user = await userModel.findById(job.userId);
        return {
          ...job,
          userName: user ? user.name : 'Usuario desconocido',
          userPhoto: user ? user.avatar : null
        };
      }));
      
      return res.status(200).json({
        success: true,
        jobs: jobsWithUserInfo
      });
      
    } catch (error) {
      console.error('Error getting jobs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting jobs',
        error: error.message
      });
    }
  },
  
  // Get job by ID
  async getJobById(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      
      console.log(`Getting job by ID: ${jobId} for user: ${userId}`);
      
      const job = await jobModel.findById(jobId, userId);
      
      if (!job) {
        console.error(`Job with ID ${jobId} not found`);
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Get user info
      const user = await userModel.findById(job.userId);
      
      const jobWithUser = {
        ...job,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      console.log(`Job found: ${job.id}, title: ${job.title}`);
      
      return res.status(200).json({
        success: true,
        job: jobWithUser
      });
      
    } catch (error) {
      console.error('Error getting job by ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting job',
        error: error.message
      });
    }
  },
  
  // Update a job
  async updateJob(req, res) {
    try {
      const { jobId } = req.params;
      const { title, description, budget, category, skills, status } = req.body;
      const userId = req.user.userId;
      
      console.log('Updating job with data:', { jobId, title, description, budget, category, skills, status, userId });
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Verify user is the owner
      if (job.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit this job'
        });
      }
      
      // Validate status if provided
      const validStatuses = ['open', 'in_progress', 'completed', 'closed'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Valid statuses are: open, in_progress, completed, closed'
        });
      }
      
      // Update job
      const updatedData = {};
      if (title) updatedData.title = title;
      if (description) updatedData.description = description;
      if (budget) updatedData.budget = parseFloat(budget);
      if (category) updatedData.category = category;
      if (skills) updatedData.skills = skills;
      if (status) updatedData.status = status;
      
      const updatedJob = await jobModel.update(jobId, updatedData);
      
      // Get user info for the response
      const user = await userModel.findById(userId);
      
      const jobWithUser = {
        ...updatedJob,
        userName: user ? user.name : 'Usuario desconocido',
        userPhoto: user ? user.avatar : null
      };
      
      console.log('Job updated successfully:', jobWithUser);
      
      return res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        job: jobWithUser
      });
      
    } catch (error) {
      console.error('Error updating job:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating job',
        error: error.message
      });
    }
  },
  
  // Delete a job
  async deleteJob(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      
      console.log(`Attempting to delete job ${jobId} by user ${userId}`);
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Verify user is the owner
      if (job.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this job'
        });
      }
      
      // Delete job and all associated comments/replies in a transaction
      await jobModel.delete(jobId);
      
      console.log(`Job ${jobId} successfully deleted`);
      
      return res.status(200).json({
        success: true,
        message: 'Job deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting job:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting job',
        error: error.message
      });
    }
  },
  
  // Toggle like status for a job
  async toggleLike(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Toggle like status
      const result = await jobModel.toggleLike(jobId, userId);
      
      // Get updated counts
      const updatedJob = await jobModel.findById(jobId, userId);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        isLiked: result.isLiked,
        likesCount: updatedJob.likesCount
      });
      
    } catch (error) {
      console.error('Error toggling like:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating like status',
        error: error.message
      });
    }
  },
  
  // Toggle save status for a job
  async toggleSave(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user.userId;
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Toggle save status
      const result = await jobModel.toggleSave(jobId, userId);
      
      // Get updated counts
      const updatedJob = await jobModel.findById(jobId, userId);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        isSaved: result.isSaved,
        savesCount: updatedJob.savesCount
      });
      
    } catch (error) {
      console.error('Error toggling save:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating save status',
        error: error.message
      });
    }
  },
  
  // Get user's saved jobs
  async getUserSavedJobs(req, res) {
    try {
      const userId = req.user.userId;
      
      const savedJobs = await jobModel.getUserSavedJobs(userId);
      
      // Get user info for each job
      const jobsWithUserInfo = await Promise.all(savedJobs.map(async (job) => {
        const user = await userModel.findById(job.userId);
        return {
          ...job,
          userName: user ? user.name : 'Usuario desconocido',
          userPhoto: user ? user.avatar : null
        };
      }));
      
      return res.status(200).json({
        success: true,
        jobs: jobsWithUserInfo
      });
      
    } catch (error) {
      console.error('Error getting saved jobs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting saved jobs',
        error: error.message
      });
    }
  },
  
  // Get user's liked jobs
  async getUserLikedJobs(req, res) {
    try {
      const userId = req.user.userId;
      
      const likedJobs = await jobModel.getUserLikedJobs(userId);
      
      // Get user info for each job
      const jobsWithUserInfo = await Promise.all(likedJobs.map(async (job) => {
        const user = await userModel.findById(job.userId);
        return {
          ...job,
          userName: user ? user.name : 'Usuario desconocido',
          userPhoto: user ? user.avatar : null
        };
      }));
      
      return res.status(200).json({
        success: true,
        jobs: jobsWithUserInfo
      });
      
    } catch (error) {
      console.error('Error getting liked jobs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting liked jobs',
        error: error.message
      });
    }
  },
  
  // Add comment to a job
  async addComment(req, res) {
    try {
      const { jobId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Comment content is required"
        });
      }
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Add comment to job
      const comment = await jobModel.addComment(jobId, { content, userId });

      console.log("Added comment to database:", comment);
      
      return res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        comment
      });
      
    } catch (error) {
      console.error('Error adding comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Error adding comment',
        error: error.message
      });
    }
  },
  
  // Add reply to a comment
  async addReply(req, res) {
    try {
      const { jobId, commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Reply content is required"
        });
      }
      
      // Check if job exists
      const job = await jobModel.findById(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      // Check if comment exists
      const commentExists = job.comments.some(comment => comment.id === commentId);
      if (!commentExists) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }
      
      // Add reply to comment
      const reply = await jobModel.addReplyToComment(commentId, { content, userId });
      
      console.log("Added reply to database:", reply);
      
      return res.status(201).json({
        success: true,
        message: 'Reply added successfully',
        reply
      });
      
    } catch (error) {
      console.error('Error adding reply:', error);
      return res.status(500).json({
        success: false,
        message: 'Error adding reply',
        error: error.message
      });
    }
  },
  
  // Update a comment
  async updateComment(req, res) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Comment content is required"
        });
      }
      
      // First, check if the comment exists and belongs to the user
      const commentResult = await db.query(
        'SELECT * FROM "Comments" WHERE id = $1',
        [commentId]
      );
      
      if (commentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }
      
      const comment = commentResult.rows[0];
      
      // Verify user is the owner of the comment
      if (comment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this comment'
        });
      }
      
      // Update the comment
      const updatedComment = await jobModel.updateComment(commentId, content);
      
      if (!updatedComment) {
        return res.status(404).json({
          success: false,
          message: 'Failed to update comment'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Comment updated successfully',
        comment: updatedComment
      });
      
    } catch (error) {
      console.error('Error updating comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating comment',
        error: error.message
      });
    }
  },
  
  // Delete a comment
  async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.userId;
      
      console.log(`Attempting to delete comment ${commentId} by user ${userId}`);
      
      // First, check if the comment exists and belongs to the user
      const commentResult = await db.query(
        'SELECT * FROM "Comments" WHERE id = $1',
        [commentId]
      );
      
      if (commentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }
      
      const comment = commentResult.rows[0];
      
      // Verify user is the owner of the comment or the job
      const isCommentOwner = comment.userId === userId;
      
      // If user is not comment owner, check if they are job owner
      let isJobOwner = false;
      if (!isCommentOwner) {
        const jobResult = await db.query(
          'SELECT * FROM "Jobs" WHERE id = $1',
          [comment.jobId]
        );
        
        if (jobResult.rows.length > 0) {
          isJobOwner = jobResult.rows[0].userId === userId;
        }
      }
      
      if (!isCommentOwner && !isJobOwner) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this comment'
        });
      }
      
      // Delete the comment and all its replies
      const jobId = await jobModel.deleteComment(commentId);
      
      console.log(`Comment ${commentId} successfully deleted`);
      
      return res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
        jobId
      });
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting comment',
        error: error.message
      });
    }
  },
  
  // Update a reply
  async updateReply(req, res) {
    try {
      const { replyId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Reply content is required"
        });
      }
      
      // First, check if the reply exists and belongs to the user
      const replyResult = await db.query(
        'SELECT * FROM "Replies" WHERE id = $1',
        [replyId]
      );
      
      if (replyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Reply not found'
        });
      }
      
      const reply = replyResult.rows[0];
      
      // Verify user is the owner of the reply
      if (reply.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this reply'
        });
      }
      
      // Update the reply
      const updatedReply = await jobModel.updateReply(replyId, content);
      
      if (!updatedReply) {
        return res.status(404).json({
          success: false,
          message: 'Failed to update reply'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Reply updated successfully',
        reply: updatedReply
      });
      
    } catch (error) {
      console.error('Error updating reply:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating reply',
        error: error.message
      });
    }
  },
  
  // Delete a reply
  async deleteReply(req, res) {
    try {
      const { replyId } = req.params;
      const userId = req.user.userId;
      
      // First, check if the reply exists and belongs to the user
      const replyResult = await db.query(
        'SELECT * FROM "Replies" WHERE id = $1',
        [replyId]
      );
      
      if (replyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Reply not found'
        });
      }
      
      const reply = replyResult.rows[0];
      
      // Verify user is the owner of the reply
      if (reply.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this reply'
        });
      }
      
      // Delete the reply
      const commentId = await jobModel.deleteReply(replyId);
      
      return res.status(200).json({
        success: true,
        message: 'Reply deleted successfully',
        commentId
      });
      
    } catch (error) {
      console.error('Error deleting reply:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting reply',
        error: error.message
      });
    }
  }
};

module.exports = jobController;
