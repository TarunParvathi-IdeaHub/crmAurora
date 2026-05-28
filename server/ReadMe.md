# AU-ERP Server Documentation

## Overview

This server is a Node.js + Express + TypeScript API using Prisma as ORM for PostgreSQL.

Current implementation focus:

- Authentication with JWT (8-hour token validity)
- Session security using HTTP-only cookies
- Institution CRUD APIs
- Reusable authentication and role-based authorization middleware

---

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Cookie parsing (`cookie-parser`)
- CORS (`cors`)

---

## Project Structure

```text
server/
  prisma/
    schema.prisma
  src/
    config/
      database.ts
    controllers/
      auth.controller.ts
      institution.controller.ts
    middleware/
      auth.middleware.ts
      errorHandler.ts
    routes/
      auth.routes.ts
      institution.routes.ts
    generated/
      prisma/
    index.ts
  package.json
  tsconfig.json
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env` in `server/` and set:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PORT=5000
```

Notes:

- `JWT_SECRET` is mandatory for login/auth middleware.
- `CORS_ORIGIN` must match your frontend origin.

### 3. Generate Prisma client

```bash
npx prisma generate
```

### 4. Run the server

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

---

## Server Bootstrap Flow

The API app starts in `src/index.ts` with this order:

1. Load environment variables (`dotenv.config()`)
2. Apply middleware
3. Register routes
4. Attach global error handler
5. Start listening on configured port

Middleware order is important because routes depend on parsed JSON body and cookies.

---

## API Base Path

- Base: `/api`

### Health API

- `GET /api/health`
- Response:

```json
{
  "status": "OK",
  "message": "AU-ERP CRM Server is running"
}
```

---

## Authentication APIs

Route file: `src/routes/auth.routes.ts`

### `POST /api/auth/login`

Login accepts either `userId` or `email`, and `password`.

#### Request body

```json
{
  "userId": "ADMIN001",
  "password": "crm@123"
}
```

or

```json
{
  "email": "admin@aurora.edu.in",
  "password": "crm@123"
}
```

#### Login logic used

1. Validate credential (`userId` or `email`) and `password`
2. Find user by `userId` OR `email`
3. If user not found -> `404` with `User Doesn't exist`
4. Compare password with `bcrypt.compare`
5. If password mismatch -> `401` with `Password is incorrect`
6. If user is blocked -> `403` with `User is Blocked`
7. If valid:
   - Sign JWT with `8h` expiry
   - Set secure HTTP-only cookies
   - Return user session details

#### Success response

```json
{
  "message": "Login successful",
  "userId": "ADMIN001",
  "email": "admin@aurora.edu.in",
  "role": "ADMIN",
  "isFirstLogin": false
}
```

#### Cookies set on success

- `token`: JWT token (`httpOnly`, `sameSite=strict`, `secure` in production, maxAge 8 hours)
- `session_user`: JSON string containing `userId`, `email`, and `role` with same cookie protections

Both are set as HTTP-only to reduce client-side script access.

---

## Institution APIs

Route file: `src/routes/institution.routes.ts`

### `POST /api/institutions`

Creates a new institution.

Required body fields:

- `institutionName`
- `institutionCode`
- `institutionArea`
- `institutionCity`
- `institutionState`

Logic highlights:

- Validates all required fields as non-empty strings
- Checks duplicate `institutionCode`
- Maps payload fields to Prisma model fields (`name`, `code`, `area`, `city`, `state`)

### `PUT /api/institutions/:institutionCode`

Updates an institution by code.

Logic highlights:

- Validates route param and required body
- Checks if target institution exists
- Prevents duplicate code conflicts when changing code

### `DELETE /api/institutions/:institutionCode`

Deletes an institution by code.

Logic highlights:

- Validates route param
- Checks if institution exists before delete

### `GET /api/institutions`

Returns all institutions in display-friendly format:

```json
{
  "institutions": [
    "AUR001 - Aurora Deemed University",
    "AUR002 - Aurora Degree College"
  ]
}
```

---

## Middleware Documentation

### 1. CORS Middleware

Configured in `src/index.ts`:

- `origin`: from `CORS_ORIGIN` (default `http://localhost:3000`)
- `credentials: true` so cookies are sent by browser

### 2. Body Parser Middleware

- `express.json()` for JSON request bodies
- `express.urlencoded({ extended: true })` for URL-encoded form data

### 3. Cookie Parser Middleware

- `cookieParser()` parses incoming cookie header
- Required for reading JWT from cookie in auth middleware

### 4. Authentication Middleware (`authenticate`)

File: `src/middleware/auth.middleware.ts`

Responsibilities:

- Read token from:
  - `req.cookies.token` (primary)
  - `Authorization: Bearer <token>` (fallback)
- Verify token using `JWT_SECRET`
- Attach decoded user info to `req.user`
- Return:
  - `401 No token provided` when token missing
  - `401 Invalid or expired token` when verification fails

### 5. Role Authorization Middleware (`authorize`)

File: `src/middleware/auth.middleware.ts`

Factory usage:

```ts
router.get('/admin-only', authenticate, authorize('ADMIN'), handler);
```

Responsibilities:

- Allow access only if `req.user.role` is in allowed role list
- Return:
  - `401 Unauthorized` if user context missing
  - `403 Forbidden - Insufficient permissions` if role mismatch

### 6. Global Error Middleware (`errorHandler`)

File: `src/middleware/errorHandler.ts`

Responsibilities:

- Catch unhandled errors passed through `next(error)`
- Return `500 Internal server error`
- Include `detail` message in non-production mode for debugging

---

## Current Security Logic Summary

- Passwords are compared with bcrypt hash (`bcrypt.compare`)
- JWT tokens expire in 8 hours
- Session token is stored in HTTP-only cookie
- `sameSite: strict` and production-only `secure` flag are used
- Role-based access control is implemented via middleware factory
- Global error handler prevents raw crashes from leaking stack traces in production

---

## NPM Scripts

Defined in `package.json`:

- `npm run dev`: generate Prisma client and run server in watch mode
- `npm run build`: compile TypeScript to `dist`
- `npm start`: run compiled server from `dist/index.js`
- `npm run seed`: generate Prisma client and run user seed script

---

## Notes For Contributors

- Keep controller files focused on request validation and response shape.
- Reuse middleware for authentication/authorization rather than repeating checks in every controller.
- For protected APIs, always use middleware in this order:

```ts
router.get('/some-route', authenticate, authorize('ROLE_NAME'), handler);
```

- If Prisma schema changes, run:

```bash
npx prisma generate
```

before building or running.
