
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

require('dotenv').config();

const authController = {
  // Register a new user
  async register(req, res) {
    try {
      const { username, email, password, role } = req.body;
      
      // Check if email or username exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
      
      // Create user
      const newUser = await userModel.create({
        username,
        email,
        password,
        role: role || 'client' // Usar el rol proporcionado o client por defecto
      });
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      res.status(201).json({
        success: true,
        user: newUser,
        token
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  
  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Check if user exists
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      // Update user status to online
      await userModel.updateStatus(user.id, 'online');
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      // Don't return password and format user data correctly
      const { password: pass, ...userWithoutPassword } = user;
      const formattedUser = {
        id: userWithoutPassword.id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        photoURL: userWithoutPassword.photoURL,
        bio: userWithoutPassword.bio,
        skills: userWithoutPassword.skills,
        role: userWithoutPassword.role,
        createdAt: userWithoutPassword.createdAt
      };
      
      res.json({
        success: true,
        user: formattedUser,
        token
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  
  // Verify user token
  async verify(req, res) {
    try {
      const user = await userModel.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      res.json({ success: true, user });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = authController;
