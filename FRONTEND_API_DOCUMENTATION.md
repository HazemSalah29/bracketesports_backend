# BracketEsports API Documentation for Frontend Integration

## 🚀 **Base URL & Authentication**

```javascript
const API_BASE_URL = 'https://your-backend-domain.com/api';

// Authorization Header Required for Protected Routes
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 📋 **Complete API Endpoints**

### **🔐 Authentication Routes (`/api/auth`)**

#### **POST /api/auth/register**

Register a new user

```javascript
// Request Body
{
  "username": "string (3-30 chars, letters/numbers/underscore)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)",
  "firstName": "string",
  "lastName": "string"
}

// Response
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token"
  }
}
```

#### **POST /api/auth/login**

User login

```javascript
// Request Body
{
  "email": "string",
  "password": "string"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token"
  }
}
```

#### **GET /api/auth/me** 🔒

Get current user profile (requires auth)

```javascript
// Response
{
  "success": true,
  "data": {
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string|null",
      "accountType": "normal|creator",
      "isVerified": "boolean",
      "gamingAccounts": [],
      "teams": [],
      "creatorProfile": "object|null"
    }
  }
}
```

#### **PUT /api/auth/change-password** 🔒

Change user password

```javascript
// Request Body
{
  "currentPassword": "string",
  "newPassword": "string (min 6 chars)"
}
```

#### **POST /api/auth/logout** 🔒

Logout user

#### **POST /api/auth/verify-token** 🔒

Verify JWT token validity

---

### **👤 User Management Routes (`/api/users`)**

#### **GET /api/users/profile** 🔒

Get detailed user profile with populated relationships

#### **PUT /api/users/profile** 🔒

Update user profile

```javascript
// Request Body (all optional)
{
  "firstName": "string",
  "lastName": "string",
  "username": "string (3-30 chars)",
  "avatar": "string (image URL)"
}
```

#### **PUT /api/users/avatar** 🔒

Upload user profile picture

```javascript
// Request Body
{
  "avatar": "string (base64 or URL)"
}
```

#### **GET /api/users/stats** 🔒

Get user statistics and achievements

#### **GET /api/users/search**

Search users by username

```javascript
// Query Params
?q=username&limit=10&page=1
```

#### **GET /api/users/:id**

Get public user profile by ID

#### **DELETE /api/users/account** 🔒

Delete user account permanently

---

### **🎮 Gaming Accounts Routes (`/api/gaming-accounts`)**

#### **POST /api/gaming-accounts** 🔒

Link gaming account (Riot Games)

```javascript
// Request Body
{
  "gameName": "string",
  "tagLine": "string",
  "region": "NA1|EUW1|EUN1|KR|JP1|BR1|LAN|LAS|OCE1|TR1|RU",
  "game": "League of Legends|Valorant|TFT"
}
```

#### **GET /api/gaming-accounts** 🔒

Get user's linked gaming accounts

#### **PUT /api/gaming-accounts/:id/refresh** 🔒

Refresh gaming account data from Riot API

#### **DELETE /api/gaming-accounts/:id** 🔒

Unlink gaming account

---

### **🏆 Tournament Routes (`/api/tournaments`)**

#### **POST /api/tournaments** 🔒 (Creator Only)

Create new tournament

```javascript
// Request Body
{
  "name": "string (max 100 chars)",
  "description": "string (max 500 chars)",
  "game": "League of Legends|Valorant|CS2|Fortnite|Overwatch 2|Dota 2|TFT",
  "gameMode": "string",
  "maxParticipants": "number (20-256)",
  "entryFee": "number (0-50)", // $0 for free tournaments
  "entryFeeCurrency": "USD|EUR|GBP",
  "format": "single-elimination|double-elimination|round-robin|swiss",
  "teamSize": "number (1-10)", // 1 = individual tournament
  "registrationStart": "ISO date",
  "registrationEnd": "ISO date",
  "tournamentStart": "ISO date",
  "prizePool": {
    "total": "number",
    "distribution": [
      {
        "position": "number",
        "amount": "number",
        "percentage": "number"
      }
    ]
  }
}
```

#### **GET /api/tournaments**

Get tournaments list with filters

```javascript
// Query Params
?page=1&limit=10&game=League%20of%20Legends&status=registration&entryFee=free&teamSize=1
```

#### **GET /api/tournaments/:id**

Get tournament details by ID

#### **POST /api/tournaments/:id/join** 🔒

Join tournament (individual or team)

```javascript
// Request Body (for team tournaments)
{
  "teamId": "string" // Only team captain can join with team
}

// For individual tournaments - no body needed
```

#### **POST /api/tournaments/:id/start** 🔒 (Creator Only)

Start tournament and generate bracket

---

### **👥 Team Management Routes (`/api/teams`)**

#### **POST /api/teams** 🔒

Create new team

```javascript
// Request Body
{
  "name": "string (2-50 chars)",
  "tag": "string (2-8 chars, uppercase)",
  "description": "string (optional)",
  "game": "League of Legends|Valorant|CS2|Fortnite|Overwatch 2|Dota 2|TFT",
  "region": "NA|EU|ASIA|OCE|BR|LAN|LAS|TR|RU|JP|KR",
  "maxMembers": "number (2-10)",
  "logo": "string (image URL, optional)",
  "isPublic": "boolean",
  "requiresApproval": "boolean"
}
```

#### **GET /api/teams**

Get teams list with filters

```javascript
// Query Params
?page=1&limit=10&game=League%20of%20Legends&region=NA&search=team_name
```

#### **GET /api/teams/:id**

Get team details by ID

#### **POST /api/teams/:id/join** 🔒

Join team (request or direct join based on settings)

#### **POST /api/teams/:id/invite** 🔒 (Captain Only)

Invite user to team

```javascript
// Request Body
{
  "userId": "string",
  "role": "member|substitute"
}
```

#### **PUT /api/teams/:id** 🔒 (Captain Only)

Update team details

```javascript
// Request Body (all optional)
{
  "name": "string",
  "description": "string",
  "logo": "string (image URL)",
  "isPublic": "boolean",
  "requiresApproval": "boolean"
}
```

#### **DELETE /api/teams/:id/members/:memberId** 🔒 (Captain Only)

Remove team member

#### **DELETE /api/teams/:id/leave** 🔒

Leave team

---

### **🎯 Creator Routes (`/api/creator`)**

#### **POST /api/creator/apply** 🔒

Apply for creator status

```javascript
// Request Body
{
  "bio": "string (max 500 chars)",
  "experience": "string",
  "socialLinks": {
    "twitch": "string (optional)",
    "youtube": "string (optional)",
    "twitter": "string (optional)",
    "discord": "string (optional)"
  },
  "contentTypes": ["streaming", "tutorials", "tournaments", "coaching"],
  "preferredGames": ["League of Legends", "Valorant", "CS2"],
  "expectedAudience": "string"
}
```

#### **GET /api/creator/profile** 🔒 (Creator Only)

Get creator profile and analytics

#### **PUT /api/creator/profile** 🔒 (Creator Only)

Update creator profile

#### **POST /api/creator/:id/follow** 🔒

Follow a creator

#### **DELETE /api/creator/:id/follow** 🔒

Unfollow a creator

#### **GET /api/creator/discover**

Discover popular creators

```javascript
// Query Params
?game=League%20of%20Legends&limit=10&sort=followers
```

#### **GET /api/creator/:id**

Get public creator profile

#### **GET /api/creator/dashboard/analytics** 🔒 (Creator Only)

Get creator analytics dashboard

#### **POST /api/creator/tournament/quick-create** 🔒 (Creator Only)

Quick tournament creation with templates

---

### **🪙 Virtual Currency Routes (`/api/coins`)**

#### **GET /api/coins/packages**

Get available coin packages

```javascript
// Response
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "starter",
        "coins": 500,
        "bonus": 50,
        "price": 4.99,
        "currency": "USD",
        "popular": false
      },
      {
        "id": "popular",
        "coins": 1000,
        "bonus": 150,
        "price": 9.99,
        "currency": "USD",
        "popular": true
      }
    ]
  }
}
```

#### **POST /api/coins/purchase** 🔒

Purchase coin package via Stripe

```javascript
// Request Body
{
  "packageId": "string",
  "paymentMethodId": "string" // Stripe payment method ID
}
```

#### **POST /api/coins/stripe/webhook**

Stripe webhook for payment processing (backend only)

#### **GET /api/coins/balance** 🔒

Get user's current coin balance

#### **POST /api/coins/spend** 🔒

Spend coins for tournament entry or features

```javascript
// Request Body
{
  "amount": "number",
  "purpose": "tournament_entry|cosmetic|feature",
  "tournamentId": "string (optional)",
  "description": "string"
}
```

#### **POST /api/coins/refund** 🔒

Request coin refund (tournament cancellation)

```javascript
// Request Body
{
  "transactionId": "string",
  "reason": "string"
}
```

#### **GET /api/coins/transactions** 🔒

Get user's coin transaction history

#### **GET /api/coins/exchange-rate**

Get current coin to USD exchange rate (always $0.01)

#### **GET /api/coins/policy-compliance**

Get coin system compliance information

#### **POST /api/coins/validate-transaction** 🔒

Validate transaction for compliance

---

### **🌐 Riot API Proxy Routes (`/api/riot-api`)**

#### **POST /api/riot-api/verify-account** 🔒

Verify Riot Games account

```javascript
// Request Body
{
  "gameName": "string",
  "tagLine": "string",
  "region": "string"
}
```

#### **GET /api/riot-api/player/:puuid** 🔒

Get player profile by PUUID

#### **GET /api/riot-api/matches/:puuid** 🔒

Get player match history

```javascript
// Query Params
?start=0&count=20&queue=ranked
```

#### **GET /api/riot-api/stats/:puuid** 🔒

Get player statistics and rankings

#### **GET /api/riot-api/compliance-status** 🔒

Get Riot API compliance status

---

### **📰 News & Updates Routes (`/api/news`)**

#### **GET /api/news**

Get esports news feed

```javascript
// Query Params
?page=1&limit=10&category=tournaments&game=League%20of%20Legends
```

#### **GET /api/news/categories**

Get available news categories

#### **GET /api/news/:id**

Get specific news article

#### **POST /api/news/refresh** 🔒

Refresh news feed (triggers fetch from external sources)

#### **GET /api/news/trending/topics**

Get trending topics and hashtags

---

### **🛡️ Compliance & Monitoring Routes (`/api/compliance`)**

#### **POST /api/compliance/report-violation** 🔒

Report compliance violation

```javascript
// Request Body
{
  "type": "tournament_policy|user_behavior|content|other",
  "description": "string",
  "evidenceUrl": "string (optional)",
  "reportedUserId": "string (optional)",
  "tournamentId": "string (optional)"
}
```

#### **GET /api/compliance/audit-log** 🔒 (Admin Only)

Get compliance audit log

#### **GET /api/compliance/dashboard** 🔒 (Admin Only)

Get compliance dashboard metrics

#### **POST /api/compliance/run-audit** 🔒 (Admin Only)

Trigger manual compliance audit

#### **PUT /api/compliance/update-settings** 🔒 (Admin Only)

Update compliance monitoring settings

---

## 🚀 **Frontend Integration Examples**

### **Authentication Flow**

```javascript
// Login
const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.data.token);
    return data.data.user;
  }
  throw new Error(data.message);
};

// Protected API calls
const getProfile = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
```

### **Tournament Creation (Free Tournament)**

```javascript
const createFreeTournament = async (tournamentData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/tournaments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...tournamentData,
      entryFee: 0, // Free tournament
    }),
  });
  return response.json();
};
```

### **Team Creation with Logo**

```javascript
const createTeam = async (teamData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: teamData.name,
      tag: teamData.tag,
      game: teamData.game,
      region: teamData.region,
      maxMembers: teamData.maxMembers,
      logo: teamData.logoUrl, // Image URL after upload
      isPublic: true,
      requiresApproval: false,
    }),
  });
  return response.json();
};
```

### **Join Tournament (Team Captain)**

```javascript
const joinTournamentWithTeam = async (tournamentId, teamId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${API_BASE_URL}/tournaments/${tournamentId}/join`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamId }), // Team captain joins with team
    }
  );
  return response.json();
};

// Individual tournament join
const joinIndividualTournament = async (tournamentId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${API_BASE_URL}/tournaments/${tournamentId}/join`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      // No body needed for individual tournaments
    }
  );
  return response.json();
};
```

---

## 📝 **Key Features for Frontend Implementation**

### **1. Free Tournament Support**

- Set `entryFee: 0` when creating tournaments
- Filter tournaments by `entryFee=free` in listings
- Show "FREE" badges in UI for zero-cost tournaments

### **2. Individual vs Team Tournaments**

- Check `teamSize` field: 1 = individual, >1 = team-based
- Show appropriate join buttons based on tournament type
- For team tournaments, only show join option to team captains

### **3. Profile & Team Customization**

- Implement image upload for user avatars (`PUT /users/avatar`)
- Support team logo upload during team creation
- Show visual indicators for customized profiles/teams

### **4. Team Captain Functionality**

- Check user's role in team (captain/member/substitute)
- Only allow captains to join tournaments with teams
- Provide team management UI for captains

### **5. Real-time Features**

- WebSocket support for live tournament updates
- Real-time notifications for team invites, tournament updates
- Live bracket updates during tournaments

---

## 🔒 **Authentication Notes**

- All protected routes require `Authorization: Bearer {token}` header
- JWT tokens are valid for 7 days by default
- Use `/auth/verify-token` to check token validity before API calls
- Implement automatic token refresh or re-login on expiration

---

## 📊 **Response Format**

All API responses follow this consistent format:

```javascript
// Success Response
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors array (optional) */ ]
}
```

---

_Last Updated: July 15, 2025_
_API Version: 2.0.0_
