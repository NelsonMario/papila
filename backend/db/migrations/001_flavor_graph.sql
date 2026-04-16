-- Flavor Graph Schema for Supabase/PostgreSQL
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgrouting CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Flavor Categories Table (main flavor wheel categories)
CREATE TABLE IF NOT EXISTS flavor_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20),
    description TEXT
);

-- Flavor Nodes Table
CREATE TABLE IF NOT EXISTS flavor_nodes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) REFERENCES flavor_categories(name)
);

CREATE INDEX IF NOT EXISTS idx_flavor_nodes_name ON flavor_nodes(name);
CREATE INDEX IF NOT EXISTS idx_flavor_nodes_name_trgm ON flavor_nodes USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_flavor_nodes_category ON flavor_nodes(category);

-- Flavor Edges Table (pgRouting compatible)
CREATE TABLE IF NOT EXISTS flavor_edges (
    id BIGSERIAL PRIMARY KEY,
    source BIGINT NOT NULL REFERENCES flavor_nodes(id),
    target BIGINT NOT NULL REFERENCES flavor_nodes(id),
    cost DOUBLE PRECISION NOT NULL,
    reverse_cost DOUBLE PRECISION NOT NULL,
    harmony_score DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flavor_edges_source ON flavor_edges(source);
CREATE INDEX IF NOT EXISTS idx_flavor_edges_target ON flavor_edges(target);
CREATE INDEX IF NOT EXISTS idx_flavor_edges_source_target ON flavor_edges(source, target);
CREATE INDEX IF NOT EXISTS idx_flavor_edges_harmony ON flavor_edges(harmony_score);


-- =============================================================================
-- AUTOCOMPLETE FUNCTION
-- =============================================================================

-- Search flavors with fuzzy matching (from flavor_nodes - ingredients)
CREATE OR REPLACE FUNCTION search_flavors(search_term VARCHAR, limit_count INT DEFAULT 10)
RETURNS TABLE (
    id BIGINT,
    name VARCHAR,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fn.id,
        fn.name::VARCHAR,
        similarity(fn.name, search_term)
    FROM flavor_nodes fn
    WHERE fn.name ILIKE '%' || search_term || '%'
       OR similarity(fn.name, search_term) > 0.1
    ORDER BY 
        CASE WHEN fn.name ILIKE search_term || '%' THEN 0 ELSE 1 END,
        similarity(fn.name, search_term) DESC,
        fn.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Search ingredients with fuzzy matching
CREATE OR REPLACE FUNCTION search_ingredients(search_term VARCHAR, limit_count INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    category VARCHAR,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name::VARCHAR,
        i.category::VARCHAR,
        similarity(i.name, search_term)
    FROM ingredients i
    WHERE i.name ILIKE '%' || search_term || '%'
       OR similarity(i.name, search_term) > 0.1
    ORDER BY 
        CASE WHEN i.name ILIKE search_term || '%' THEN 0 ELSE 1 END,
        similarity(i.name, search_term) DESC,
        i.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get flavor profiles for an ingredient (parsed from molecules)
CREATE OR REPLACE FUNCTION get_ingredient_flavor_profiles(ingredient_name VARCHAR)
RETURNS TABLE (
    flavor_note VARCHAR,
    molecule_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH expanded_flavors AS (
        SELECT 
            TRIM(unnest(string_to_array(
                regexp_replace(
                    regexp_replace(m.flavor_description, '[{}'']', '', 'g'),
                    ', ', ',', 'g'
                ), 
                ','
            ))) AS flavor
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        JOIN molecules m ON m.id = im.molecule_id
        WHERE i.name = ingredient_name
          AND m.flavor_description IS NOT NULL 
          AND m.flavor_description != ''
          AND m.flavor_description != '{}'
    )
    SELECT 
        ef.flavor::VARCHAR AS flavor_note,
        COUNT(*)::BIGINT AS molecule_count
    FROM expanded_flavors ef
    WHERE LENGTH(ef.flavor) > 0
    GROUP BY ef.flavor
    ORDER BY molecule_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get shared flavor profiles between multiple ingredients (for chord diagram)
CREATE OR REPLACE FUNCTION get_ingredients_shared_profiles(ingredient_names VARCHAR[])
RETURNS TABLE (
    flavor_note VARCHAR,
    ingredient_sources VARCHAR[],
    total_molecules BIGINT,
    ingredient_count INT
) AS $$
BEGIN
    RETURN QUERY
    WITH ingredient_profiles AS (
        SELECT 
            i.name AS ingredient_name,
            unnest(string_to_array(
                regexp_replace(
                    regexp_replace(m.flavor_description, '[{}'']', '', 'g'),
                    ', ', ',', 'g'
                ), 
                ','
            )) AS flavor,
            COUNT(*) AS mol_count
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        JOIN molecules m ON m.id = im.molecule_id
        WHERE i.name = ANY(ingredient_names)
          AND m.flavor_description IS NOT NULL 
          AND m.flavor_description != ''
          AND m.flavor_description != '{}'
        GROUP BY i.name, flavor
    )
    SELECT 
        TRIM(ip.flavor)::VARCHAR AS flavor_note,
        array_agg(DISTINCT ip.ingredient_name)::VARCHAR[] AS ingredient_sources,
        SUM(ip.mol_count)::BIGINT AS total_molecules,
        COUNT(DISTINCT ip.ingredient_name)::INT AS ingredient_count
    FROM ingredient_profiles ip
    WHERE LENGTH(TRIM(ip.flavor)) > 1
    GROUP BY TRIM(ip.flavor)
    HAVING COUNT(DISTINCT ip.ingredient_name) >= 1
    ORDER BY COUNT(DISTINCT ip.ingredient_name) DESC, SUM(ip.mol_count) DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- QUERY FUNCTIONS
-- =============================================================================

-- Get harmony score between two flavors
CREATE OR REPLACE FUNCTION get_harmony_score(note_a VARCHAR, note_b VARCHAR)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    score DOUBLE PRECISION;
BEGIN
    SELECT e.harmony_score::DOUBLE PRECISION INTO score
    FROM flavor_edges e
    JOIN flavor_nodes a ON a.id = e.source
    JOIN flavor_nodes b ON b.id = e.target
    WHERE (a.name = note_a AND b.name = note_b) 
       OR (a.name = note_b AND b.name = note_a)
    LIMIT 1;
    
    RETURN COALESCE(score, 0);
END;
$$ LANGUAGE plpgsql;

-- Get best pairings for a flavor
CREATE OR REPLACE FUNCTION get_best_pairings(flavor_name VARCHAR, limit_count INT DEFAULT 10)
RETURNS TABLE (
    flavor_note VARCHAR,
    harmony_score DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT DISTINCT ON (paired_name) paired_name::VARCHAR AS flavor_note, score::DOUBLE PRECISION AS harmony_score
        FROM (
            SELECT 
                CASE WHEN a.name = flavor_name THEN b.name ELSE a.name END AS paired_name,
                e.harmony_score AS score
            FROM flavor_edges e
            JOIN flavor_nodes a ON a.id = e.source
            JOIN flavor_nodes b ON b.id = e.target
            WHERE (a.name = flavor_name OR b.name = flavor_name) 
              AND e.harmony_score > 0
        ) sub
        ORDER BY paired_name, score DESC
    ) distinct_results
    ORDER BY harmony_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get clashing pairings to avoid
CREATE OR REPLACE FUNCTION get_clashing_pairings(flavor_name VARCHAR, limit_count INT DEFAULT 10)
RETURNS TABLE (
    flavor_note VARCHAR,
    harmony_score DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT DISTINCT ON (paired_name) paired_name::VARCHAR AS flavor_note, score::DOUBLE PRECISION AS harmony_score
        FROM (
            SELECT 
                CASE WHEN a.name = flavor_name THEN b.name ELSE a.name END AS paired_name,
                e.harmony_score AS score
            FROM flavor_edges e
            JOIN flavor_nodes a ON a.id = e.source
            JOIN flavor_nodes b ON b.id = e.target
            WHERE (a.name = flavor_name OR b.name = flavor_name) 
              AND e.harmony_score < 0
        ) sub
        ORDER BY paired_name, score ASC
    ) distinct_results
    ORDER BY harmony_score ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Find bridging flavors between two incompatible ones
CREATE OR REPLACE FUNCTION find_flavor_bridges(note_a VARCHAR, note_b VARCHAR, limit_count INT DEFAULT 5)
RETURNS TABLE (bridge_flavor VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT c.name::VARCHAR
    FROM flavor_nodes a
    JOIN flavor_edges e1 ON (e1.source = a.id OR e1.target = a.id)
    JOIN flavor_nodes c ON c.id = CASE WHEN e1.source = a.id THEN e1.target ELSE e1.source END
    JOIN flavor_edges e2 ON (e2.source = c.id OR e2.target = c.id)
    JOIN flavor_nodes b ON b.id = CASE WHEN e2.source = c.id THEN e2.target ELSE e2.source END
    WHERE a.name = note_a AND b.name = note_b
      AND e1.harmony_score > 0.3
      AND e2.harmony_score > 0.3
      AND c.name != note_a AND c.name != note_b
    ORDER BY (e1.harmony_score + e2.harmony_score) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get graph statistics
CREATE OR REPLACE FUNCTION get_graph_stats()
RETURNS TABLE (
    node_count BIGINT,
    edge_count BIGINT,
    positive_edges BIGINT,
    negative_edges BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM flavor_nodes),
        (SELECT COUNT(*) FROM flavor_edges),
        (SELECT COUNT(*) FROM flavor_edges WHERE harmony_score > 0),
        (SELECT COUNT(*) FROM flavor_edges WHERE harmony_score < 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- pgROUTING FUNCTIONS
-- =============================================================================

-- Find shortest path between two flavors (Dijkstra)
CREATE OR REPLACE FUNCTION find_flavor_path(start_flavor VARCHAR, end_flavor VARCHAR)
RETURNS TABLE (
    seq INT,
    flavor_name VARCHAR,
    cost DOUBLE PRECISION,
    agg_cost DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.seq::INT,
        n.name::VARCHAR,
        d.cost::DOUBLE PRECISION,
        d.agg_cost::DOUBLE PRECISION
    FROM pgr_dijkstra(
        'SELECT id, source, target, cost, reverse_cost FROM flavor_edges WHERE harmony_score > 0',
        (SELECT id FROM flavor_nodes WHERE name = start_flavor),
        (SELECT id FROM flavor_nodes WHERE name = end_flavor),
        directed := false
    ) d
    JOIN flavor_nodes n ON n.id = d.node
    ORDER BY d.seq;
END;
$$ LANGUAGE plpgsql;

-- Find K shortest paths (alternatives)
CREATE OR REPLACE FUNCTION find_flavor_paths_ksp(
    start_flavor VARCHAR, 
    end_flavor VARCHAR, 
    k INT DEFAULT 3
)
RETURNS TABLE (
    path_id INT,
    seq INT,
    flavor_name VARCHAR,
    agg_cost DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.path_id::INT,
        d.path_seq::INT,
        n.name::VARCHAR,
        d.agg_cost::DOUBLE PRECISION
    FROM pgr_ksp(
        'SELECT id, source, target, cost FROM flavor_edges WHERE harmony_score > 0',
        (SELECT id FROM flavor_nodes WHERE name = start_flavor),
        (SELECT id FROM flavor_nodes WHERE name = end_flavor),
        k,
        directed := false
    ) d
    JOIN flavor_nodes n ON n.id = d.node
    ORDER BY d.path_id, d.path_seq;
END;
$$ LANGUAGE plpgsql;

-- Find all flavors within distance (driving distance)
CREATE OR REPLACE FUNCTION find_flavors_nearby(
    start_flavor VARCHAR,
    max_cost DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
    flavor_name VARCHAR,
    distance DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.name::VARCHAR,
        d.agg_cost::DOUBLE PRECISION
    FROM pgr_drivingDistance(
        'SELECT id, source, target, cost, reverse_cost FROM flavor_edges WHERE harmony_score > 0',
        (SELECT id FROM flavor_nodes WHERE name = start_flavor),
        max_cost,
        directed := false
    ) d
    JOIN flavor_nodes n ON n.id = d.node
    WHERE n.name != start_flavor
    ORDER BY d.agg_cost;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INGREDIENT PAIRING ANALYSIS FUNCTIONS
-- =============================================================================

-- Calculate pairing score between two ingredients based on shared flavor profiles
-- Uses Jaccard similarity: shared_count / union_count (0-1 scale)
CREATE OR REPLACE FUNCTION get_ingredient_pairing_score(ingredient_a VARCHAR, ingredient_b VARCHAR)
RETURNS TABLE (
    shared_flavor_notes VARCHAR[],
    shared_count INT,
    pairing_score DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    WITH profiles_a AS (
        SELECT DISTINCT TRIM(unnest(string_to_array(
            regexp_replace(regexp_replace(m.flavor_description, '[{}'']', '', 'g'), ', ', ',', 'g'), 
            ','
        ))) AS flavor
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        JOIN molecules m ON m.id = im.molecule_id
        WHERE i.name = ingredient_a AND m.flavor_description IS NOT NULL AND m.flavor_description != '{}'
    ),
    profiles_b AS (
        SELECT DISTINCT TRIM(unnest(string_to_array(
            regexp_replace(regexp_replace(m.flavor_description, '[{}'']', '', 'g'), ', ', ',', 'g'), 
            ','
        ))) AS flavor
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        JOIN molecules m ON m.id = im.molecule_id
        WHERE i.name = ingredient_b AND m.flavor_description IS NOT NULL AND m.flavor_description != '{}'
    ),
    filtered_a AS (
        SELECT flavor FROM profiles_a WHERE LENGTH(flavor) > 1
    ),
    filtered_b AS (
        SELECT flavor FROM profiles_b WHERE LENGTH(flavor) > 1
    ),
    shared AS (
        SELECT a.flavor 
        FROM filtered_a a 
        INNER JOIN filtered_b b ON a.flavor = b.flavor
    ),
    union_all AS (
        SELECT flavor FROM filtered_a
        UNION
        SELECT flavor FROM filtered_b
    ),
    result AS (
        SELECT 
            (SELECT array_agg(DISTINCT flavor) FROM shared) AS notes,
            (SELECT COUNT(*) FROM shared) AS s_cnt,
            (SELECT COUNT(*) FROM union_all) AS u_cnt
    )
    SELECT 
        r.notes::VARCHAR[] AS shared_flavor_notes,
        r.s_cnt::INT AS shared_count,
        CASE 
            WHEN r.u_cnt = 0 THEN 0::DOUBLE PRECISION
            ELSE (r.s_cnt::DOUBLE PRECISION / r.u_cnt::DOUBLE PRECISION)
        END AS pairing_score
    FROM result r;
END;
$$ LANGUAGE plpgsql;

-- Get recommended pairings for an ingredient based on flavor overlap
-- Uses a materialized approach to avoid set-returning function issues
CREATE OR REPLACE FUNCTION get_recommended_pairings(target_ingredient VARCHAR, limit_count INT DEFAULT 10)
RETURNS TABLE (
    ingredient_name VARCHAR,
    ingredient_category VARCHAR,
    shared_count INT,
    shared_flavors VARCHAR[],
    shared_molecules INT
) AS $$
BEGIN
    RETURN QUERY
    WITH target_molecules AS (
        SELECT DISTINCT im.molecule_id
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        WHERE i.name = target_ingredient
    ),
    target_flavors AS (
        SELECT DISTINCT TRIM(f.flavor) AS flavor
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        JOIN molecules m ON m.id = im.molecule_id,
        LATERAL unnest(string_to_array(
            regexp_replace(regexp_replace(m.flavor_description, '[{}'']', '', 'g'), ', ', ',', 'g'), 
            ','
        )) AS f(flavor)
        WHERE i.name = target_ingredient 
          AND m.flavor_description IS NOT NULL 
          AND m.flavor_description != '{}'
          AND LENGTH(TRIM(f.flavor)) > 1
    ),
    other_flavors AS (
        SELECT 
            i.name AS ing_name,
            i.category AS ing_category,
            TRIM(f.flavor) AS flavor
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        JOIN molecules m ON m.id = im.molecule_id,
        LATERAL unnest(string_to_array(
            regexp_replace(regexp_replace(m.flavor_description, '[{}'']', '', 'g'), ', ', ',', 'g'), 
            ','
        )) AS f(flavor)
        WHERE i.name != target_ingredient 
          AND m.flavor_description IS NOT NULL 
          AND m.flavor_description != '{}'
          AND LENGTH(TRIM(f.flavor)) > 1
    ),
    shared_with_flavors AS (
        SELECT 
            of.ing_name,
            of.ing_category,
            array_agg(DISTINCT of.flavor ORDER BY of.flavor) AS flavors,
            COUNT(DISTINCT of.flavor) AS shared
        FROM other_flavors of
        WHERE of.flavor IN (SELECT flavor FROM target_flavors)
        GROUP BY of.ing_name, of.ing_category
    ),
    molecule_overlap AS (
        SELECT 
            i.name AS ing_name,
            COUNT(DISTINCT im.molecule_id) AS mol_count
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        WHERE i.name != target_ingredient
          AND im.molecule_id IN (SELECT molecule_id FROM target_molecules)
        GROUP BY i.name
    )
    SELECT 
        swf.ing_name::VARCHAR AS ingredient_name,
        swf.ing_category::VARCHAR AS ingredient_category,
        swf.shared::INT AS shared_count,
        swf.flavors[1:8]::VARCHAR[] AS shared_flavors,
        COALESCE(mo.mol_count, 0)::INT AS shared_molecules
    FROM shared_with_flavors swf
    LEFT JOIN molecule_overlap mo ON mo.ing_name = swf.ing_name
    WHERE swf.shared >= 5
    ORDER BY swf.shared DESC, mo.mol_count DESC NULLS LAST
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get BAD pairings for an ingredient (low flavor overlap = clashing)
CREATE OR REPLACE FUNCTION get_clashing_pairings(target_ingredient VARCHAR, limit_count INT DEFAULT 10)
RETURNS TABLE (
    ingredient_name VARCHAR,
    ingredient_category VARCHAR,
    shared_count INT,
    pairing_score DOUBLE PRECISION
) AS $$
BEGIN
    -- Create temp table with target ingredient's flavors
    CREATE TEMP TABLE IF NOT EXISTS temp_target_flavors_clash (flavor VARCHAR) ON COMMIT DROP;
    TRUNCATE temp_target_flavors_clash;
    
    INSERT INTO temp_target_flavors_clash (flavor)
    SELECT DISTINCT TRIM(f.flavor) AS flavor
    FROM ingredients i
    JOIN ingredient_molecules im ON im.ingredient_id = i.id
    JOIN molecules m ON m.id = im.molecule_id,
    LATERAL unnest(string_to_array(
        regexp_replace(regexp_replace(m.flavor_description, '[{}'']', '', 'g'), ', ', ',', 'g'), 
        ','
    )) AS f(flavor)
    WHERE i.name = target_ingredient 
      AND m.flavor_description IS NOT NULL 
      AND m.flavor_description != '{}'
      AND LENGTH(TRIM(f.flavor)) > 1;
    
    RETURN QUERY
    WITH target_count AS (
        SELECT COUNT(*) AS cnt FROM temp_target_flavors_clash
    ),
    other_flavors AS (
        SELECT 
            i.name AS ing_name,
            i.category AS ing_category,
            TRIM(f.flavor) AS flavor
        FROM ingredients i
        JOIN ingredient_molecules im ON im.ingredient_id = i.id
        JOIN molecules m ON m.id = im.molecule_id,
        LATERAL unnest(string_to_array(
            regexp_replace(regexp_replace(m.flavor_description, '[{}'']', '', 'g'), ', ', ',', 'g'), 
            ','
        )) AS f(flavor)
        WHERE i.name != target_ingredient 
          AND m.flavor_description IS NOT NULL 
          AND m.flavor_description != '{}'
          AND LENGTH(TRIM(f.flavor)) > 1
    ),
    other_counts AS (
        SELECT ing_name, COUNT(DISTINCT flavor) AS total_flavors
        FROM other_flavors
        GROUP BY ing_name
        HAVING COUNT(DISTINCT flavor) >= 10 -- Only include ingredients with enough flavor data
    ),
    shared_calc AS (
        SELECT 
            of.ing_name,
            of.ing_category,
            COUNT(DISTINCT of.flavor) FILTER (
                WHERE EXISTS (SELECT 1 FROM temp_target_flavors_clash t WHERE t.flavor = of.flavor)
            ) AS shared
        FROM other_flavors of
        WHERE of.ing_name IN (SELECT ing_name FROM other_counts)
        GROUP BY of.ing_name, of.ing_category
    )
    SELECT 
        sc.ing_name::VARCHAR AS ingredient_name,
        sc.ing_category::VARCHAR AS ingredient_category,
        sc.shared::INT AS shared_count,
        (sc.shared::DOUBLE PRECISION / GREATEST(
            (SELECT cnt FROM target_count) + oc.total_flavors - sc.shared, 
            1
        ))::DOUBLE PRECISION AS pairing_score
    FROM shared_calc sc
    JOIN other_counts oc ON oc.ing_name = sc.ing_name
    WHERE sc.shared <= 10 -- Low overlap = clashing
    ORDER BY pairing_score ASC, shared ASC -- Lowest score first
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RLS POLICIES (use DO block to handle "already exists" errors)
-- =============================================================================

ALTER TABLE flavor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_edges ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'flavor_categories' AND policyname = 'Public read flavor_categories') THEN
        CREATE POLICY "Public read flavor_categories" ON flavor_categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'flavor_nodes' AND policyname = 'Public read flavor_nodes') THEN
        CREATE POLICY "Public read flavor_nodes" ON flavor_nodes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'flavor_edges' AND policyname = 'Public read flavor_edges') THEN
        CREATE POLICY "Public read flavor_edges" ON flavor_edges FOR SELECT USING (true);
    END IF;
END $$;

-- =============================================================================
-- FLAVOR WHEEL FUNCTIONS
-- =============================================================================

-- Get all flavor categories with their flavor counts
CREATE OR REPLACE FUNCTION get_flavor_wheel_data()
RETURNS TABLE (
    category_name VARCHAR,
    category_color VARCHAR,
    flavor_count BIGINT,
    flavors JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fc.name::VARCHAR AS category_name,
        fc.color::VARCHAR AS category_color,
        COUNT(fn.id)::BIGINT AS flavor_count,
        json_agg(json_build_object(
            'id', fn.id,
            'name', fn.name
        ) ORDER BY fn.name) AS flavors
    FROM flavor_categories fc
    LEFT JOIN flavor_nodes fn ON fn.category = fc.name
    GROUP BY fc.id, fc.name, fc.color
    ORDER BY fc.id;
END;
$$ LANGUAGE plpgsql;

-- Get flavor nodes by category
CREATE OR REPLACE FUNCTION get_flavors_by_category(category_name VARCHAR)
RETURNS TABLE (
    id BIGINT,
    name VARCHAR,
    connection_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fn.id,
        fn.name::VARCHAR,
        (SELECT COUNT(*) FROM flavor_edges fe WHERE fe.source = fn.id OR fe.target = fn.id)::BIGINT AS connection_count
    FROM flavor_nodes fn
    WHERE fn.category = category_name
    ORDER BY connection_count DESC, fn.name;
END;
$$ LANGUAGE plpgsql;
