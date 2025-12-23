const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const User = require('./models/User');
// Import database connection
const connectDB = require('./config/db');



// Connect to MongoDB
connectDB();

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users
const activeUsers = new Map(); // socket.id -> user data
let adminSocket = null; // Only one admin for simplicity

// API endpoint for health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', admin: !!adminSocket, users: activeUsers.size });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  // Handle user connection (customer)
  socket.on('user_connect', async (userData) => {
    try {
      const { userId, name, email, contact } = userData;
      console.log("userData", userData);
      // Check if user already exists by email

      const user = await User.findOne({ email: email });
      console.log(user);

      if (user) {

        user.socketId = socket.id;
        await user.save()
      } else {

        const user = new User({
          fullName: name || `User-${socket.id.substring(0, 5)}`,
          email: email.toLowerCase(),
          contact: contact,
          socketId: socket.id,
          isActive: true,
          isAdmin: false
        });

        await user.save();
      }

      // Store user
      activeUsers.set(socket.id, {
        userId: userId || socket.id,
        name: name || `User-${socket.id.substring(0, 5)}`,
        email: email,
        contact: contact,
        socketId: socket.id,
        isAdmin: false
      });

      // Join user to their own room
      socket.join(`user_${socket.id}`);

      // Notify admin about new user
      if (adminSocket) {
        io.to(adminSocket).emit('user_connected', {
          userId: socket.id,
          name: activeUsers.get(socket.id).name,
          timestamp: new Date()
        });
      }

      // Send welcome to user
      socket.emit('connected', {
        message: 'Connected to support. An admin will assist you shortly.',
        userId: socket.id
      });

      // === ADD THIS: Notify all users that admin is online ===
      activeUsers.forEach((user, userId) => {
        if (!user.isAdmin) {
          io.to(userId).emit('admin_status', { online: true });
        }
      });
      // =======================================================

      console.log(`User connected: ${activeUsers.get(socket.id).name}`);

    } catch (error) {
      console.error('User connection error:', error);
    }
  });

  // Handle admin connection
  socket.on('admin_connect', (adminData) => {
    try {
      // Set admin
      adminSocket = socket.id;

      // Store admin
      activeUsers.set(socket.id, {
        userId: 'admin',
        name: adminData?.name || 'Admin',
        socketId: socket.id,
        isAdmin: true
      });

      // Get all connected users
      const users = [];
      activeUsers.forEach((user, id) => {
        if (!user.isAdmin) {
          users.push({
            userId: id,
            name: user.name,
            socketId: id
          });
        }
      });

      // Send connected users to admin
      socket.emit('admin_connected', {
        message: 'Admin connected successfully',
        users: users,
        totalUsers: users.length
      });

      // === ADD THIS: Notify all users that admin is online ===
      activeUsers.forEach((user, userId) => {
        if (!user.isAdmin) {
          io.to(userId).emit('admin_status', { online: true });
        }
      });
      // =======================================================

      console.log(`Admin connected: ${socket.id}`);

    } catch (error) {
      console.error('Admin connection error:', error);
    }
  });

  // Handle user sending message to admin
  socket.on('user_message', (data) => {
    try {
      const user = activeUsers.get(socket.id);
      if (!user || user.isAdmin) return;

      const messageData = {
        from: user.name,
        userId: socket.id,
        message: data.message,
        timestamp: new Date(),
        type: 'user'
      };

      // Send to admin if connected
      if (adminSocket) {
        io.to(adminSocket).emit('new_message', messageData);
      }

      // Also send back to user for confirmation
      socket.emit('message_sent', {
        success: true,
        message: data.message
      });

      console.log(`User ${user.name}: ${data.message}`);

    } catch (error) {
      console.error('User message error:', error);
    }
  });

  // Handle admin sending message to user
  socket.on('admin_message', (data) => {
    try {
      const admin = activeUsers.get(socket.id);
      if (!admin || !admin.isAdmin) return;

      const { userId, message } = data;

      // Check if user exists
      if (!activeUsers.has(userId)) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const messageData = {
        from: 'Admin',
        message: message,
        timestamp: new Date(),
        type: 'admin'
      };

      // Send to specific user
      io.to(userId).emit('admin_reply', messageData);

      // Send confirmation to admin
      socket.emit('message_delivered', {
        to: activeUsers.get(userId).name,
        message: message
      });

      console.log(`Admin to ${activeUsers.get(userId).name}: ${message}`);

    } catch (error) {
      console.error('Admin message error:', error);
    }
  });

  // Handle broadcast from admin to all users
  socket.on('admin_broadcast', (data) => {
    try {
      const admin = activeUsers.get(socket.id);
      if (!admin || !admin.isAdmin) return;

      const messageData = {
        from: 'Admin',
        message: data.message,
        timestamp: new Date(),
        type: 'broadcast'
      };

      // Send to all users except admin
      activeUsers.forEach((user, userId) => {
        if (!user.isAdmin) {
          io.to(userId).emit('admin_reply', messageData);
        }
      });

      socket.emit('broadcast_sent', {
        recipients: activeUsers.size - 1,
        message: data.message
      });

      console.log(`Admin broadcast to ${activeUsers.size - 1} users: ${data.message}`);

    } catch (error) {
      console.error('Broadcast error:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);

    if (user) {
      if (user.isAdmin) {
        // Admin disconnected
        adminSocket = null;
        console.log('Admin disconnected');

        // Notify all users
        activeUsers.forEach((userData, userId) => {
          if (!userData.isAdmin) {
            io.to(userId).emit('admin_status', { online: false });
          }
        });
      } else {
        // User disconnected
        console.log(`User disconnected: ${user.name}`);

        // Notify admin
        if (adminSocket) {
          io.to(adminSocket).emit('user_disconnected', {
            userId: socket.id,
            name: user.name
          });
        }
      }

      // Remove from active users
      activeUsers.delete(socket.id);
    }

    console.log('Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Simplified chat server ready');
});