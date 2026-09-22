# Sample API Service

A minimal REST API service built with Express and TypeScript for testing autonomous agent memory capabilities.

## Quick Start

```bash
npm install
npm run build
npm start
```

## API Endpoints

- `POST /auth/login` - Authenticate user
- `POST /auth/register` - Register new user
- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `GET /health` - Health check

## Architecture

- **REST API** using Express.js
- **TypeScript** with strict mode
- **SQLite** for persistence (not yet implemented)
- **Request logging** middleware
- **JWT authentication** (basic)

## Configuration

Via environment variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_PATH` - SQLite database file
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `CONSOLE_LOGGING` - Enable console output (true/false)

## Testing

```bash
npm test
```

## Known Issues

- Logging to console in production (see middleware/logger.ts)
- User data is mocked in memory (not persisted)
- No proper error handling
- No request validation
