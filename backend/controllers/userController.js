
const userModel = require('../models/userModel');

const userController = {
  // Get all users
  async getAllUsers(req, res) {
    try {
      const users = await userModel.findAllExcept(req.user.userId);
      res.json({ success: true, users });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  
  // Get user by ID
  async getUserById(req, res) {
    try {
      const user = await userModel.findById(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, user });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  
  // Update user profile
  async updateProfile(req, res) {
    try {
      const { username, avatar, bio, skills } = req.body;
      
      const updatedUser = await userModel.updateProfile(req.user.userId, {
        username,
        avatar,
        bio,
        skills
      });
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = userController;
