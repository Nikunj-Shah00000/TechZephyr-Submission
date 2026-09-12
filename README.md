# Life RPG

A full-stack gamified productivity web app based on the supplied Life RPG problem statement.

## Stack
- Frontend: React + Vite + CSS
- Backend: Node.js + Express
- Database: SQLite
- Auth: JWT + bcrypt
- API: REST

## Features
- Signup/login with JWT authentication
- User-owned tasks and character data
- Task CRUD
- XP rewards with non-linear leveling
- Streak tracking
- Task attributes: Intellect, Strength, Discipline, Creativity
- Gold economy and virtual shop
- Inventory
- Responsive keyboard-friendly UI
- Optimistic task completion feedback
- SQLite persistence

## Run

### Backend
```bash
cd backend
npm install
cp ../env/.env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp ../env/.env.example .env
npm run dev
```

The frontend expects `VITE_API_URL=http://localhost:4000/api`.

## Production
Use a managed PostgreSQL database instead of SQLite for a deployed multi-instance production environment, configure a strong JWT secret, enable HTTPS, restrict CORS, and deploy frontend/backend separately.

## Deliverables still required by the brief
The supplied PDF requires a public GitHub repository, a publicly accessible live deployment, and a 90–180 second walkthrough video under 100MB. Those external submission artifacts cannot be created solely from the PDF and local code archive.
