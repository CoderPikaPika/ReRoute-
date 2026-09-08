# Local Setup

## 1. Install dependencies

From the repository root:

    npm install

## 2. Configure the backend

Copy backend/.env.example to backend/.env, then supply a strong local JWT_ACCESS_SECRET.

The backend validates configuration on startup. It will stop with a useful error instead of silently running with missing secrets.

## 3. Configure the frontend

Copy frontend/.env.example to frontend/.env. The default API base URL is http://localhost:5000/api/v1.

## 4. Run MongoDB

Use a local MongoDB instance or run:

    docker compose up -d mongodb

## 5. Start development servers

    npm run dev

## 6. Verify

Request http://localhost:5000/api/v1/health. A healthy service returns a standard success envelope.

## Environment safety

Never commit .env files. The committed .env.example files contain placeholders only.
