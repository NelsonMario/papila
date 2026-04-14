# Papila API Documentation

**Base URL:** `http://localhost:8080/api/v1`

---

## Ingredients API

### Search Ingredients
Find ingredients by name.

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
Get ingredient with its flavor molecules.

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
Calculate optimal pairings for ingredients.

- **URL:** `POST /analyze`
- **Body:**
```json
{ "stack": ["uuid-1", "uuid-2"] }
```
- **Response:**
```json
{
  "status": "success",
  "data": [
    {
      "ingredient_id": "uuid-3",
      "ingredient_name": "Balsamic Vinegar",
      "category": "Condiment",
      "shared_count": 5,
      "jaccard_score": 0.45
    }
  ]
}
```

### Recommend Pairings
Get top pairing recommendations.

- **URL:** `POST /recommend`
- **Body:**
```json
{ "ingredients": ["uuid-1", "uuid-2"], "limit": 5 }
```
- **Response:**
```json
{
  "status": "success",
  "recommendations": [...]
}
```

---

## Flavor Graph API

Graph-based flavor pairing using pgRouting.

### Get Graph Stats
- **URL:** `GET /graph/stats`
- **Response:**
```json
{
  "status": "success",
  "stats": {
    "node_count": 76,
    "edge_count": 215,
    "positive_edges": 140,
    "negative_edges": 75
  }
}
```

### Get Harmony Score
Check if two flavors pair well.

- **URL:** `GET /graph/harmony?a=chocolate&b=vanilla`
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
- **Result values:** `harmonious` (>0.3), `clashing` (<-0.3), `neutral`, `unknown`

### Get Best Pairings
Find flavors that pair well with a note.

- **URL:** `GET /graph/pairings/:note?limit=10`
- **Response:**
```json
{
  "status": "success",
  "note": "chocolate",
  "pairings": [
    { "flavor_note": "vanilla", "harmony_score": 0.95 },
    { "flavor_note": "hazelnut", "harmony_score": 0.93 }
  ]
}
```

### Get Clashing Pairings
Find flavors to avoid.

- **URL:** `GET /graph/clashes/:note?limit=10`
- **Response:**
```json
{
  "status": "success",
  "note": "chocolate",
  "clashes": [
    { "flavor_note": "garlic", "harmony_score": -0.80 },
    { "flavor_note": "fish", "harmony_score": -0.80 }
  ]
}
```

### Find Nearby Flavors (pgRouting)
Find all flavors within a graph distance.

- **URL:** `GET /graph/nearby/:note?distance=2.0`
- **Response:**
```json
{
  "status": "success",
  "note": "chocolate",
  "nearby": [
    { "flavor_name": "vanilla", "distance": 0.05 },
    { "flavor_name": "coffee", "distance": 0.10 }
  ]
}
```

### Find Flavor Path (pgRouting)
Find shortest path between two flavors using Dijkstra.

- **URL:** `GET /graph/path?start=chocolate&end=garlic`
- **Response:**
```json
{
  "status": "success",
  "start": "chocolate",
  "end": "garlic",
  "path": [
    { "seq": 1, "flavor_name": "chocolate", "agg_cost": 0 },
    { "seq": 2, "flavor_name": "vanilla", "agg_cost": 0.05 },
    { "seq": 3, "flavor_name": "cream", "agg_cost": 0.10 }
  ],
  "total_cost": 0.10
}
```

### Find Alternative Paths (pgRouting K-Shortest)
Find K shortest alternative paths.

- **URL:** `GET /graph/paths?start=chocolate&end=lemon&k=3`
- **Response:**
```json
{
  "status": "success",
  "start": "chocolate",
  "end": "lemon",
  "paths": [
    { "path_id": 1, "seq": 1, "flavor_name": "chocolate", "agg_cost": 0 },
    { "path_id": 1, "seq": 2, "flavor_name": "orange", "agg_cost": 0.18 },
    { "path_id": 1, "seq": 3, "flavor_name": "lemon", "agg_cost": 0.30 }
  ]
}
```

### Find Bridging Flavors
Find flavors that bridge two incompatible ones.

- **URL:** `GET /graph/bridge?a=fish&b=chocolate&limit=5`
- **Response:**
```json
{
  "status": "success",
  "note_a": "fish",
  "note_b": "chocolate",
  "bridges": ["lemon", "butter", "cream"]
}
```

### Analyze Flavor Combination
Analyze harmony of multiple flavors together.

- **URL:** `POST /graph/analyze`
- **Body:**
```json
{ "notes": ["chocolate", "vanilla", "garlic"] }
```
- **Response:**
```json
{
  "status": "success",
  "notes": ["chocolate", "vanilla", "garlic"],
  "pair_analyses": [
    { "note_a": "chocolate", "note_b": "vanilla", "harmony_score": 0.95, "result": "harmonious" },
    { "note_a": "chocolate", "note_b": "garlic", "harmony_score": -0.80, "result": "clashing" },
    { "note_a": "vanilla", "note_b": "garlic", "harmony_score": -0.75, "result": "clashing" }
  ],
  "average_score": -0.20,
  "clash_count": 2,
  "overall_result": "problematic"
}
```
- **Overall result:** `harmonious`, `balanced`, `problematic`, `unknown`

---

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Invalid request body or missing parameters |
| 404  | Resource not found |
| 500  | Internal server error |
