# BracketEsport Backend API

A comprehensive Node.js backend API for an automated esports tournament platform with real-time game integration and creator-fan monetization system.

## Features

- **User Authentication**: Registration, login, JWT-based authentication
- **Gaming Account Integration**: Link and verify Riot Games accounts (League of Legends, Valorant, TFT)
- **Tournament Management**: Create, join, and manage tournaments with real-time bracket updates
- **Team System**: Create teams, invite members, manage team tournaments
- **Creator Program**: Apply for creator status, monetize tournaments, follower system
- **Virtual Currency**: Buy/sell coins, tournament entry fees, creator payouts
- **News Aggregation**: Fetch and display esports news from multiple sources
- **Real-time Updates**: Socket.io for live tournament updates

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Payment Processing**: Stripe
- **External APIs**: Riot Games API, News API
- **Validation**: Express Validator
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## API Endpoints

### Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user
- `PUT /password` - Change password
- `POST /logout` - Logout user
- `POST /verify-token` - Verify JWT token

### Users (`/api/users`)

- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /preferences` - Update user preferences
- `GET /stats` - Get user statistics
- `GET /search` - Search users
- `GET /:id` - Get user by ID
- `DELETE /account` - Delete user account

### Gaming Accounts (`/api/gaming-accounts`)

- `POST /link-riot` - Link Riot Games account
- `GET /` - Get user's gaming accounts
- `PUT /:id/refresh` - Refresh account data
- `DELETE /:id` - Unlink gaming account

### Tournaments (`/api/tournaments`)

- `POST /` - Create tournament (Creator only)
- `GET /` - Get tournaments with filtering
- `GET /:id` - Get tournament by ID
- `POST /:id/join` - Join tournament
- `POST /:id/start` - Start tournament (Creator only)

### Teams (`/api/teams`)

- `POST /` - Create team
- `GET /` - Get teams with filtering
- `GET /:id` - Get team by ID
- `POST /:id/join` - Join team
- `POST /:id/invite` - Invite user to team
- `PUT /:id/members/:memberId` - Update member status
- `DELETE /:id/members/:memberId` - Remove team member
- `DELETE /:id/leave` - Leave team

### Creator Program (`/api/creator`)

- `POST /apply` - Apply for creator program
- `GET /profile` - Get creator profile
- `PUT /profile` - Update creator profile
- `POST /:id/follow` - Follow creator
- `DELETE /:id/follow` - Unfollow creator
- `GET /discover` - Discover creators
- `GET /:id` - Get creator by ID
- `GET /dashboard/analytics` - Get creator analytics
- `POST /:id/rate` - Rate creator

### Virtual Currency (`/api/coins`)

- `GET /packages` - Get coin packages
- `POST /purchase` - Purchase coins
- `POST /webhook` - Stripe webhook
- `GET /balance` - Get coin balance
- `POST /transfer` - Transfer coins
- `POST /redeem` - Redeem coins for USD
- `GET /transactions` - Get transaction history
- `GET /exchange-rate` - Get exchange rates

### News (`/api/news`)

- `GET /` - Get esports news
- `GET /categories` - Get news categories
- `GET /:id` - Get specific article
- `POST /refresh` - Refresh news cache
- `GET /trending/topics` - Get trending topics

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Riot Games API Key
- Stripe Account (for payments)
- News API Key (optional)

### Installation

1. **Clone and setup**:

   ```bash
   git clone <repository-url>
   cd bracketesport_backend
   npm install
   ```

2. **Environment Configuration**:

   ```bash
   cp .env.example .env
   ```

3. **Configure Environment Variables**:
   Edit `.env` file with your configuration:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/bracketesport

   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d

   # Riot Games API
   RIOT_API_KEY=your_riot_api_key_here

   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # News API (optional)
   NEWS_API_KEY=your_news_api_key

   # Virtual Currency
   COIN_TO_USD_RATE=0.01
   PLATFORM_FEE_PERCENTAGE=30

   # Server
   PORT=5000
   NODE_ENV=development
   ```

4. **Start MongoDB**:

   ```bash
   # If using local MongoDB
   mongod

   # Or use MongoDB Atlas connection string in MONGODB_URI
   ```

5. **Run the Application**:

   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

### Getting API Keys

#### Riot Games API Key

1. Go to [Riot Developer Portal](https://developer.riotgames.com/)
2. Sign in with your Riot account
3. Generate a development API key
4. For production, apply for a production API key

#### Stripe Setup

1. Create account at [Stripe](https://stripe.com/)
2. Get your secret key from the dashboard
3. Set up webhook endpoint for payment confirmations
4. Add webhook secret to environment variables

#### News API Key

1. Sign up at [NewsAPI](https://newsapi.org/)
2. Get your free API key
3. Add to environment variables

## Database Models

### User

- Authentication and profile information
- Gaming accounts, teams, tournaments
- Virtual currency balance
- Preferences and statistics

### Tournament

- Tournament details and configuration
- Participant management
- Bracket generation and tracking
- Prize distribution

### Team

- Team information and members
- Invitations and member management
- Tournament participation

### GamingAccount

- Linked gaming platform accounts
- Real-time stats and verification
- Riot Games API integration

### CreatorProfile

- Creator program application and status
- Follower management and analytics
- Earnings and payout tracking

## Real-time Features

The application uses Socket.io for real-time updates:

- **Tournament Updates**: Live bracket progression
- **Match Results**: Instant result verification
- **Participant Notifications**: Join/leave events
- **Creator Analytics**: Real-time follower counts

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Express Validator
- **CORS Configuration**: Cross-origin controls
- **Helmet Security**: HTTP security headers
- **Password Hashing**: bcrypt encryption

## Error Handling

Comprehensive error handling with:

- Custom error middleware
- Validation error formatting
- Database error handling
- API error responses
- Logging with Winston

## Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Environment Variables for Production

- Set `NODE_ENV=production`
- Use production database URL
- Use production API keys
- Configure proper CORS origins
- Set up SSL/HTTPS

## API Documentation

The API follows RESTful conventions with consistent response formats:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors if applicable
  ]
}
```

### Pagination

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "current": 1,
      "total": 10,
      "pages": 5,
      "limit": 20
    }
  }
}
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- Check the API documentation
- Review error messages and logs
- Ensure all environment variables are configured
- Verify database connectivity
- Check API key validity

## Roadmap

- [ ] Add more gaming platform integrations
- [ ] Implement advanced tournament formats
- [ ] Add mobile push notifications
- [ ] Expand creator monetization options
- [ ] Add tournament streaming integration
- [ ] Implement advanced analytics dashboard
