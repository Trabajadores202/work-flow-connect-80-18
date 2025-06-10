
const express = require('express');
const jobController = require('../controllers/jobController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new job
router.post('/', jobController.createJob);

// Get all jobs with optional filtering
// Can now filter by userId with ?userId=xxx query parameter
router.get('/', jobController.getAllJobs);

// Get job by ID
router.get('/:jobId', jobController.getJobById);

// Update a job
router.put('/:jobId', jobController.updateJob);

// Delete a job
router.delete('/:jobId', jobController.deleteJob);

// Like/Unlike a job
router.post('/:jobId/like', jobController.toggleLike);

// Save/Unsave a job
router.post('/:jobId/save', jobController.toggleSave);

// Get user's saved jobs
router.get('/user/saved', jobController.getUserSavedJobs);

// Get user's liked jobs
router.get('/user/liked', jobController.getUserLikedJobs);

// Add comment to a job
router.post('/:jobId/comments', jobController.addComment);

// Update a comment
router.put('/comments/:commentId', jobController.updateComment);

// Delete a comment
router.delete('/comments/:commentId', jobController.deleteComment);

// Add reply to a comment
router.post('/:jobId/comments/:commentId/replies', jobController.addReply);

// Update a reply
router.put('/replies/:replyId', jobController.updateReply);

// Delete a reply
router.delete('/replies/:replyId', jobController.deleteReply);

// Add log to verify routes initialization
console.log('Job routes initialized correctly with like and save functionality');

module.exports = router;
