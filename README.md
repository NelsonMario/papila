# Papila - Flavor Pairing Explorer

A molecular flavor pairing platform that helps discover unique ingredient combinations based on shared flavor compounds and molecular profiles.

## Quick Start

```bash
# Clone and start with Docker
git clone <repository-url>
cd papila
docker compose up -d
```

Once running:
- **Web App:** http://localhost:3000
- **API:** http://localhost:8080/api/v1

## Features

- **Ingredient Search** - Find ingredients with fuzzy matching
- **Flavor Profiles** - View molecular flavor compounds for each ingredient
- **Pairing Scores** - Calculate compatibility using Jaccard similarity
- **Recommendations** - Get suggested pairings based on shared flavors
- **Flavor Wheel** - Visualize flavor notes by category
- **Flavor Harmonies** - See shared flavors between ingredients

## Project Structure

```
papila/
├── backend/          # Go (Fiber) API server
│   ├── cmd/          # CLI tools (seed, categorize)
│   ├── db/           # Database migrations
│   ├── internal/     # Application code
│   └── Dockerfile
├── frontend/         # Next.js web application
│   ├── app/          # Pages (/, /explore)
│   ├── components/   # React components
│   ├── lib/          # API client
│   └── Dockerfile
├── docs/             # Documentation
│   └── api.md        # API reference
└── docker-compose.yml
```

## API Reference

Full API documentation: [docs/api.md](docs/api.md)

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/graph/ingredients/search?q=tomato` | Search ingredients |
| `GET /api/v1/graph/ingredients/:name/profiles` | Get flavor profiles |
| `GET /api/v1/graph/ingredients/:name/recommendations` | Get pairing recommendations |
| `GET /api/v1/graph/ingredients/pairing-score?a=tomato&b=basil` | Calculate pairing score |
| `POST /api/v1/graph/ingredients/shared-profiles` | Get shared flavors |
| `GET /api/v1/graph/wheel` | Get flavor wheel categories |

### Example: Get Pairing Score

```bash
curl "http://localhost:8080/api/v1/graph/ingredients/pairing-score?a=tomato&b=basil"
```

Response:
```json
{
  "status": "success",
  "ingredient_a": "tomato",
  "ingredient_b": "basil",
  "shared_flavor_notes": ["green", "herbal", "spicy"],
  "shared_count": 15,
  "pairing_score": 0.42,
  "result": "good"
}
```

## Development

### Backend (Go)

```bash
cd backend
cp .env.example .env  # Configure database
go run main.go
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

### Database Seeding

The database is automatically seeded on first run. To manually reseed:

```bash
cd backend
go run cmd/seed/main.go
```

### Environment Variables

Create `.env` in the root or backend directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=papila
DB_SSLMODE=disable
```

## Tech Stack

- **Backend:** Go, Fiber, GORM, PostgreSQL
- **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion
- **Database:** PostgreSQL with pg_trgm (fuzzy search)
- **Data:** FlavorDB molecular compound data

## License

MIT
