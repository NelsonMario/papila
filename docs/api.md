# Papila API Documentation

**Base URL:** `http://localhost:8080/api/v1`

---

## Ingredient Flavor Analysis API

These endpoints power the main flavor pairing explorer.

### Search Ingredients

Search for ingredients by name with fuzzy matching.

- **URL:** `GET /graph/ingredients/search`
- **Query Parameters:**
  - `q` (string, required) - Search term
  - `limit` (int, optional) - Max results (default: 10)
- **Example:** `/graph/ingredients/search?q=tom&limit=5`
- **Response:**
```json
{
  "status": "success",
  "results": [
    { "name": "tomato", "category": "vegetable" },
    { "name": "tomato juice", "category": "beverage" }
  ]
}
```

### Get Ingredient Flavor Profiles

Get the flavor notes/compounds for an ingredient.

- **URL:** `GET /graph/ingredients/:ingredient/profiles`
- **Example:** `/graph/ingredients/tomato/profiles`
- **Response:**
```json
{
  "status": "success",
  "ingredient": "tomato",
  "profiles": [
    { "flavor_note": "green", "molecule_count": 45 },
    { "flavor_note": "fruity", "molecule_count": 38 },
    { "flavor_note": "sweet", "molecule_count": 32 }
  ]
}
```

### Get Pairing Score

Calculate the pairing compatibility between two ingredients using Jaccard similarity.

- **URL:** `GET /graph/ingredients/pairing`
- **Query Parameters:**
  - `a` (string, required) - First ingredient
  - `b` (string, required) - Second ingredient
- **Example:** `/graph/ingredients/pairing?a=tomato&b=basil`
- **Response:**
```json
{
  "status": "success",
  "ingredient_a": "tomato",
  "ingredient_b": "basil",
  "shared_flavor_notes": ["green", "herbal", "spicy", "earthy"],
  "shared_count": 15,
  "pairing_score": 0.42,
  "result": "good"
}
```

**Pairing Score:** 0.0 to 1.0 (Jaccard similarity of shared flavor notes)

### Get Shared Flavor Profiles

Get flavor notes shared across multiple ingredients.

- **URL:** `POST /graph/ingredients/shared-profiles`
- **Body:**
```json
{
  "ingredients": ["tomato", "basil", "garlic"]
}
```
- **Response:**
```json
{
  "status": "success",
  "profiles": [
    {
      "flavor_note": "green",
      "total_molecules": 120,
      "ingredient_count": 3,
      "ingredient_sources": ["tomato", "basil", "garlic"]
    },
    {
      "flavor_note": "spicy",
      "total_molecules": 85,
      "ingredient_count": 2,
      "ingredient_sources": ["basil", "garlic"]
    }
  ]
}
```

### Get Recommended Pairings

Get ingredient recommendations that pair well with a given ingredient.

- **URL:** `GET /graph/ingredients/:ingredient/recommendations`
- **Query Parameters:**
  - `limit` (int, optional) - Max results (default: 10)
- **Example:** `/graph/ingredients/tomato/recommendations?limit=6`
- **Response:**
```json
{
  "status": "success",
  "ingredient": "tomato",
  "pairings": [
    {
      "ingredient_name": "basil",
      "shared_count": 15,
      "pairing_score": 0.42
    },
    {
      "ingredient_name": "olive oil",
      "shared_count": 12,
      "pairing_score": 0.38
    }
  ]
}
```

### Get Clashing Pairings

Get ingredients that don't pair well with a given ingredient.

- **URL:** `GET /graph/ingredients/:ingredient/clashing`
- **Query Parameters:**
  - `limit` (int, optional) - Max results (default: 10)
- **Response:**
```json
{
  "status": "success",
  "ingredient": "chocolate",
  "pairings": [
    {
      "ingredient_name": "fish",
      "shared_count": 2,
      "pairing_score": 0.03
    }
  ]
}
```

---

## Flavor Wheel API

### Get Flavor Wheel Data

Get all flavor categories with their associated flavor notes for the wheel visualization.

- **URL:** `GET /graph/wheel`
- **Response:**
```json
{
  "status": "success",
  "wheel": [
    {
      "category_name": "Fruity",
      "category_color": "#FF6B6B",
      "flavor_count": 45,
      "flavors": "[{\"id\":1,\"name\":\"apple\"},{\"id\":2,\"name\":\"berry\"}]"
    },
    {
      "category_name": "Spicy",
      "category_color": "#FF8C42",
      "flavor_count": 28,
      "flavors": "[{\"id\":10,\"name\":\"pepper\"},{\"id\":11,\"name\":\"cinnamon\"}]"
    }
  ]
}
```

### Get Flavor Categories

Get list of flavor categories.

- **URL:** `GET /graph/categories`
- **Response:**
```json
{
  "status": "success",
  "categories": [
    { "id": 1, "name": "Fruity", "color": "#FF6B6B" },
    { "id": 2, "name": "Spicy", "color": "#FF8C42" }
  ]
}
```

### Get Flavors by Category

Get all flavor notes in a specific category.

- **URL:** `GET /graph/categories/:category/flavors`
- **Example:** `/graph/categories/fruity/flavors`
- **Response:**
```json
{
  "status": "success",
  "category": "fruity",
  "flavors": [
    { "id": 1, "name": "apple" },
    { "id": 2, "name": "berry" },
    { "id": 3, "name": "citrus" }
  ]
}
```

---

## Legacy Ingredients API

Basic ingredient search and analysis (original endpoints).

### Search Ingredients

- **URL:** `GET /search`
- **Query:** `q` (string) - search term
- **Response:**
```json
{
  "data": [
    { "id": "uuid", "name": "Strawberry", "category": "Fruit" }
  ]
}
```

### Get Ingredient Details

- **URL:** `GET /ingredients/:id`
- **Response:**
```json
{
  "id": "uuid",
  "name": "Strawberry",
  "category": "Fruit",
  "molecules": [
    { "name": "Furaneol", "flavor_description": "sweet, caramel" }
  ]
}
```

### Analyze Pairing Stack

- **URL:** `POST /analyze`
- **Body:**
```json
{ "stack": ["uuid-1", "uuid-2"] }
```

### Recommend Pairings

- **URL:** `POST /recommend`
- **Body:**
```json
{ "ingredients": ["uuid-1", "uuid-2"], "limit": 5 }
```

---

## Flavor Graph API (pgRouting)

Graph-based flavor pairing using PostgreSQL pgRouting extension.

### Get Graph Stats

- **URL:** `GET /graph/stats`
- **Response:**
```json
{
  "status": "success",
  "stats": {
    "node_count": 301,
    "edge_count": 3014
  }
}
```

### Get Harmony Score

Check if two flavor notes pair well.

- **URL:** `GET /graph/harmony`
- **Query:** `a`, `b` - flavor note names
- **Example:** `/graph/harmony?a=chocolate&b=vanilla`
- **Response:**
```json
{
  "status": "success",
  "note_a": "chocolate",
  "note_b": "vanilla",
  "harmony_score": 0.95,
  "result": "harmonious"
}
```

### Get Flavor Pairings

Find flavors that pair well with a note.

- **URL:** `GET /graph/pairings/:note`
- **Query:** `limit` (optional, default: 10)

### Get Flavor Clashes

Find flavors to avoid.

- **URL:** `GET /graph/clashes/:note`

### Find Nearby Flavors

Find all flavors within a graph distance (pgRouting).

- **URL:** `GET /graph/nearby/:note`
- **Query:** `distance` (optional, default: 2.0)

### Find Flavor Path

Find shortest path between two flavors using Dijkstra.

- **URL:** `GET /graph/path`
- **Query:** `start`, `end`

### Find Alternative Paths

Find K shortest alternative paths (pgRouting KSP).

- **URL:** `GET /graph/paths`
- **Query:** `start`, `end`, `k` (number of paths)

### Find Bridging Flavors

Find flavors that bridge two incompatible ones.

- **URL:** `GET /graph/bridge`
- **Query:** `a`, `b`, `limit`

### Analyze Flavor Combination

Analyze harmony of multiple flavors together.

- **URL:** `POST /graph/analyze`
- **Body:**
```json
{ "notes": ["chocolate", "vanilla", "garlic"] }
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "status": "error",
  "message": "Description of what went wrong"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Invalid request (missing params, bad format) |
| 404  | Resource not found |
| 500  | Internal server error |
