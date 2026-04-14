# Papila - Molecular Flavor Pairing Engine

Papila is a powerful molecular flavor pairing platform that helps chefs and food scientists discover unique ingredient combinations based on their molecular profiles.

## 🚀 Quick Start with Docker

The easiest way to get started is using Docker Compose.

```bash
# Clone the repository
git clone <repository-url>
cd papila

# Start all services
docker compose up -d
```

Once started:
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8080/api/v1](http://localhost:8080/api/v1)
- **Database:** PostgreSQL on port 5432

## 🛠 Project Structure

- `backend/`: Go (Fiber) application handling flavor engine logic and database.
- `frontend/`: Next.js application providing the user interface.
- `docs/`: Project documentation.

## 💻 Manual Setup

### Backend (Go)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```
3. Run the server:
   ```bash
   go run main.go
   ```

### Frontend (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🔌 API Endpoints

- `GET /api/v1/search?q=...` - Search for ingredients.
- `POST /api/v1/analyze` - Analyze a stack of ingredients for pairings.

## 🧪 Database Seeding

To seed the database with molecular data:
```bash
cd backend
go run cmd/seed/main.go
```

## 🐳 Docker Production Build

To build the production images:
```bash
docker compose build
```
