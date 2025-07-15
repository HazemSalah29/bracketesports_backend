# BracketEsport Backend API - Frontend Integration Guide

## 🚀 Quick Start

**Base URL**: `http://localhost:5000/api`  
**Authentication**: JWT Bearer token in Authorization header  
**Content-Type**: `application/json`

## 📋 Table of Contents

1. [Authentication Setup](#authentication-setup)
2. [API Reference](#api-reference)
3. [Real-time Integration](#real-time-integration)
4. [Error Handling](#error-handling)
5. [Frontend Code Examples](#frontend-code-examples)
6. [State Management](#state-management)
7. [File Upload Guidelines](#file-upload-guidelines)

---

## 🔐 Authentication Setup

### 1. Axios Configuration

Create an axios instance with interceptors:

```javascript
// api/axiosConfig.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Auth Context Setup

```javascript
// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch (error) {
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, token } = response.data.data;
    
    localStorage.setItem('authToken', token);
    setUser(user);
    
    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { user, token } = response.data.data;
    
    localStorage.setItem('authToken', token);
    setUser(user);
    
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      fetchCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 📚 API Reference

### 🔑 Authentication Endpoints

#### Register User
```javascript
POST /api/auth/register

// Request Body
{
  "username": "player123",
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

// Response
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "username": "player123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "accountType": "normal",
      "coins": 0
    },
    "token": "jwt_token_here"
  }
}
```

#### Login User
```javascript
POST /api/auth/login

// Request Body
{
  "email": "user@example.com",
  "password": "password123"
}

// Response - Same as register
```

#### Get Current User
```javascript
GET /api/auth/me
// Headers: Authorization: Bearer {token}

// Response
{
  "success": true,
  "data": {
    "user": {
      // Full user object with populated relations
    }
  }
}
```

### 🎮 Gaming Account Endpoints

#### Link Riot Games Account
```javascript
POST /api/gaming-accounts/link-riot

// Request Body
{
  "username": "PlayerName",
  "gameTag": "1234",
  "game": "League of Legends", // or "Valorant", "TFT"
  "region": "NA1" // NA1, EUW1, etc.
}

// Response
{
  "success": true,
  "message": "Riot account linked successfully",
  "data": {
    "gamingAccount": {
      "_id": "account_id",
      "platform": "riot",
      "game": "League of Legends",
      "username": "PlayerName",
      "gameTag": "1234",
      "region": "NA1",
      "isVerified": true,
      "stats": {
        "currentRank": {
          "tier": "GOLD",
          "division": "III",
          "lp": 45
        },
        "level": 85,
        "wins": 23,
        "losses": 17,
        "winRate": "57.5"
      }
    }
  }
}
```

#### Get Gaming Accounts
```javascript
GET /api/gaming-accounts

// Response
{
  "success": true,
  "data": {
    "gamingAccounts": [
      // Array of gaming account objects
    ]
  }
}
```

### 🏆 Tournament Endpoints

#### Create Tournament (Creator Only)
```javascript
POST /api/tournaments

// Request Body
{
  "name": "Creator's Weekly Tournament",
  "description": "Weekly League tournament for followers",
  "game": "League of Legends",
  "gameMode": "Summoner's Rift",
  "maxParticipants": 64,
  "entryFee": 50, // coins
  "teamSize": 1, // 1 for solo, 5 for teams
  "format": "single-elimination",
  "registrationStart": "2024-01-15T10:00:00Z",
  "registrationEnd": "2024-01-15T18:00:00Z",
  "tournamentStart": "2024-01-15T20:00:00Z",
  "rules": "Standard tournament rules apply...",
  "prizes": [
    { "position": 1, "percentage": 50 },
    { "position": 2, "percentage": 30 },
    { "position": 3, "percentage": 20 }
  ]
}

// Response
{
  "success": true,
  "message": "Tournament created successfully",
  "data": {
    "tournament": {
      "_id": "tournament_id",
      "name": "Creator's Weekly Tournament",
      "status": "draft",
      "currentParticipants": 0,
      "spotsRemaining": 64,
      "isRegistrationOpen": false,
      // ... other tournament fields
    }
  }
}
```

#### Get Tournaments (with filtering)
```javascript
GET /api/tournaments?page=1&limit=10&game=League%20of%20Legends&status=registration

// Query Parameters
// page: number (default: 1)
// limit: number (default: 10)
// game: string (filter by game)
// status: "draft" | "registration" | "ongoing" | "completed" | "cancelled"
// format: "single-elimination" | "double-elimination" | "round-robin"
// creator: creator_id
// search: string (search in name/description)
// sortBy: "createdAt" | "registrationStart" | "entryFee"
// sortOrder: "asc" | "desc"

// Response
{
  "success": true,
  "data": {
    "tournaments": [
      // Array of tournament objects
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    }
  }
}
```

#### Join Tournament
```javascript
POST /api/tournaments/{tournamentId}/join

// Request Body (for team tournaments)
{
  "teamId": "team_id" // optional for solo tournaments
}

// Response
{
  "success": true,
  "message": "Successfully joined tournament",
  "data": {
    "tournament": {
      // Updated tournament object
    },
    "entryFeePaid": 50,
    "remainingCoins": 950
  }
}
```

### 👥 Team Endpoints

#### Create Team
```javascript
POST /api/teams

// Request Body
{
  "name": "Team Awesome",
  "tag": "AWSM",
  "description": "Competitive League of Legends team",
  "game": "League of Legends",
  "region": "NA",
  "maxMembers": 5,
  "isPublic": true,
  "requiresApproval": true
}

// Response
{
  "success": true,
  "message": "Team created successfully",
  "data": {
    "team": {
      "_id": "team_id",
      "name": "Team Awesome",
      "tag": "AWSM",
      "captain": "user_id",
      "currentMembers": 1,
      "availableSpots": 4,
      // ... other team fields
    }
  }
}
```

#### Get Teams
```javascript
GET /api/teams?game=League%20of%20Legends&region=NA&isRecruiting=true

// Query Parameters
// page, limit, game, region, search, isRecruiting, sortBy, sortOrder

// Response - Similar pagination structure as tournaments
```

#### Join Team
```javascript
POST /api/teams/{teamId}/join

// Response
{
  "success": true,
  "message": "Successfully joined team", // or "Join request sent, awaiting approval"
  "data": {
    "team": {
      // Updated team object
    }
  }
}
```

### 🎨 Creator Program Endpoints

#### Apply for Creator Program
```javascript
POST /api/creator/apply

// Request Body
{
  "displayName": "ProGamer123",
  "bio": "Professional League of Legends player and streamer",
  "specialties": ["League of Legends", "Valorant"],
  "socialLinks": {
    "twitch": "https://twitch.tv/progamer123",
    "youtube": "https://youtube.com/progamer123",
    "twitter": "https://twitter.com/progamer123"
  }
}

// Response
{
  "success": true,
  "message": "Creator application submitted successfully",
  "data": {
    "application": {
      "id": "creator_profile_id",
      "displayName": "ProGamer123",
      "status": "pending",
      "appliedAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

#### Discover Creators
```javascript
GET /api/creator/discover?game=League%20of%20Legends&verified=true

// Query Parameters
// page, limit, game, verified, sortBy (followerCount, createdAt), sortOrder

// Response
{
  "success": true,
  "data": {
    "creators": [
      {
        "_id": "creator_id",
        "displayName": "ProGamer123",
        "followerCount": 1250,
        "specialties": ["League of Legends"],
        "verification": {
          "isVerified": true,
          "verificationLevel": "partner"
        },
        "user": {
          "username": "progamer123",
          "avatar": "avatar_url"
        }
      }
    ],
    "pagination": { /* ... */ }
  }
}
```

#### Follow Creator
```javascript
POST /api/creator/{creatorId}/follow

// Response
{
  "success": true,
  "message": "Successfully followed creator",
  "data": {
    "followerCount": 1251
  }
}
```

### 💰 Virtual Currency Endpoints

#### Get Coin Packages
```javascript
GET /api/coins/packages

// Response
{
  "success": true,
  "data": {
    "packages": [
      {
        "coins": 100,
        "price": 0.99,
        "bonus": 0,
        "popular": false,
        "totalCoins": 100,
        "valuePerCoin": "0.0099",
        "savings": null
      },
      {
        "coins": 1000,
        "price": 9.99,
        "bonus": 150,
        "popular": true,
        "totalCoins": 1150,
        "valuePerCoin": "0.0087",
        "savings": "15% bonus"
      }
    ]
  }
}
```

#### Purchase Coins
```javascript
POST /api/coins/purchase

// Request Body
{
  "packageIndex": 2 // Index from packages array
}

// Response
{
  "success": true,
  "data": {
    "clientSecret": "pi_stripe_client_secret",
    "amount": 9.99,
    "coins": 1000,
    "bonus": 150,
    "totalCoins": 1150
  }
}

// Use clientSecret with Stripe Elements on frontend
```

#### Get Coin Balance
```javascript
GET /api/coins/balance

// Response
{
  "success": true,
  "data": {
    "coins": 1500,
    "usdValue": "15.00"
  }
}
```

### 📰 News Endpoints

#### Get Esports News
```javascript
GET /api/news?category=League%20of%20Legends&limit=20

// Query Parameters
// category: "All" | "Esports" | "League of Legends" | "Valorant" | etc.
// game: string
// limit: number
// page: number
// fresh: boolean (force refresh)

// Response
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "article_id",
        "title": "Worlds 2024 Finals Recap",
        "description": "An amazing finals match...",
        "url": "https://example.com/article",
        "urlToImage": "https://example.com/image.jpg",
        "publishedAt": "2024-01-15T10:00:00Z",
        "source": {
          "name": "Esports News",
          "url": "https://example.com"
        },
        "category": "League of Legends"
      }
    ],
    "pagination": { /* ... */ },
    "cached": false,
    "lastUpdated": "2024-01-15T10:00:00Z"
  }
}
```

---

## ⚡ Real-time Integration

### Socket.io Setup

```javascript
// socket/socketConfig.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  autoConnect: false,
});

export const connectSocket = (token) => {
  socket.auth = { token };
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};

// Tournament-specific events
export const joinTournamentRoom = (tournamentId) => {
  socket.emit('join_tournament', tournamentId);
};

// Listen for tournament updates
export const onTournamentUpdate = (callback) => {
  socket.on('participant_joined', callback);
  socket.on('tournament_started', callback);
  socket.on('match_completed', callback);
  socket.on('bracket_updated', callback);
};

export default socket;
```

### React Hook for Real-time Updates

```javascript
// hooks/useSocket.js
import { useEffect } from 'react';
import { connectSocket, disconnectSocket, onTournamentUpdate } from '../socket/socketConfig';
import { useAuth } from '../contexts/AuthContext';

export const useSocket = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('authToken');
      connectSocket(token);
    }

    return () => {
      disconnectSocket();
    };
  }, [user]);
};

export const useTournamentUpdates = (tournamentId, onUpdate) => {
  useEffect(() => {
    if (tournamentId) {
      joinTournamentRoom(tournamentId);
      onTournamentUpdate(onUpdate);
    }

    return () => {
      // Cleanup listeners
    };
  }, [tournamentId, onUpdate]);
};
```

---

## 🚨 Error Handling

### Standard Error Response Format

```javascript
// Error Response
{
  "success": false,
  "message": "Error description",
  "errors": [ // Optional validation errors
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### Frontend Error Handler

```javascript
// utils/errorHandler.js
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          type: 'validation',
          message: data.message,
          errors: data.errors || []
        };
      case 401:
        return {
          type: 'auth',
          message: 'Please log in to continue'
        };
      case 403:
        return {
          type: 'permission',
          message: data.message || 'Permission denied'
        };
      case 404:
        return {
          type: 'notFound',
          message: data.message || 'Resource not found'
        };
      case 429:
        return {
          type: 'rateLimit',
          message: 'Too many requests. Please try again later.'
        };
      default:
        return {
          type: 'server',
          message: data.message || 'Server error occurred'
        };
    }
  } else if (error.request) {
    // Network error
    return {
      type: 'network',
      message: 'Network error. Please check your connection.'
    };
  } else {
    // Other error
    return {
      type: 'unknown',
      message: 'An unexpected error occurred'
    };
  }
};
```

---

## 💻 Frontend Code Examples

### Complete Login Component

```javascript
// components/LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleApiError } from '../utils/errorHandler';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(formData.email, formData.password);
      // Redirect to dashboard
    } catch (error) {
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Tournament List Component

```javascript
// components/TournamentList.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const TournamentList = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    game: '',
    status: '',
    page: 1
  });

  useEffect(() => {
    fetchTournaments();
  }, [filters]);

  const fetchTournaments = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await api.get(`/tournaments?${params}`);
      setTournaments(response.data.data.tournaments);
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournamentId) => {
    try {
      const response = await api.post(`/tournaments/${tournamentId}/join`);
      // Update UI or refetch tournaments
      fetchTournaments();
      alert('Successfully joined tournament!');
    } catch (error) {
      const errorInfo = handleApiError(error);
      alert(errorInfo.message);
    }
  };

  return (
    <div>
      <div className="filters">
        <select 
          value={filters.game}
          onChange={(e) => setFilters({...filters, game: e.target.value})}
        >
          <option value="">All Games</option>
          <option value="League of Legends">League of Legends</option>
          <option value="Valorant">Valorant</option>
          <option value="CS2">CS2</option>
        </select>
        
        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Status</option>
          <option value="registration">Registration Open</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div>Loading tournaments...</div>
      ) : (
        <div className="tournament-grid">
          {tournaments.map(tournament => (
            <div key={tournament._id} className="tournament-card">
              <h3>{tournament.name}</h3>
              <p>Game: {tournament.game}</p>
              <p>Entry Fee: {tournament.entryFee} coins</p>
              <p>Participants: {tournament.currentParticipants}/{tournament.maxParticipants}</p>
              <p>Status: {tournament.status}</p>
              
              {tournament.isRegistrationOpen && (
                <button onClick={() => joinTournament(tournament._id)}>
                  Join Tournament
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Gaming Account Link Component

```javascript
// components/LinkRiotAccount.jsx
import React, { useState } from 'react';
import api from '../api/axiosConfig';

const LinkRiotAccount = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    gameTag: '',
    game: 'League of Legends',
    region: 'NA1'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/gaming-accounts/link-riot', formData);
      onSuccess(response.data.data.gamingAccount);
      setFormData({ username: '', gameTag: '', game: 'League of Legends', region: 'NA1' });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to link account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Riot Username"
        value={formData.username}
        onChange={(e) => setFormData({...formData, username: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Tag Line (e.g., 1234)"
        value={formData.gameTag}
        onChange={(e) => setFormData({...formData, gameTag: e.target.value})}
        required
      />
      <select
        value={formData.game}
        onChange={(e) => setFormData({...formData, game: e.target.value})}
      >
        <option value="League of Legends">League of Legends</option>
        <option value="Valorant">Valorant</option>
        <option value="TFT">Teamfight Tactics</option>
      </select>
      <select
        value={formData.region}
        onChange={(e) => setFormData({...formData, region: e.target.value})}
      >
        <option value="NA1">North America</option>
        <option value="EUW1">Europe West</option>
        <option value="EUN1">Europe Nordic & East</option>
        <option value="KR">Korea</option>
        <option value="JP1">Japan</option>
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Linking...' : 'Link Account'}
      </button>
    </form>
  );
};
```

---

## 🗂 State Management

### Redux Toolkit Setup (Optional)

```javascript
// store/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axiosConfig';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('authToken', response.data.data.token);
      return response.data.data.user;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('authToken');
      state.user = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

---

## 📁 File Upload Guidelines

### Profile Picture Upload

```javascript
// components/ProfilePictureUpload.jsx
import React, { useState } from 'react';

const ProfilePictureUpload = () => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/users/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Handle success
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};
```

---

## 🔧 Environment Variables for Frontend

Create a `.env` file in your frontend project:

```bash
# Frontend .env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

---

## 🚀 Quick Integration Checklist

### ✅ Initial Setup
- [ ] Install axios: `npm install axios`
- [ ] Install socket.io-client: `npm install socket.io-client`
- [ ] Create axios configuration with interceptors
- [ ] Set up authentication context/state management
- [ ] Configure environment variables

### ✅ Authentication Flow
- [ ] Implement login/register forms
- [ ] Set up protected routes
- [ ] Handle token storage and refresh
- [ ] Add logout functionality

### ✅ Core Features
- [ ] Tournament browsing and joining
- [ ] Gaming account linking
- [ ] Team creation and management
- [ ] Creator program integration
- [ ] Coin purchase flow with Stripe
- [ ] Real-time updates with Socket.io

### ✅ User Experience
- [ ] Error handling and user feedback
- [ ] Loading states for async operations
- [ ] Form validation
- [ ] Responsive design
- [ ] Real-time notifications

---

## 🆘 Common Issues & Solutions

### Issue: CORS Error
**Solution**: Make sure backend has proper CORS configuration for your frontend URL

### Issue: 401 Unauthorized
**Solution**: Check if JWT token is being sent in Authorization header

### Issue: Socket.io Connection Failed
**Solution**: Verify socket.io server URL and authentication

### Issue: Payment Integration
**Solution**: Ensure Stripe publishable key is correct and test mode is enabled

---

## 📞 Support

If you encounter any issues:
1. Check the backend logs for detailed error messages
2. Verify all environment variables are configured
3. Ensure the backend server is running on http://localhost:5000
4. Test API endpoints with Postman first
5. Check browser network tab for failed requests

Remember to handle all async operations with proper loading states and error handling for the best user experience!
