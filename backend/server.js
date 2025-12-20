const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const mongoose = require('mongoose'); 
// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Message = require('./models/Message');

// Import routes
const authRoutes = require('./routes/auth');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Socket.io configuration with CORS
const io = socketIo(server, {
  cors: {
    origin: "*", // Update this with your frontend URL in production
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Explicitly specify transports
  pingTimeout: 60000, // Increase timeout
  pingInterval: 25000
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// API endpoints for messages
app.get('/api/messages', async (req, res) => {
  try {
    const { room = 'general', limit = 50, skip = 0 } = req.query;
    
    const messages = await Message.find({ room })
      .populate('sender', 'fullName email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
    });
  }
});

app.get('/api/messages/user/:userId', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const messages = await Message.find({ sender: req.params.userId })
      .populate('sender', 'fullName email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user messages',
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Socket.io connection handling
const activeUsers = new Map();
// Reset all users to offline when server starts
async function resetAllUsersToOffline() {
  try {
    await User.updateMany(
      { isActive: true },
      { 
        $set: { 
          isActive: false,
          socketId: null,
          lastSeen: new Date() 
        }
      }
    );
    console.log('All users reset to offline status on server start');
  } catch (error) {
    console.error('Error resetting user statuses:', error);
  }
}

// Call this when your server starts
resetAllUsersToOffline();
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user registration with socket
  socket.on('register', async (userData) => {
    try {
        console.log(userData)
      const { userId } = userData;
      
      if (userId) {
        // Update user with socket ID
        await User.findByIdAndUpdate(userId, {
          socketId: socket.id,
          lastSeen: new Date(),
          isActive: true,
        });

        // Store user in active users map
        activeUsers.set(socket.id, userId);
        
        // Join default room
        socket.join('general');
        
        // Notify others about new user
        socket.broadcast.emit('user_online', { userId });
        
        console.log(`User ${userId} registered with socket ${socket.id}`);
      }
    } catch (error) {
      console.error('Error in user registration:', error);
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { userId, content, room = 'general', type = 'text' } = data;
      
      // Find user
      const user = await User.findById(userId);
      
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Create and save message
      const message = new Message({
        sender: userId,
        senderEmail: user.email,
        content,
        type,
        room,
        timestamp: new Date(),
      });

      await message.save();

      // Populate sender info for emitting
      const messageWithSender = await Message.findById(message._id)
        .populate('sender', 'fullName email');

      // Emit to room
      io.to(room).emit('receive_message', {
        message: messageWithSender,
        room,
      });

      console.log(`Message sent by ${user.fullName} in ${room}: ${content}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { userId, room = 'general', isTyping } = data;
    socket.to(room).emit('user_typing', { userId, isTyping });
  });

  // Handle joining rooms
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  // Handle leaving rooms
  socket.on('leave_room', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      const userId = activeUsers.get(socket.id);
      
      if (userId) {
        // Update user status
        await User.findByIdAndUpdate(userId, {
          socketId: null,
          lastSeen: new Date(),
          isActive: false,
        });

        // Remove from active users
        activeUsers.delete(socket.id);
        
        // Notify others
        socket.broadcast.emit('user_offline', { userId });
        
        console.log(`User ${userId} disconnected`);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
    
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for real-time communication`);
});