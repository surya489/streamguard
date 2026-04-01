# StreamGuard Backend

Node.js + Express + MongoDB backend for video upload, sensitivity processing simulation, role-based access, and HTTP range streaming.

## Stack
- Node.js
- Express
- MongoDB + Mongoose
- JWT auth
- Multer upload middleware
- Socket.io for realtime progress

## Setup
1. Install dependencies:
```bash
npm install
```
2. Configure `.env`:
```env
PORT=5000
MONGO_URI=<mongodb-uri>
JWT_SECRET=<long-random-secret>
```
3. Run dev server:
```bash
npm run dev
```

## Scripts
- `npm run dev` start with auto-reload
- `npm run build` compile TypeScript
- `npm run start` run compiled build
- `npm run test` run basic tests

## API Overview
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### User
- `GET /api/user` (ADMIN)
- `PUT /api/user/role` (ADMIN)

### Video
- `POST /api/video/upload` (ADMIN, EDITOR)
- `GET /api/video` (authenticated)
  - query: `status`, `sensitivity`, `search`, `sort`
- `GET /api/video/stream/:id` (authenticated owner/admin)

## Realtime Events (Socket.io)
Authenticated socket joins `user:<userId>` room.

Server emits:
- `video:progress`:
```json
{
  "videoId": "...",
  "status": "UPLOADING|PROCESSING|COMPLETED",
  "progress": 35,
  "sensitivity": "SAFE|FLAGGED|null",
  "updatedAt": "..."
}
```
- `video:completed`

## Notes
- Upload validation allows: `mp4`, `mov`, `mkv`, `webm`
- Max upload size: 200 MB
- Sensitivity analysis is currently simulated in staged updates.
