'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MoreVertical, Users, MessageSquare, LogOut } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  isActive: boolean;
  socketId: string;
  unreadCount: number;
  lastMessage: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'admin';
  time: string;
}

const AdminChat: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [messageInput, setMessageInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('connect', () => {
      console.log('Admin connected');
      setIsConnected(true);
      
      // Register as admin
      socketRef.current?.emit('admin_connect', {
        name: 'John Doe',
      });
    });

    socketRef.current.on('admin_connected', (data) => {
      console.log('Admin initialized:', data);
      
      // Add users from server
      if (data.users && data.users.length > 0) {
        setUsers(data.users.map((user: any) => ({
          id: user.userId,
          name: user.name,
          isActive: true,
          socketId: user.socketId,
          unreadCount: 0,
          lastMessage: ''
        })));
      }

      
    });

    socketRef.current.on('user_connected', (data) => {
      console.log('New user connected:', data);
      
      // Add new user
      setUsers(prev => [...prev, {
        id: data.userId,
        name: data.name,
        isActive: true,
        socketId: data.userId,
        unreadCount: 0,
        lastMessage: ''
      }]);
    });

    socketRef.current.on('user_disconnected', (data) => {
      console.log('User disconnected:', data);
      
      // Update user status
      setUsers(prev => prev.map(user => 
        user.id === data.userId 
          ? { ...user, isActive: false }
          : user
      ));
    });

    socketRef.current.on('new_message', (data) => {
      console.log('New message from user:', data);
      
      // Create message
      const newMessage: Message = {
        id: Date.now(),
        text: data.message,
        sender: 'user',
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      // Add to messages
      setMessages(prev => ({
        ...prev,
        [data.userId]: [...(prev[data.userId] || []), newMessage]
      }));

      // Update user's last message and increment unread count
      setUsers(prev => prev.map(user => 
        user.id === data.userId 
          ? { 
              ...user, 
              lastMessage: data.message,
              unreadCount: selectedUser?.id === data.userId ? 0 : user.unreadCount + 1
            }
          : user
      ));

      // Scroll if this is selected user
      if (selectedUser?.id === data.userId) {
        setTimeout(scrollToBottom, 100);
      }
    });

    socketRef.current.on('message_delivered', (data) => {
      console.log('Message delivered to:', data.to);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setIsConnected(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    
    // Reset unread count for this user
    setUsers(prev => prev.map(u => 
      u.id === user.id 
        ? { ...u, unreadCount: 0 }
        : u
    ));
  };

  // Send message to user
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedUser || !socketRef.current) return;

    // Send via socket
    socketRef.current.emit('admin_message', {
      userId: selectedUser.id,
      message: messageInput
    });

    // Create local message
    const newMessage: Message = {
      id: Date.now(),
      text: messageInput,
      sender: 'admin',
      time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };

    // Update messages
    setMessages(prev => ({
      ...prev,
      [selectedUser.id]: [...(prev[selectedUser.id] || []), newMessage]
    }));

    // Update user's last message
    setUsers(prev => prev.map(user => 
      user.id === selectedUser.id 
        ? { ...user, lastMessage: messageInput }
        : user
    ));

    // Clear input and scroll
    setMessageInput('');
    setTimeout(scrollToBottom, 100);
  };

  // Broadcast to all users
  const handleBroadcast = () => {
    const broadcastMessage = messageInput.trim();
    if (!broadcastMessage || !socketRef.current) return;

    socketRef.current.emit('admin_broadcast', {
      message: broadcastMessage
    });

    // Add to all user conversations
    setUsers(prev => {
      const updatedUsers = prev.map(user => {
        const newMessage: Message = {
          id: Date.now(),
          text: broadcastMessage,
          sender: 'admin',
          time: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        };

        // Add message to user's conversation
        setMessages(prevMsgs => ({
          ...prevMsgs,
          [user.id]: [...(prevMsgs[user.id] || []), newMessage]
        }));

        return { ...user, lastMessage: broadcastMessage };
      });

      return updatedUsers;
    });

    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">Admin Chat</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedUser?.id === user.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      {user.isActive && (
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{user.name}</h3>
                      <p className="text-sm text-gray-500 truncate w-40">
                        {user.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                  {user.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {user.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Users className="mx-auto mb-2 text-gray-300" size={24} />
              <p>No users connected</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <p>Connected: {users.filter(u => u.isActive).length}</p>
            <p>Total: {users.length}</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedUser.name.charAt(0)}
                    </div>
                    {selectedUser.isActive && (
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">{selectedUser.name}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedUser.isActive ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {(messages[selectedUser.id] || []).map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.sender === 'admin' ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block max-w-xs px-4 py-2 rounded-lg ${
                      message.sender === 'admin'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                    }`}
                  >
                    <p>{message.text}</p>
                  </div>
                  <div className={`text-xs text-gray-500 mt-1 ${message.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                    {message.time}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end space-x-2">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
                <button
                  onClick={handleBroadcast}
                  disabled={!messageInput.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  title="Send to all users"
                >
                  <MessageSquare size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 text-gray-300" size={48} />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome to Admin Chat</h3>
              <p className="text-gray-500">Select a user to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;