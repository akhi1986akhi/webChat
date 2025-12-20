'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, MoreVertical, Phone, Video, Paperclip, Smile, Check, CheckCheck, Circle, Menu, X, Users, MessageSquare, Settings, LogOut, User } from 'lucide-react';

interface User {
  _id: string;
  fullName: string;
  email: string;
  contact: string;
  isActive: boolean;
  lastSeen: string;
  createdAt: string;
  socketId: string | null;
  unreadCount: number;
  lastMessage: string;
  avatar: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'agent';
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

interface AgentInfo {
  name: string;
  role: string;
  status: string;
  avatar: string;
}

const ChatApplication: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [messageInput, setMessageInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [agentInfo] = useState<AgentInfo>({
    name: "Sarah Anderson",
    role: "Senior Agent",
    status: "online",
    avatar: "SA"
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const [users, setUsers] = useState<User[]>([
    {
      _id: "694638d494dbe986e5b99399",
      fullName: "Akhilesh Kumar",
      email: "akhi1986@hotmail.com",
      contact: "9650082741",
      isActive: false,
      lastSeen: "2025-12-20T06:41:16.483Z",
      createdAt: "2025-12-20T05:49:08.088Z",
      socketId: null,
      unreadCount: 3,
      lastMessage: "I need help with my order",
      avatar: "AK"
    },
    {
      _id: "694632b0274c2d0becf2c91e",
      fullName: "Jone Doe",
      email: "john@example.com",
      contact: "9876543210",
      isActive: false,
      lastSeen: "2025-12-20T06:36:14.259Z",
      createdAt: "2025-12-20T05:22:56.723Z",
      socketId: null,
      unreadCount: 0,
      lastMessage: "Thank you for your help!",
      avatar: "JD"
    }
  ]);


  const fetchUsersFromAPI = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/users');
      const data = await response.json();

      if (data.success && data.users) {
        // Merge API users with existing users
        mergeUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };


  // Merge API users with existing users
  const mergeUsers = (apiUsers: any[]) => {
    setUsers(prevUsers => {
      // Create a map of existing users for quick lookup
      const existingUsersMap = new Map(prevUsers.map(user => [user._id, user]));

      // Process API users and merge with existing data
      const mergedUsers = apiUsers.map(apiUser => {
        const existingUser = existingUsersMap.get(apiUser._id);

        if (existingUser) {
          // User exists, merge properties while preserving chat-specific data
          return {
            ...apiUser, // API data (isActive, lastSeen, etc.)
            unreadCount: existingUser.unreadCount || 0,
            lastMessage: existingUser.lastMessage || "",
            avatar: existingUser.avatar || getInitials(apiUser.fullName),
          };
        } else {
          // New user from API, add chat-specific defaults
          return {
            ...apiUser,
            unreadCount: 0,
            lastMessage: "",
            avatar: getInitials(apiUser.fullName),
          };
        }
      });

      // Add any existing users that aren't in the API response
      // (this handles edge cases where local users might not be in API)
      const existingUsersNotInAPI = prevUsers.filter(
        user => !apiUsers.some(apiUser => apiUser._id === user._id)
      );

      return [...mergedUsers, ...existingUsersNotInAPI];
    });
  };

  // Helper function to get initials from full name
  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsersFromAPI();
  }, []);

  // Optionally, refetch users periodically or on demand
  const refreshUsers = () => {
    fetchUsersFromAPI();
  };



  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser]);

  useEffect(() => {
    // Initialize sample messages
    const sampleMessages: Record<string, Message[]> = {
      "694638d494dbe986e5b99399": [
        { id: 1, text: "Hello, I need help with my order", sender: "user", time: "10:30 AM", status: "read" },
        { id: 2, text: "Hi Akhilesh! I'd be happy to help you. What seems to be the issue?", sender: "agent", time: "10:31 AM", status: "read" },
        { id: 3, text: "I haven't received my package yet", sender: "user", time: "10:32 AM", status: "read" }
      ],
      "694632b0274c2d0becf2c91e": [
        { id: 1, text: "Thank you for your help!", sender: "user", time: "09:15 AM", status: "read" },
        { id: 2, text: "You're welcome! Feel free to reach out if you need anything else.", sender: "agent", time: "09:16 AM", status: "read" }
      ]
    };
    setMessages(sampleMessages);
  }, []);

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedUser) {
      const newMessage: Message = {
        id: Date.now(),
        text: messageInput,
        sender: "agent" as const,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: "sent" as const
      };

      setMessages(prev => ({
        ...prev,
        [selectedUser._id]: [...(prev[selectedUser._id] || []), newMessage]
      }));

      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSeen = (lastSeen: any) => {
    const date: any = new Date(lastSeen);
    const now: any = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-20' : 'w-0'} bg-gradient-to-b from-indigo-600 to-indigo-800 transition-all duration-300 flex-shrink-0 overflow-hidden`}>
        <div className="flex flex-col items-center py-6 space-y-8">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="text-indigo-600" size={24} />
          </div>

          <nav className="flex flex-col space-y-6">
            <button className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center text-white backdrop-blur-sm">
              <MessageSquare size={20} />
            </button>
            <button className="w-12 h-12 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center text-white">
              <Users size={20} />
            </button>
            <button className="w-12 h-12 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center text-white">
              <Settings size={20} />
            </button>
          </nav>

          <div className="flex-1" />

          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
              {agentInfo.avatar}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-indigo-800"></div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-slate-600" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Agent Info */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                {agentInfo.avatar}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{agentInfo.name}</p>
              <p className="text-xs text-slate-500">{agentInfo.role}</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {agentInfo.status}
            </span>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((user) => (
            <div
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${selectedUser?._id === user._id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                }`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    {user.avatar}
                  </div>
                  {user.isActive && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-800 truncate">{user.fullName}</h3>
                    <span className="text-xs text-slate-500">{formatLastSeen(user.lastSeen)}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{user.lastMessage}</p>
                  <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                </div>

                {user.unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {user.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                      {selectedUser.avatar}
                    </div>
                    {selectedUser.isActive && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedUser.fullName}</h2>
                    <p className="text-sm text-slate-500">
                      {selectedUser.isActive ? 'Active now' : `Last seen ${formatLastSeen(selectedUser.lastSeen)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                    <Phone size={20} className="text-slate-600" />
                  </button>
                  <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                    <Video size={20} className="text-slate-600" />
                  </button>
                  <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                    <MoreVertical size={20} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">
              {(messages[selectedUser._id] || []).map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-md ${message.sender === 'agent' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${message.sender === 'agent'
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-sm'
                          : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                        }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                    <div className={`flex items-center space-x-1 mt-1 px-2 ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-slate-400">{message.time}</span>
                      {message.sender === 'agent' && (
                        <span className="text-indigo-600">
                          {message.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="flex items-end space-x-3">
                <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                  <Paperclip size={20} className="text-slate-600" />
                </button>

                <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 focus-within:border-indigo-500 transition-colors">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-slate-800"
                    rows={1}
                  />
                </div>

                <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                  <Smile size={20} className="text-slate-600" />
                </button>

                <button
                  onClick={handleSendMessage}
                  className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MessageSquare size={40} className="text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Chat</h3>
              <p className="text-slate-500">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApplication;