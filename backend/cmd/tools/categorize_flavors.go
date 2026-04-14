package main

import (
	"encoding/csv"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
)

// Main flavor categories based on flavor wheel
var flavorCategories = map[string][]string{
	"Sweet": {
		"sweet", "sugary", "honey", "honeyed", "caramel", "caramellic", "maple", "molasses",
		"vanilla", "vanillin", "chocolate", "cocoa", "butterscotch", "toffee", "candy",
		"sugar", "syrup", "brown sugar", "burnt sugar", "confectionery", "milky", "creamy",
		"cream", "butter", "buttery", "dairy", "lactonic", "custard", "pudding",
	},
	"Fruity": {
		"fruity", "fruit", "apple", "pear", "peach", "apricot", "plum", "cherry", "berry",
		"strawberry", "raspberry", "blackberry", "blueberry", "grape", "raisin", "prune",
		"banana", "tropical", "pineapple", "mango", "papaya", "coconut", "melon", "watermelon",
		"citrus", "lemon", "lime", "orange", "grapefruit", "tangerine", "bergamot",
		"passion fruit", "passionfruit", "kiwi", "fig", "date", "currant", "gooseberry",
		"apple peel", "apple skin", "orange peel", "lemon peel", "zesty", "juicy",
	},
	"Floral": {
		"floral", "flower", "flowery", "rose", "rosy", "jasmine", "jasmin", "violet", "violic",
		"lavender", "geranium", "hibiscus", "lilac", "lily", "orchid", "magnolia",
		"honeysuckle", "chamomile", "chamomillic", "elderflower", "elder", "blossom",
		"perfume", "perfumy", "fragrant", "potpourri", "neroli", "tuberose", "gardenia",
		"hyacinth", "narcissus", "iris", "heliotrope", "mimosa", "acacia",
	},
	"Herbal": {
		"herbal", "herb", "herbaceous", "grassy", "grass", "green", "leafy", "vegetal",
		"vegetable", "tea", "mint", "minty", "spearmint", "peppermint", "menthol",
		"eucalyptus", "camphor", "thyme", "oregano", "basil", "rosemary", "sage",
		"tarragon", "dill", "parsley", "cilantro", "bay", "laurel", "fresh", "hay",
		"alfalfa", "clover", "fern", "moss", "mossy", "weedy", "cut grass",
	},
	"Spicy": {
		"spicy", "spice", "pepper", "peppery", "cinnamon", "cinnamonic", "clove", "nutmeg",
		"allspice", "cardamom", "ginger", "anise", "anisic", "aniseed", "licorice",
		"fennel", "star anise", "cumin", "coriander", "caraway", "curry", "turmeric",
		"mustard", "horseradish", "wasabi", "hot", "warm", "pungent", "sharp",
		"biting", "tingling", "numbing", "sichuan", "szechuan", "chili", "cayenne",
	},
	"Woody": {
		"woody", "wood", "oak", "oaky", "cedar", "cedarwood", "sandalwood", "pine", "piney",
		"resinous", "resin", "turpentine", "bark", "sawdust", "lumber", "timber",
		"balsam", "balsamic", "fir", "spruce", "juniper", "cypress", "birch",
		"mahogany", "teak", "walnut", "chestnut", "hazelnut", "nutty", "nut", "almond",
		"pecan", "cashew", "peanut", "coconut shell", "pencil shavings",
	},
	"Earthy": {
		"earthy", "earth", "soil", "dirt", "muddy", "mushroom", "fungal", "truffle",
		"damp", "musty", "moldy", "mouldy", "cellar", "basement", "cave", "mineral",
		"dusty", "chalky", "loamy", "humus", "compost", "petrichor", "wet earth",
		"graphite", "slate", "stone", "stony", "flint", "flinty", "gravelly",
		"beetroot", "beet", "potato", "root", "tuber", "yam",
	},
	"Roasted": {
		"roasted", "roast", "toasted", "toast", "baked", "burnt", "charred", "smoky",
		"smoke", "smoked", "grilled", "barbecue", "bbq", "caramelized", "browned",
		"coffee", "espresso", "mocha", "malt", "malty", "bready", "bread", "crust",
		"cracker", "biscuit", "cookie", "pastry", "pie crust", "cereal", "grain",
		"popcorn", "corn", "maize", "wheat", "barley", "oat", "rye",
	},
	"Savory": {
		"savory", "savoury", "meaty", "meat", "beef", "beefy", "chicken", "pork",
		"lamb", "game", "gamey", "liver", "organ", "bloody", "blood", "iron",
		"umami", "broth", "bouillon", "stock", "gravy", "soy", "miso", "fermented",
		"yeast", "yeasty", "bacon", "ham", "sausage", "salami", "jerky",
		"aged", "cured", "prosciutto", "fat", "fatty", "oily", "lard", "tallow",
		"animal", "leather", "leathery", "suede",
	},
	"Marine": {
		"marine", "oceanic", "sea", "seaweed", "kelp", "algae", "brine", "briney", "briny",
		"salty", "salt", "saline", "fish", "fishy", "seafood", "shellfish", "oyster",
		"clam", "mussel", "crab", "lobster", "shrimp", "prawn", "anchovy", "sardine",
		"iodine", "iodized", "seashore", "beach", "coastal", "tidal",
	},
}

// Additional category for things that don't fit well
var miscCategories = map[string]string{
	// Acidic/Sour
	"acidic": "Acidic", "acid": "Acidic", "sour": "Acidic", "tart": "Acidic",
	"vinegar": "Acidic", "acetic": "Acidic", "tangy": "Acidic", "sharp": "Spicy",

	// Chemical/Medicinal
	"chemical": "Chemical", "medicinal": "Chemical", "medicine": "Chemical",
	"pharmaceutical": "Chemical", "antiseptic": "Chemical", "phenolic": "Chemical",
	"phenol": "Chemical", "solvent": "Chemical", "alcohol": "Chemical", "alcoholic": "Chemical",
	"ether": "Chemical", "ethereal": "Chemical", "plastic": "Chemical", "rubber": "Chemical",

	// Dairy
	"cheese": "Savory", "cheesy": "Savory", "parmesan": "Savory", "cheddar": "Savory",
	"blue cheese": "Savory", "goat cheese": "Savory", "rancid": "Savory",

	// Sulfurous
	"sulfur": "Savory", "sulfury": "Savory", "sulfurous": "Savory", "onion": "Savory",
	"garlic": "Savory", "leek": "Savory", "shallot": "Savory", "chive": "Savory",
	"cabbage": "Savory", "broccoli": "Savory", "cauliflower": "Savory",
	"egg": "Savory", "eggy": "Savory",

	// Waxy/Fatty
	"waxy": "Woody", "wax": "Woody", "candle": "Woody", "paraffin": "Woody",

	// Tobacco/Leather
	"tobacco": "Roasted", "cigar": "Roasted", "pipe": "Roasted",

	// Fermented
	"wine": "Fruity", "wine_like": "Fruity", "winey": "Fruity", "vinous": "Fruity",
	"beer": "Roasted", "whiskey": "Roasted", "whisky": "Roasted", "rum": "Roasted",
	"brandy": "Fruity", "cognac": "Fruity",
}

func categorize(flavor string) string {
	flavorLower := strings.ToLower(strings.TrimSpace(flavor))

	// Check main categories
	for category, keywords := range flavorCategories {
		for _, keyword := range keywords {
			if flavorLower == keyword || strings.Contains(flavorLower, keyword) {
				return category
			}
		}
	}

	// Check misc mappings
	if cat, ok := miscCategories[flavorLower]; ok {
		return cat
	}

	// Default based on common patterns
	if strings.HasSuffix(flavorLower, "y") || strings.HasSuffix(flavorLower, "ish") {
		// Try to match the root
		root := strings.TrimSuffix(strings.TrimSuffix(flavorLower, "y"), "ish")
		for category, keywords := range flavorCategories {
			for _, keyword := range keywords {
				if strings.HasPrefix(keyword, root) {
					return category
				}
			}
		}
	}

	return "Other"
}

func main() {
	// Read molecules.csv to extract all flavor notes
	file, err := os.Open("internal/dataset/molecules.csv")
	if err != nil {
		fmt.Printf("Error opening molecules.csv: %v\n", err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.LazyQuotes = true
	records, _ := reader.ReadAll()

	flavorCounts := make(map[string]int)
	coOccurrence := make(map[string]map[string]int)
	re := regexp.MustCompile(`'([^']+)'`)

	for i, record := range records {
		if i == 0 || len(record) < 4 {
			continue
		}

		profileStr := record[3]
		matches := re.FindAllStringSubmatch(profileStr, -1)

		var flavors []string
		for _, match := range matches {
			if len(match) > 1 {
				flavor := strings.TrimSpace(strings.ToLower(match[1]))
				if len(flavor) > 1 {
					flavors = append(flavors, flavor)
					flavorCounts[flavor]++
				}
			}
		}

		for i := 0; i < len(flavors); i++ {
			for j := i + 1; j < len(flavors); j++ {
				f1, f2 := flavors[i], flavors[j]
				if f1 > f2 {
					f1, f2 = f2, f1
				}
				if coOccurrence[f1] == nil {
					coOccurrence[f1] = make(map[string]int)
				}
				coOccurrence[f1][f2]++
			}
		}
	}

	// Filter flavors (min 3 occurrences)
	validFlavors := make(map[string]bool)
	for flavor, count := range flavorCounts {
		if count >= 3 {
			validFlavors[flavor] = true
		}
	}

	var flavorList []string
	for flavor := range validFlavors {
		flavorList = append(flavorList, flavor)
	}
	sort.Strings(flavorList)

	// Create flavor_nodes.csv with categories
	nodesFile, _ := os.Create("internal/dataset/flavor_nodes.csv")
	defer nodesFile.Close()
	nodesWriter := csv.NewWriter(nodesFile)
	nodesWriter.Write([]string{"id", "name", "category"})

	flavorToID := make(map[string]int)
	categoryCounts := make(map[string]int)

	for i, flavor := range flavorList {
		id := i + 1
		flavorToID[flavor] = id
		category := categorize(flavor)
		categoryCounts[category]++
		nodesWriter.Write([]string{fmt.Sprintf("%d", id), flavor, category})
	}
	nodesWriter.Flush()

	fmt.Printf("Created %d flavor nodes with categories:\n", len(flavorList))
	for cat, count := range categoryCounts {
		fmt.Printf("  %s: %d\n", cat, count)
	}

	// Create flavor_edges.csv
	edgesFile, _ := os.Create("internal/dataset/flavor_edges.csv")
	defer edgesFile.Close()
	edgesWriter := csv.NewWriter(edgesFile)
	edgesWriter.Write([]string{"id", "source", "target", "co_occurrence", "harmony_score"})

	var edges []struct {
		source, target string
		count          int
	}

	for f1, partners := range coOccurrence {
		if !validFlavors[f1] {
			continue
		}
		for f2, count := range partners {
			if !validFlavors[f2] && count >= 2 {
				edges = append(edges, struct {
					source, target string
					count          int
				}{f1, f2, count})
			}
			if validFlavors[f2] && count >= 2 {
				edges = append(edges, struct {
					source, target string
					count          int
				}{f1, f2, count})
			}
		}
	}

	sort.Slice(edges, func(i, j int) bool {
		return edges[i].count > edges[j].count
	})

	maxCount := 1
	if len(edges) > 0 {
		maxCount = edges[0].count
	}

	edgeID := 1
	for _, edge := range edges {
		sourceID := flavorToID[edge.source]
		targetID := flavorToID[edge.target]
		if sourceID == 0 || targetID == 0 {
			continue
		}
		harmonyScore := float64(edge.count) / float64(maxCount)
		edgesWriter.Write([]string{
			fmt.Sprintf("%d", edgeID),
			fmt.Sprintf("%d", sourceID),
			fmt.Sprintf("%d", targetID),
			fmt.Sprintf("%d", edge.count),
			fmt.Sprintf("%.4f", harmonyScore),
		})
		edgeID++
	}
	edgesWriter.Flush()

	fmt.Printf("\nCreated %d flavor edges\n", edgeID-1)

	// Also create flavor_categories.csv for reference
	catFile, _ := os.Create("internal/dataset/flavor_categories.csv")
	defer catFile.Close()
	catWriter := csv.NewWriter(catFile)
	catWriter.Write([]string{"id", "name", "color", "description"})

	categories := []struct {
		name, color, description string
	}{
		{"Sweet", "#E8B4B8", "Sugary, honeyed, caramel, vanilla flavors"},
		{"Fruity", "#F5A623", "Citrus, berry, tropical, stone fruit flavors"},
		{"Floral", "#D4A5D9", "Rose, jasmine, violet, blossom flavors"},
		{"Herbal", "#7CB342", "Green, grassy, mint, tea flavors"},
		{"Spicy", "#E65100", "Pepper, cinnamon, ginger, warm spice flavors"},
		{"Woody", "#8D6E63", "Oak, cedar, nutty, resinous flavors"},
		{"Earthy", "#795548", "Mushroom, soil, mineral flavors"},
		{"Roasted", "#5D4037", "Coffee, toast, smoky, malt flavors"},
		{"Savory", "#C62828", "Meaty, umami, cheese, fermented flavors"},
		{"Marine", "#0288D1", "Briny, fishy, seaweed flavors"},
		{"Acidic", "#FDD835", "Sour, tangy, vinegar flavors"},
		{"Chemical", "#9E9E9E", "Medicinal, solvent, phenolic flavors"},
		{"Other", "#BDBDBD", "Miscellaneous flavor notes"},
	}

	for i, cat := range categories {
		catWriter.Write([]string{
			fmt.Sprintf("%d", i+1),
			cat.name,
			cat.color,
			cat.description,
		})
	}
	catWriter.Flush()

	fmt.Println("\nCreated flavor_categories.csv with 13 categories")
}
