# Task Manager Backend

A TypeScript-based backend API for a task management application using Express, TypeORM, and MongoDB.

## Description

This backend provides RESTful API endpoints for managing tasks, tags, and user authentication. It supports user registration, login, task creation, tagging, and more, with Google OAuth integration for authentication.

## Features

- User authentication with Google OAuth
- Task management (CRUD operations)
- Tag management for organizing tasks
- Session-based authentication
- TypeScript for type safety
- MongoDB with TypeORM for data persistence
- Comprehensive API testing with Jest and Supertest
- Docker support for containerization

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   - `PORT`: Server port (default: 5000)
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
   - `GOOGLE_REDIRECT_URI`: OAuth redirect URI
   - `FRONTEND_REDIRECT_URL`: Frontend callback URL
   - Google OAuth endpoints (usually default values)

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on the port specified in your `.env` file (default: 5000).

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Tests are located in the `tests/` directory and cover API endpoints using Jest and Supertest.

## Docker

Build and run with Docker:
```bash
docker build -t task-manager-backend .
docker run -p 5000:5000 task-manager-backend
```

## Project Structure

```
src/
├── controllers/     # API controllers
├── entity/          # TypeORM entities
├── middleware/      # Express middleware
├── routers/         # Route definitions
├── types/           # TypeScript type definitions
└── index.ts         # Application entry point

tests/               # API tests
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Google OAuth Setup

To enable Google OAuth authentication, follow these steps:

1. **Create a Google Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable the Google Identity API**:
   - In the Cloud Console, go to "APIs & Services" > "Library"
   - Search for "Google Identity" and enable it

3. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (for development)
     - Add your production domain if deploying

4. **Update Environment Variables**:
   - Copy your Client ID and Client Secret from the credentials page
   - Update your `.env` file with the values:
     ```
     GOOGLE_CLIENT_ID=your-actual-client-id
     GOOGLE_CLIENT_SECRET=your-actual-client-secret
     ```

5. **Test the Integration**:
   - Start the server: `npm run dev`
   - Visit `http://localhost:5000/api/auth/google/login` to initiate OAuth
   - Complete the Google login flow

**Note**: The OAuth integration code is already implemented in the backend. You only need to configure the Google Cloud credentials and update the environment variables.