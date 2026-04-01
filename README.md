# StreamGuard Backend

## 1. Project Summary
I built this backend using Node.js + Express + MongoDB for the video moderation workflow.
It handles authentication, RBAC authorization, video upload, simulated processing, socket events, and secure streaming.

## 2. Assignment Coverage (Backend + API Support)
- Role-based access control for protected endpoints: Implemented
- Video upload pipeline with status transitions: Implemented
- Realtime processing updates via socket events: Implemented
- Video listing and filtering support: Implemented
- Secure stream endpoint with ownership/admin checks: Implemented

## 3. Tech Stack
- Node.js
- Express
- TypeScript
- MongoDB + Mongoose
- JWT Authentication
- Multer (upload middleware)
- Socket server

## 3.1 What I Used and Why
- Express:
  I used Express to keep route composition simple and modular for auth, user, and video domains.
- TypeScript:
  I used TypeScript to make request/response and model contracts safer and easier to maintain.
- MongoDB + Mongoose:
  I used MongoDB for flexible document modeling and Mongoose for schema validation + query ergonomics.
- JWT:
  I used JWT so authenticated API access remains stateless and scalable.
- Role middleware (RBAC):
  I used protect + authorize middleware to enforce ADMIN/EDITOR/VIEWER permissions clearly.
- Multer:
  I used Multer for controlled video upload validation (size + extension/mime restrictions).
- Socket events:
  I used sockets to push live processing updates and admin activity notifications.

## 4. How It Works
1. I authenticate users with JWT.
2. I authorize routes based on role (`ADMIN`, `EDITOR`, `VIEWER`).
3. Upload endpoint accepts video files and stores them locally in `uploads/`.
4. I create video metadata in database with status `UPLOADING`.
5. I run simulated processing stages and emit realtime socket events.
6. I finalize status as `COMPLETED` and assign sensitivity (`SAFE` / `FLAGGED`).
7. Stream endpoint validates access and serves range-based video chunks.

## 5. Active Storage Mode
Current active mode:
- Local disk storage in `uploads/`

Important note:
- I kept AWS configuration/code in the repository for future use.
- AWS path is not active in current upload/stream controller.

## 6. Environment Variables
Create `.env` in backend root:

```env
PORT=5000
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
```

## 7. Setup and Run
```bash
npm install
npm run dev
```

Backend default URL:
- `http://localhost:5000`

## 8. Build and Start
```bash
npm run build
npm run start
```

## 9. Scripts
- `npm run dev` start dev server with reload
- `npm run build` compile TypeScript
- `npm run start` run compiled build
- `npm run test` build and run tests

## 10. API Endpoints (Explained)
### Auth
- `POST /api/auth/register`
  Creates a new account with hashed password and role-aware defaults.
- `POST /api/auth/login`
  Verifies credentials and returns JWT token for protected access.

### User
- `GET /api/user` (ADMIN)
  Returns user list for admin panel operations.
- `GET /api/user/me` (authenticated)
  Returns current logged-in user profile details.
- `PUT /api/user/profile` (authenticated)
  Updates editable profile fields such as name/email.
- `PUT /api/user/password` (authenticated)
  Validates current password and updates to new password securely.
- `PUT /api/user/role` (ADMIN)
  Allows admin to change target user role with RBAC safeguards.

### Video
- `POST /api/video/upload` (ADMIN, EDITOR)
  Accepts video file upload, creates metadata, starts processing flow, emits realtime events.
- `GET /api/video` (authenticated)
  Returns videos with query support for `status`, `sensitivity`, `search`, `sort`, `all`.
- `GET /api/video/stream/:id` (authenticated owner/admin)
  Streams media with byte-range support for efficient playback and seek.

## 10.1 API Flow
- `/api/auth/login`:
  Entry point to secure session flow; all protected APIs depend on this token.
- `/api/video/upload`:
  The core ingestion point that triggers the moderation lifecycle.
- `/api/video`:
  Powers both analytics-style dashboard summary and searchable/filterable library views.
- `/api/video/stream/:id`:
  Delivers final user value by exposing secure and seekable playback.
- `/api/user/role`:
  Demonstrates practical RBAC control and admin governance.

## 11. Realtime Socket Events
- `video:progress`
- `video:completed`
- `admin:video-uploaded`
- `admin:user-created`
- `admin:user-role-updated`

## 12. Validation Rules
- Allowed formats: `mp4`, `mov`, `mkv`, `webm`
- Max upload size: `200 MB`

## 13. Processing Behavior
- Status flow: `UPLOADING -> PROCESSING -> COMPLETED`
- Sensitivity output: `SAFE` or `FLAGGED`
- Processing is simulated by staged delay + event emission


## 13.1 Sensitivity Output (How It Works and How I Handle It)
- Possible values:
  - `SAFE`
  - `FLAGGED`
- Generation logic:
  - After upload enters processing stages, I finalize sensitivity at completion step.
  - In current implementation, sensitivity is simulated (`SAFE` or `FLAGGED`) to represent moderation output.
- How I expose it:
  - I store sensitivity in video metadata.
  - I include it in API responses from `GET /api/video`.
  - I emit it in realtime payload (`video:progress` / `video:completed`) so frontend updates instantly.
- Why this design helps:
  - Frontend can show immediate moderation outcome without polling.
  - Admin and normal users see consistent status/sensitivity state across pages.

## 14. Testing
- I added backend test file:
  - `src/tests/socket.test.ts`
- Why I created it:
  - I wanted to verify room key generation used by realtime events is stable and predictable.
- What it tests:
  - `userRoom("abc123") -> "user:abc123"`
  - `userRoom("42") -> "user:42"`
- How to run:
  ```bash
  npm run test
  ```
- How this helps me:
  - It protects socket naming contracts from accidental regressions.
  - It improves confidence that event targeting remains correct per user room.
## 15. Troubleshooting
- If upload fails, I check write permission on `uploads/`.
- If DB connection fails, I verify `MONGO_URI`.
- If auth fails, I verify `JWT_SECRET` and token validity.
- If stream fails, I verify video metadata and file presence in `uploads/`.
- If socket events are missing, I verify client token auth and socket connection.



