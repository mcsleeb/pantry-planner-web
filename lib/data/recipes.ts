import type { Recipe } from '../types'

// Seed recipes covering most diet types. Hand-tuned for ingredient overlap
// so the consolidator has interesting things to do.
//
// To add more: keep ingredient ids matching INGREDIENTS exactly. The tag
// system is what makes recipes show up under each diet.

export const RECIPES: Recipe[] = [
  {
    id: 'lemon-garlic-chicken',
    name: 'Lemon garlic chicken with broccoli',
    diets: ['omnivore', 'mediterranean', 'gluten-free', 'keto'],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 25,
    proteinTag: 'chicken',
    ingredients: [
      { ingredientId: 'chicken-breast', amount: 1.5, unit: 'lb' },
      { ingredientId: 'broccoli', amount: 1, unit: 'whole' },
      { ingredientId: 'lemon', amount: 1, unit: 'whole' },
      { ingredientId: 'garlic', amount: 4, unit: 'clove' },
      { ingredientId: 'olive-oil', amount: 3, unit: 'tbsp' },
      { ingredientId: 'salt', amount: 1, unit: 'tsp' },
      { ingredientId: 'black-pepper', amount: 0.5, unit: 'tsp' }
    ],
    steps: [
      'Pat chicken dry, season with salt and pepper.',
      'Sear chicken in olive oil until golden, ~5 min/side.',
      'Add minced garlic and lemon juice; finish in oven 10 min at 400°F.',
      'Steam broccoli; toss with olive oil and salt.'
    ],
    tags: ['quick', 'one-pan']
  },
  {
    id: 'pasta-bolognese',
    name: 'Beef bolognese with penne',
    diets: ['omnivore'],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 35,
    proteinTag: 'beef',
    ingredients: [
      { ingredientId: 'ground-beef', amount: 1, unit: 'lb' },
      { ingredientId: 'pasta', amount: 1, unit: 'lb' },
      { ingredientId: 'crushed-tomatoes', amount: 28, unit: 'oz' },
      { ingredientId: 'tomato-paste', amount: 2, unit: 'tbsp' },
      { ingredientId: 'yellow-onion', amount: 1, unit: 'whole' },
      { ingredientId: 'garlic', amount: 3, unit: 'clove' },
      { ingredientId: 'carrot', amount: 4, unit: 'oz' },
      { ingredientId: 'olive-oil', amount: 2, unit: 'tbsp' },
      { ingredientId: 'parmesan', amount: 2, unit: 'oz' },
      { ingredientId: 'oregano', amount: 1, unit: 'tsp' },
      { ingredientId: 'salt', amount: 1, unit: 'tsp' }
    ],
    steps: [
      'Dice onion and carrot finely; mince garlic.',
      'Sauté veg in olive oil until soft, ~8 min.',
      'Brown beef; add tomato paste, cook 2 min.',
      'Add crushed tomatoes, oregano, salt; simmer 20 min.',
      'Cook pasta; toss with sauce. Top with parmesan.'
    ],
    tags: ['comfort', 'family']
  },
  {
    id: 'salmon-quinoa-bowl',
    name: 'Salmon quinoa bowl with greens',
    diets: ['pescatarian', 'omnivore', 'mediterranean', 'gluten-free'],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 20,
    proteinTag: 'fish',
    ingredients: [
      { ingredientId: 'salmon', amount: 0.75, unit: 'lb' },
      { ingredientId: 'quinoa', amount: 0.5, unit: 'lb' },
      { ingredientId: 'spinach', amount: 3, unit: 'oz' },
      { ingredientId: 'lemon', amount: 1, unit: 'whole' },
      { ingredientId: 'olive-oil', amount: 2, unit: 'tbsp' },
      { ingredientId: 'garlic', amount: 2, unit: 'clove' },
      { ingredientId: 'salt', amount: 0.5, unit: 'tsp' }
    ],
    steps: [
      'Cook quinoa per package directions.',
      'Season salmon with salt and lemon zest; bake at 400°F for 12 min.',
      'Wilt spinach with garlic in olive oil.',
      'Bowl: quinoa base, salmon, spinach, lemon wedge.'
    ],
    tags: ['healthy', 'meal-prep']
  },
  {
    id: 'chickpea-curry',
    name: 'Coconut chickpea curry',
    diets: ['vegan', 'vegetarian', 'gluten-free'],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 25,
    proteinTag: 'beans',
    ingredients: [
      { ingredientId: 'chickpeas', amount: 30, unit: 'oz' },
      { ingredientId: 'crushed-tomatoes', amount: 14, unit: 'oz' },
      { ingredientId: 'yellow-onion', amount: 1, unit: 'whole' },
      { ingredientId: 'garlic', amount: 4, unit: 'clove' },
      { ingredientId: 'ginger', amount: 1, unit: 'tbsp' },
      { ingredientId: 'cumin', amount: 1, unit: 'tsp' },
      { ingredientId: 'paprika', amount: 1, unit: 'tsp' },
      { ingredientId: 'rice', amount: 0.5, unit: 'lb' },
      { ingredientId: 'olive-oil', amount: 2, unit: 'tbsp' },
      { ingredientId: 'cilantro', amount: 0.25, unit: 'whole' },
      { ingredientId: 'salt', amount: 1, unit: 'tsp' }
    ],
    steps: [
      'Sauté onion until soft. Add minced garlic and ginger.',
      'Stir in cumin and paprika, toast 30 sec.',
      'Add tomatoes and chickpeas; simmer 15 min.',
      'Serve over rice, topped with cilantro.'
    ],
    tags: ['budget', 'pantry']
  },
  {
    id: 'tofu-stir-fry',
    name: 'Sesame tofu stir-fry',
    diets: ['vegan', 'vegetarian'],
    servings: 3,
    prepMinutes: 15,
    cookMinutes: 15,
    proteinTag: 'tofu',
    ingredients: [
      { ingredientId: 'tofu', amount: 14, unit: 'oz' },
      { ingredientId: 'broccoli', amount: 1, unit: 'whole' },
      { ingredientId: 'bell-pepper', amount: 1, unit: 'whole' },
      { ingredientId: 'carrot', amount: 4, unit: 'oz' },
      { ingredientId: 'garlic', amount: 3, unit: 'clove' },
      { ingredientId: 'ginger', amount: 1, unit: 'tbsp' },
      { ingredientId: 'soy-sauce', amount: 3, unit: 'tbsp' },
      { ingredientId: 'rice', amount: 0.5, unit: 'lb' },
      { ingredientId: 'olive-oil', amount: 2, unit: 'tbsp' }
    ],
    steps: [
      'Press tofu, cube, pan-fry until golden.',
      'Stir-fry vegetables with garlic and ginger.',
      'Add tofu back, splash with soy sauce.',
      'Serve over rice.'
    ],
    tags: ['quick', 'weeknight']
  },
  {
    id: 'mediterranean-bowl',
    name: 'Mediterranean grain bowl',
    diets: ['vegetarian', 'mediterranean'],
    servings: 2,
    prepMinutes: 15,
    cookMinutes: 15,
    proteinTag: 'beans',
    ingredients: [
      { ingredientId: 'quinoa', amount: 0.5, unit: 'lb' },
      { ingredientId: 'chickpeas', amount: 15, unit: 'oz' },
      { ingredientId: 'cucumber', amount: 1, unit: 'whole' },
      { ingredientId: 'cherry-tomato', amount: 0.5, unit: 'lb' },
      { ingredientId: 'feta', amount: 3, unit: 'oz' },
      { ingredientId: 'parsley', amount: 0.25, unit: 'whole' },
      { ingredientId: 'lemon', amount: 1, unit: 'whole' },
      { ingredientId: 'olive-oil', amount: 3, unit: 'tbsp' },
      { ingredientId: 'salt', amount: 0.5, unit: 'tsp' }
    ],
    steps: [
      'Cook quinoa.',
      'Chop cucumber, halve tomatoes, crumble feta.',
      'Whisk olive oil and lemon juice for dressing.',
      'Layer everything, top with parsley and dressing.'
    ],
    tags: ['no-cook', 'fresh']
  },
  {
    id: 'shrimp-scampi',
    name: 'Garlic shrimp scampi',
    diets: ['pescatarian', 'omnivore'],
    servings: 3,
    prepMinutes: 5,
    cookMinutes: 15,
    proteinTag: 'fish',
    ingredients: [
      { ingredientId: 'shrimp', amount: 1, unit: 'lb' },
      { ingredientId: 'pasta', amount: 0.5, unit: 'lb' },
      { ingredientId: 'garlic', amount: 5, unit: 'clove' },
      { ingredientId: 'butter', amount: 3, unit: 'tbsp' },
      { ingredientId: 'olive-oil', amount: 2, unit: 'tbsp' },
      { ingredientId: 'lemon', amount: 1, unit: 'whole' },
      { ingredientId: 'parsley', amount: 0.25, unit: 'whole' },
      { ingredientId: 'red-pepper-flakes', amount: 0.5, unit: 'tsp' },
      { ingredientId: 'salt', amount: 0.5, unit: 'tsp' }
    ],
    steps: [
      'Cook pasta to al dente.',
      'Sauté garlic in butter and oil 30 sec.',
      'Add shrimp; cook 2 min/side until pink.',
      'Toss with pasta, lemon juice, parsley, red pepper.'
    ],
    tags: ['quick', 'date-night']
  },
  {
    id: 'turkey-tacos',
    name: 'Ground turkey tacos',
    diets: ['omnivore', 'gluten-free'],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 15,
    proteinTag: 'pork', // close enough for variety algo
    ingredients: [
      { ingredientId: 'ground-turkey', amount: 1, unit: 'lb' },
      { ingredientId: 'corn-tortillas', amount: 8, unit: 'whole' },
      { ingredientId: 'red-onion', amount: 0.5, unit: 'whole' },
      { ingredientId: 'avocado', amount: 1, unit: 'whole' },
      { ingredientId: 'lime', amount: 1, unit: 'whole' },
      { ingredientId: 'cilantro', amount: 0.25, unit: 'whole' },
      { ingredientId: 'cumin', amount: 1, unit: 'tsp' },
      { ingredientId: 'paprika', amount: 1, unit: 'tsp' },
      { ingredientId: 'olive-oil', amount: 1, unit: 'tbsp' },
      { ingredientId: 'salt', amount: 0.5, unit: 'tsp' }
    ],
    steps: [
      'Brown turkey with cumin and paprika.',
      'Warm tortillas.',
      'Slice avocado, dice onion, chop cilantro.',
      'Build tacos; squeeze lime over top.'
    ],
    tags: ['weeknight', 'kid-friendly']
  },
  {
    id: 'lentil-soup',
    name: 'Hearty lentil soup',
    diets: ['vegan', 'vegetarian', 'gluten-free'],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 35,
    proteinTag: 'beans',
    ingredients: [
      { ingredientId: 'lentils', amount: 8, unit: 'oz' },
      { ingredientId: 'veg-broth', amount: 32, unit: 'oz' },
      { ingredientId: 'yellow-onion', amount: 1, unit: 'whole' },
      { ingredientId: 'carrot', amount: 6, unit: 'oz' },
      { ingredientId: 'celery', amount: 0.25, unit: 'whole' },
      { ingredientId: 'garlic', amount: 3, unit: 'clove' },
      { ingredientId: 'crushed-tomatoes', amount: 14, unit: 'oz' },
      { ingredientId: 'cumin', amount: 1, unit: 'tsp' },
      { ingredientId: 'olive-oil', amount: 2, unit: 'tbsp' },
      { ingredientId: 'salt', amount: 1, unit: 'tsp' }
    ],
    steps: [
      'Dice onion, carrot, celery; mince garlic.',
      'Sauté in olive oil 8 min.',
      'Add cumin, then lentils, broth, tomatoes.',
      'Simmer 25 min until lentils are tender.'
    ],
    tags: ['budget', 'meal-prep']
  },
  {
    id: 'keto-egg-bake',
    name: 'Keto sausage and spinach egg bake',
    diets: ['keto', 'vegetarian', 'gluten-free'],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 30,
    proteinTag: 'eggs',
    ingredients: [
      { ingredientId: 'eggs', amount: 8, unit: 'whole' },
      { ingredientId: 'spinach', amount: 5, unit: 'oz' },
      { ingredientId: 'mozzarella', amount: 4, unit: 'oz' },
      { ingredientId: 'heavy-cream', amount: 0.5, unit: 'cup' },
      { ingredientId: 'butter', amount: 2, unit: 'tbsp' },
      { ingredientId: 'salt', amount: 0.5, unit: 'tsp' },
      { ingredientId: 'black-pepper', amount: 0.25, unit: 'tsp' }
    ],
    steps: [
      'Wilt spinach in butter, drain excess liquid.',
      'Whisk eggs with cream, salt, pepper.',
      'Combine in baking dish, top with mozzarella.',
      'Bake at 375°F for 25 min until set.'
    ],
    tags: ['meal-prep', 'breakfast']
  },
  {
    id: 'caprese-toast',
    name: 'Caprese avocado toast',
    diets: ['vegetarian', 'mediterranean'],
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 5,
    proteinTag: 'none',
    ingredients: [
      { ingredientId: 'bread', amount: 4, unit: 'whole' },
      { ingredientId: 'avocado', amount: 1, unit: 'whole' },
      { ingredientId: 'tomato', amount: 1, unit: 'whole' },
      { ingredientId: 'basil', amount: 0.5, unit: 'whole' },
      { ingredientId: 'olive-oil', amount: 1, unit: 'tbsp' },
      { ingredientId: 'vinegar-balsamic', amount: 1, unit: 'tsp' },
      { ingredientId: 'salt', amount: 0.25, unit: 'tsp' }
    ],
    steps: [
      'Toast bread.',
      'Mash avocado with salt; spread on toast.',
      'Top with sliced tomato and basil.',
      'Drizzle with oil and balsamic.'
    ],
    tags: ['quick', 'breakfast', 'lunch']
  },
  {
    id: 'chicken-thigh-traybake',
    name: 'Chicken thigh tray bake with sweet potato',
    diets: ['omnivore', 'gluten-free', 'mediterranean'],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 40,
    proteinTag: 'chicken',
    ingredients: [
      { ingredientId: 'chicken-thigh', amount: 1.5, unit: 'lb' },
      { ingredientId: 'sweet-potato', amount: 2, unit: 'whole' },
      { ingredientId: 'red-onion', amount: 1, unit: 'whole' },
      { ingredientId: 'garlic', amount: 4, unit: 'clove' },
      { ingredientId: 'olive-oil', amount: 3, unit: 'tbsp' },
      { ingredientId: 'paprika', amount: 1, unit: 'tsp' },
      { ingredientId: 'oregano', amount: 1, unit: 'tsp' },
      { ingredientId: 'salt', amount: 1, unit: 'tsp' },
      { ingredientId: 'lemon', amount: 1, unit: 'whole' }
    ],
    steps: [
      'Cube sweet potato, wedge onion, smash garlic.',
      'Toss veg with oil, salt, paprika, oregano.',
      'Nestle thighs on top, squeeze lemon.',
      'Roast at 425°F for 35–40 min until thighs hit 175°F.'
    ],
    tags: ['one-pan', 'weeknight']
  }
]
