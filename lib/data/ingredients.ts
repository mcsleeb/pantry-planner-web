import type { Ingredient } from '../types'

// The catalog of things you can buy. Package sizes matter A LOT for waste
// calculation — a recipe needing 1/2 onion still means buying a whole onion.
// These are typical US grocery store sizes; tune for your area.
//
// `density` (g/ml) is set on ingredients where recipes commonly mix volume
// and weight units (a recipe says "1 cup flour"; the catalog package is in lb;
// we need density to do the math). Values are standard cooking densities
// rounded to 2 decimals — accurate enough for grocery rounding.

export const INGREDIENTS: Record<string, Ingredient> = {
  // PRODUCE
  'yellow-onion': { id: 'yellow-onion', name: 'Yellow onion', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'red-onion': { id: 'red-onion', name: 'Red onion', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'garlic': { id: 'garlic', name: 'Garlic', aisle: 'produce', packageSize: 10, packageUnit: 'clove', packageLabel: '1 head (~10 cloves)' },
  'lemon': { id: 'lemon', name: 'Lemon', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'lime': { id: 'lime', name: 'Lime', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'tomato': { id: 'tomato', name: 'Tomato', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'cherry-tomato': { id: 'cherry-tomato', name: 'Cherry tomatoes', aisle: 'produce', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb pint' },
  'spinach': { id: 'spinach', name: 'Baby spinach', aisle: 'produce', packageSize: 5, packageUnit: 'oz', packageLabel: '5 oz bag' },
  'kale': { id: 'kale', name: 'Kale', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: '1 bunch' },
  'broccoli': { id: 'broccoli', name: 'Broccoli', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: '1 head' },
  'bell-pepper': { id: 'bell-pepper', name: 'Bell pepper', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'carrot': { id: 'carrot', name: 'Carrots', aisle: 'produce', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb bag' },
  'celery': { id: 'celery', name: 'Celery', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: '1 bunch' },
  'cucumber': { id: 'cucumber', name: 'Cucumber', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'zucchini': { id: 'zucchini', name: 'Zucchini', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'avocado': { id: 'avocado', name: 'Avocado', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'cilantro': { id: 'cilantro', name: 'Cilantro', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: '1 bunch' },
  'parsley': { id: 'parsley', name: 'Parsley', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: '1 bunch' },
  'basil': { id: 'basil', name: 'Fresh basil', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: '1 small package' },
  'ginger': { id: 'ginger', name: 'Ginger root', aisle: 'produce', packageSize: 4, packageUnit: 'oz', packageLabel: '~4 oz piece' },
  'sweet-potato': { id: 'sweet-potato', name: 'Sweet potato', aisle: 'produce', packageSize: 1, packageUnit: 'whole', packageLabel: 'each' },
  'potato': { id: 'potato', name: 'Russet potato', aisle: 'produce', packageSize: 5, packageUnit: 'lb', packageLabel: '5 lb bag' },

  // MEAT
  'chicken-breast': { id: 'chicken-breast', name: 'Chicken breast', aisle: 'meat', packageSize: 1.5, packageUnit: 'lb', packageLabel: '~1.5 lb pack' },
  'chicken-thigh': { id: 'chicken-thigh', name: 'Chicken thighs (boneless)', aisle: 'meat', packageSize: 1.5, packageUnit: 'lb', packageLabel: '~1.5 lb pack' },
  'ground-beef': { id: 'ground-beef', name: 'Ground beef (85/15)', aisle: 'meat', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb pack' },
  'ground-turkey': { id: 'ground-turkey', name: 'Ground turkey', aisle: 'meat', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb pack' },
  'pork-chop': { id: 'pork-chop', name: 'Pork chops', aisle: 'meat', packageSize: 1.5, packageUnit: 'lb', packageLabel: '~1.5 lb pack' },
  'bacon': { id: 'bacon', name: 'Bacon', aisle: 'meat', packageSize: 12, packageUnit: 'oz', packageLabel: '12 oz pack' },

  // SEAFOOD
  'salmon': { id: 'salmon', name: 'Salmon fillet', aisle: 'seafood', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb fillet' , allergens: ['fish'] },
  'shrimp': { id: 'shrimp', name: 'Shrimp (peeled)', aisle: 'seafood', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb bag, frozen' , allergens: ['shellfish'] },

  // DAIRY
  'eggs': { id: 'eggs', name: 'Eggs (large)', aisle: 'dairy', packageSize: 12, packageUnit: 'whole', packageLabel: '1 dozen' , allergens: ['egg'] },
  'milk': { id: 'milk', name: 'Milk (whole)', aisle: 'dairy', packageSize: 1, packageUnit: 'l', packageLabel: '1 quart (~1 L)' , allergens: ['dairy'], density: 1.03 },
  'butter': { id: 'butter', name: 'Butter', aisle: 'dairy', packageSize: 16, packageUnit: 'tbsp', packageLabel: '1 stick (8 tbsp) — sold in 4-stick boxes' , allergens: ['dairy'], density: 0.91 },
  'parmesan': { id: 'parmesan', name: 'Parmesan cheese', aisle: 'dairy', packageSize: 5, packageUnit: 'oz', packageLabel: '5 oz wedge' , allergens: ['dairy'] },
  'feta': { id: 'feta', name: 'Feta cheese', aisle: 'dairy', packageSize: 6, packageUnit: 'oz', packageLabel: '6 oz block' , allergens: ['dairy'] },
  'mozzarella': { id: 'mozzarella', name: 'Mozzarella (shredded)', aisle: 'dairy', packageSize: 8, packageUnit: 'oz', packageLabel: '8 oz bag' , allergens: ['dairy'] },
  'cream-cheese': { id: 'cream-cheese', name: 'Cream cheese', aisle: 'dairy', packageSize: 8, packageUnit: 'oz', packageLabel: '8 oz block', allergens: ['dairy'] },
  'sour-cream': { id: 'sour-cream', name: 'Sour cream', aisle: 'dairy', packageSize: 16, packageUnit: 'oz', packageLabel: '16 oz tub', allergens: ['dairy'], density: 0.96 },
  'greek-yogurt': { id: 'greek-yogurt', name: 'Greek yogurt (plain)', aisle: 'dairy', packageSize: 32, packageUnit: 'oz', packageLabel: '32 oz tub' , allergens: ['dairy'] },
  'heavy-cream': { id: 'heavy-cream', name: 'Heavy cream', aisle: 'dairy', packageSize: 1, packageUnit: 'cup', packageLabel: '1 pint' , allergens: ['dairy'], density: 0.99 },

  // PANTRY
  'olive-oil': { id: 'olive-oil', name: 'Olive oil', aisle: 'pantry', packageSize: 500, packageUnit: 'ml', packageLabel: '500 ml bottle', density: 0.92 },
  'vegetable-oil': { id: 'vegetable-oil', name: 'Vegetable oil', aisle: 'pantry', packageSize: 48, packageUnit: 'fl_oz', packageLabel: '48 fl oz bottle', density: 0.92 },
  'all-purpose-flour': { id: 'all-purpose-flour', name: 'All-purpose flour', aisle: 'pantry', packageSize: 5, packageUnit: 'lb', packageLabel: '5 lb bag', allergens: ['gluten'], density: 0.53 },
  'granulated-sugar': { id: 'granulated-sugar', name: 'Granulated sugar', aisle: 'pantry', packageSize: 4, packageUnit: 'lb', packageLabel: '4 lb bag', density: 0.85 },
  'brown-sugar': { id: 'brown-sugar', name: 'Brown sugar (light, packed)', aisle: 'pantry', packageSize: 2, packageUnit: 'lb', packageLabel: '2 lb bag', density: 0.90 },
  'honey': { id: 'honey', name: 'Honey', aisle: 'pantry', packageSize: 12, packageUnit: 'oz', packageLabel: '12 oz bottle', density: 1.42 },
  'mayonnaise': { id: 'mayonnaise', name: 'Mayonnaise', aisle: 'condiments', packageSize: 30, packageUnit: 'fl_oz', packageLabel: '30 fl oz jar', density: 0.91, allergens: ['egg'] },
  'water': { id: 'water', name: 'Water', aisle: 'pantry', packageSize: 1, packageUnit: 'gal', packageLabel: '1 gallon', density: 1.00 },
  'pasta': { id: 'pasta', name: 'Pasta (penne)', aisle: 'pantry', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb box' , allergens: ['gluten'] },
  'rice': { id: 'rice', name: 'Long-grain rice', aisle: 'pantry', packageSize: 2, packageUnit: 'lb', packageLabel: '2 lb bag' },
  'quinoa': { id: 'quinoa', name: 'Quinoa', aisle: 'pantry', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb bag' },
  'black-beans': { id: 'black-beans', name: 'Black beans (canned)', aisle: 'pantry', packageSize: 15, packageUnit: 'oz', packageLabel: '15 oz can' },
  'chickpeas': { id: 'chickpeas', name: 'Chickpeas (canned)', aisle: 'pantry', packageSize: 15, packageUnit: 'oz', packageLabel: '15 oz can' },
  'crushed-tomatoes': { id: 'crushed-tomatoes', name: 'Crushed tomatoes', aisle: 'pantry', packageSize: 28, packageUnit: 'oz', packageLabel: '28 oz can' },
  'tomato-paste': { id: 'tomato-paste', name: 'Tomato paste', aisle: 'pantry', packageSize: 6, packageUnit: 'oz', packageLabel: '6 oz can' },
  'chicken-broth': { id: 'chicken-broth', name: 'Chicken broth', aisle: 'pantry', packageSize: 32, packageUnit: 'oz', packageLabel: '32 oz carton' },
  'veg-broth': { id: 'veg-broth', name: 'Vegetable broth', aisle: 'pantry', packageSize: 32, packageUnit: 'oz', packageLabel: '32 oz carton' },
  'tofu': { id: 'tofu', name: 'Tofu (firm)', aisle: 'pantry', packageSize: 14, packageUnit: 'oz', packageLabel: '14 oz block' , allergens: ['soy'] },
  'lentils': { id: 'lentils', name: 'Lentils (dry)', aisle: 'pantry', packageSize: 1, packageUnit: 'lb', packageLabel: '1 lb bag' },
  'almonds': { id: 'almonds', name: 'Almonds', aisle: 'pantry', packageSize: 16, packageUnit: 'oz', packageLabel: '1 lb bag' , allergens: ['tree-nut'] },

  // BAKERY
  'bread': { id: 'bread', name: 'Whole grain bread', aisle: 'bakery', packageSize: 1, packageUnit: 'whole', packageLabel: '1 loaf' , allergens: ['gluten'] },
  'tortillas': { id: 'tortillas', name: 'Flour tortillas', aisle: 'bakery', packageSize: 8, packageUnit: 'whole', packageLabel: '8-pack' , allergens: ['gluten'] },
  'corn-tortillas': { id: 'corn-tortillas', name: 'Corn tortillas', aisle: 'bakery', packageSize: 12, packageUnit: 'whole', packageLabel: '12-pack' },

  // SPICES (these last forever; we treat them as pantry staples but still track)
  'salt': { id: 'salt', name: 'Kosher salt', aisle: 'spices', packageSize: 16, packageUnit: 'oz', packageLabel: '1 lb box', density: 1.20 },
  'black-pepper': { id: 'black-pepper', name: 'Black pepper', aisle: 'spices', packageSize: 2, packageUnit: 'oz', packageLabel: '2 oz jar' },
  'cumin': { id: 'cumin', name: 'Cumin', aisle: 'spices', packageSize: 2, packageUnit: 'oz', packageLabel: '2 oz jar' },
  'paprika': { id: 'paprika', name: 'Paprika', aisle: 'spices', packageSize: 2, packageUnit: 'oz', packageLabel: '2 oz jar' },
  'oregano': { id: 'oregano', name: 'Dried oregano', aisle: 'spices', packageSize: 1, packageUnit: 'oz', packageLabel: '1 oz jar' },
  'red-pepper-flakes': { id: 'red-pepper-flakes', name: 'Red pepper flakes', aisle: 'spices', packageSize: 1.5, packageUnit: 'oz', packageLabel: '1.5 oz jar' },

  // CONDIMENTS
  'soy-sauce': { id: 'soy-sauce', name: 'Soy sauce', aisle: 'condiments', packageSize: 10, packageUnit: 'oz', packageLabel: '10 oz bottle' , allergens: ['soy', 'gluten'] },
  'tamari': { id: 'tamari', name: 'Tamari (gluten-free)', aisle: 'condiments', packageSize: 10, packageUnit: 'oz', packageLabel: '10 oz bottle' , allergens: ['soy'] },
  'dijon': { id: 'dijon', name: 'Dijon mustard', aisle: 'condiments', packageSize: 8, packageUnit: 'oz', packageLabel: '8 oz jar' },
  'vinegar-balsamic': { id: 'vinegar-balsamic', name: 'Balsamic vinegar', aisle: 'condiments', packageSize: 8, packageUnit: 'oz', packageLabel: '8 oz bottle' }
}
