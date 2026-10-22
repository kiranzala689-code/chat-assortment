# Chat Application Assessment

A full-stack real-time chat application built with React (Vite), Node.js, Express, MongoDB, Socket.IO, and JWT authentication.

## Features
- Register and login with JWT
- User list and one-to-one conversations
- Real-time messages with Socket.IO
- Persistent message history in MongoDB
- Responsive two-panel chat UI
- Basic input validation and protected API routes

## Requirements
- Node.js 18+
- MongoDB local or MongoDB Atlas
- npm

## 1. Backend setup
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.

```bash
npm run dev
```
Backend runs at `http://localhost:5000`.

## 2. Frontend setup
Open another terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Environment
See `server/.env.example`. Never commit your real `.env` file.

## Assessment walkthrough
1. Register two accounts in separate browser sessions.
2. Sign in as one account and select the other user.
3. Send messages; the recipient should see new messages in real time.
4. Refresh the page to verify message history is loaded from MongoDB.

## Notes
This is an assessment starter project, not a production-hardened service. Before production, add rate limiting, stronger validation, refresh-token/session strategy, logging, tests, and deployment-specific CORS settings.
