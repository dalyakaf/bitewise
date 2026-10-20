-- =============================================================================
-- BiteWise — Stage 1 database setup
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- It is idempotent: running it again updates the seed data without duplicates.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Personal fridge inventory (private, one row per ingredient per user)
-- -----------------------------------------------------------------------------
create table if not exists public.fridge_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  created_at  timestamptz not null default now()
);

create index if not exists fridge_items_user_created_idx
  on public.fridge_items (user_id, created_at desc);

alter table public.fridge_items enable row level security;

drop policy if exists "fridge_items_select_own" on public.fridge_items;
drop policy if exists "fridge_items_insert_own" on public.fridge_items;
drop policy if exists "fridge_items_update_own" on public.fridge_items;
drop policy if exists "fridge_items_delete_own" on public.fridge_items;

create policy "fridge_items_select_own" on public.fridge_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "fridge_items_insert_own" on public.fridge_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "fridge_items_update_own" on public.fridge_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "fridge_items_delete_own" on public.fridge_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.fridge_items from anon;
grant select, insert, update, delete on public.fridge_items to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Shared recipe catalog (read-only for logged-in users)
-- -----------------------------------------------------------------------------
create table if not exists public.recipes (
  id                            bigint generated always as identity primary key,
  slug                          text not null unique,
  title                         text not null,
  description                   text not null,
  emoji                         text not null default '🍽️',
  total_minutes                 integer not null check (total_minutes > 0),
  servings                      integer not null default 1 check (servings > 0),
  estimated_cost_per_serving_eur numeric(6, 2) not null check (estimated_cost_per_serving_eur >= 0),
  difficulty                    text not null default 'Easy' check (difficulty in ('Easy', 'Medium')),
  tags                          text[] not null default '{}',
  instructions                  text[] not null,
  created_at                    timestamptz not null default now()
);

create table if not exists public.ingredients (
  id        bigint generated always as identity primary key,
  name      text not null unique,
  aliases   text[] not null default '{}',
  category  text not null default 'other'
);

create table if not exists public.recipe_ingredients (
  recipe_id      bigint not null references public.recipes (id) on delete cascade,
  ingredient_id  bigint not null references public.ingredients (id) on delete restrict,
  quantity       text,
  -- staples (salt, pepper, oil) are listed but never block a "Cook Now" match
  is_staple      boolean not null default false,
  primary key (recipe_id, ingredient_id)
);

create index if not exists recipe_ingredients_ingredient_idx
  on public.recipe_ingredients (ingredient_id);

alter table public.recipes            enable row level security;
alter table public.ingredients        enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists "recipes_read_authenticated"            on public.recipes;
drop policy if exists "ingredients_read_authenticated"        on public.ingredients;
drop policy if exists "recipe_ingredients_read_authenticated" on public.recipe_ingredients;

create policy "recipes_read_authenticated" on public.recipes
  for select to authenticated
  using ((select auth.uid()) is not null);

create policy "ingredients_read_authenticated" on public.ingredients
  for select to authenticated
  using ((select auth.uid()) is not null);

create policy "recipe_ingredients_read_authenticated" on public.recipe_ingredients
  for select to authenticated
  using ((select auth.uid()) is not null);

-- No insert/update/delete policies: the catalog is only changed from the SQL Editor.
revoke all on public.recipes, public.ingredients, public.recipe_ingredients from anon;
revoke insert, update, delete on public.recipes, public.ingredients, public.recipe_ingredients from authenticated;
grant select on public.recipes, public.ingredients, public.recipe_ingredients to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Seed: ingredient catalog (aliases are matched against fridge text)
-- -----------------------------------------------------------------------------
insert into public.ingredients (name, aliases, category) values
  ('egg',             array['eggs','large egg','large eggs','free range eggs'], 'protein'),
  ('chicken breast',  array['chicken','chicken breasts','chicken thigh','chicken thighs','chicken fillet','chicken fillets'], 'protein'),
  ('tuna',            array['canned tuna','tinned tuna','tuna can','can of tuna'], 'protein'),
  ('ham',             array['sliced ham','cooked ham','jamon york','jamon'], 'protein'),
  ('chorizo',         array['chorizo sausage'], 'protein'),
  ('chickpeas',       array['chickpea','canned chickpeas','tinned chickpeas','garbanzo beans','garbanzos'], 'legumes'),
  ('black beans',     array['black bean','canned black beans','tinned black beans'], 'legumes'),
  ('lentils',         array['lentil','red lentils','split red lentils','green lentils'], 'legumes'),
  ('rice',            array['white rice','cooked rice','basmati rice','basmati','jasmine rice','long grain rice','brown rice','arborio rice','arborio','risotto rice'], 'grains'),
  ('pasta',           array['spaghetti','penne','fusilli','macaroni','linguine','farfalle','rigatoni','tagliatelle'], 'grains'),
  ('bread',           array['sliced bread','toast','wholemeal bread','whole wheat bread','sourdough','baguette','loaf','bread slices'], 'grains'),
  ('tortilla',        array['tortillas','wrap','wraps','flour tortilla','flour tortillas','tortilla wraps'], 'grains'),
  ('noodles',         array['noodle','ramen','ramen noodles','instant noodles','egg noodles','udon','rice noodles'], 'grains'),
  ('oats',            array['oat','rolled oats','porridge oats','oatmeal','oat flakes'], 'grains'),
  ('onion',           array['onions','red onion','red onions','white onion','yellow onion','brown onion'], 'produce'),
  ('garlic',          array['garlic clove','garlic cloves','garlic bulb'], 'produce'),
  ('tomato',          array['tomatoes','cherry tomato','cherry tomatoes','fresh tomatoes','plum tomatoes'], 'produce'),
  ('bell pepper',     array['bell peppers','red pepper','red peppers','green pepper','green peppers','yellow pepper','capsicum','sweet pepper'], 'produce'),
  ('carrot',          array['carrots','baby carrots'], 'produce'),
  ('spinach',         array['baby spinach','fresh spinach','frozen spinach'], 'produce'),
  ('mushroom',        array['mushrooms','button mushrooms','chestnut mushrooms'], 'produce'),
  ('zucchini',        array['zucchinis','courgette','courgettes'], 'produce'),
  ('potato',          array['potatoes','baking potato','jacket potato','white potatoes'], 'produce'),
  ('sweet potato',    array['sweet potatoes','yam'], 'produce'),
  ('cucumber',        array['cucumbers'], 'produce'),
  ('lettuce',         array['romaine','iceberg lettuce','salad leaves','mixed salad','little gem'], 'produce'),
  ('avocado',         array['avocados'], 'produce'),
  ('spring onion',    array['spring onions','green onion','green onions','scallion','scallions'], 'produce'),
  ('lemon',           array['lemons','lemon juice'], 'produce'),
  ('banana',          array['bananas'], 'produce'),
  ('ginger',          array['fresh ginger','ginger root','ground ginger'], 'produce'),
  ('frozen peas',     array['peas','garden peas','green peas'], 'produce'),
  ('canned tomatoes', array['tinned tomatoes','chopped tomatoes','crushed tomatoes','canned tomato','tinned tomato','passata','tomato passata','tomato sauce'], 'pantry'),
  ('coconut milk',    array['canned coconut milk','coconut cream'], 'pantry'),
  ('peanut butter',   array['pb','peanut paste'], 'pantry'),
  ('honey',           array['runny honey'], 'pantry'),
  ('soy sauce',       array['soya sauce','soy','light soy sauce'], 'pantry'),
  ('curry powder',    array['curry','garam masala','curry paste'], 'pantry'),
  ('cheese',          array['cheddar','cheddar cheese','grated cheese','shredded cheese','mozzarella','emmental','gouda'], 'dairy'),
  ('parmesan',        array['parmesan cheese','parmigiano','parmigiano reggiano','grana padano'], 'dairy'),
  ('feta',            array['feta cheese'], 'dairy'),
  ('milk',            array['whole milk','semi skimmed milk','skimmed milk','oat milk','soy milk','almond milk'], 'dairy'),
  ('yogurt',          array['yoghurt','greek yogurt','greek yoghurt','natural yogurt','plain yogurt'], 'dairy'),
  ('butter',          array['salted butter','unsalted butter'], 'dairy'),
  ('olive oil',       array['oil','vegetable oil','sunflower oil','cooking oil','extra virgin olive oil'], 'staple'),
  ('salt',            array['sea salt','table salt'], 'staple'),
  ('black pepper',    array['ground black pepper','peppercorns'], 'staple')
on conflict (name) do update
  set aliases = excluded.aliases,
      category = excluded.category;


-- -----------------------------------------------------------------------------
-- 4. Seed: recipes (costs are illustrative per-serving estimates in EUR)
-- -----------------------------------------------------------------------------
insert into public.recipes
  (slug, title, description, emoji, total_minutes, servings, estimated_cost_per_serving_eur, difficulty, tags, instructions)
values
  ('egg-fried-rice', 'Egg Fried Rice', 'The ultimate leftover-rice rescue: fluffy egg, sweet peas and soy in one pan.', '🍳', 15, 1, 1.10, 'Easy',
    array['quick','one-pan','budget'],
    array['Heat the oil in a large frying pan or wok over medium-high heat.',
          'Add the peas and the white parts of the sliced spring onions and stir-fry for 2 minutes.',
          'Push everything to one side, crack in the eggs and scramble until just set.',
          'Add the cold cooked rice, breaking up any clumps, and stir-fry for 3-4 minutes until piping hot.',
          'Stir through the soy sauce, taste, and finish with the green parts of the spring onions.']),

  ('tomato-garlic-spaghetti', 'Tomato & Garlic Spaghetti', 'A cheap, cosy pantry pasta with a rich tomato sauce that cooks while the pasta boils.', '🍝', 20, 2, 0.80, 'Easy',
    array['pantry','vegetarian','budget'],
    array['Bring a large pot of salted water to the boil and cook the pasta according to the packet.',
          'Meanwhile, finely chop the onion and garlic. Soften the onion in the olive oil over medium heat for 5 minutes.',
          'Add the garlic and cook for 1 minute, then pour in the canned tomatoes. Simmer for 10 minutes, stirring now and then, and season with salt.',
          'Reserve a splash of pasta water, drain the pasta and toss it through the sauce, loosening with the pasta water if needed.']),

  ('cheesy-veggie-omelette', 'Cheesy Veggie Omelette', 'Protein-packed and ready in 10 minutes. Perfect between lectures.', '🥚', 10, 1, 1.20, 'Easy',
    array['quick','vegetarian','high-protein'],
    array['Beat the eggs with a pinch of salt and pepper.',
          'Dice the tomato. Heat the oil in a non-stick pan over medium heat and wilt the spinach for 1 minute.',
          'Pour in the eggs and tilt the pan to spread them. Cook for 2 minutes, gently pulling the set edges towards the centre.',
          'When the top is almost set, scatter over the tomato and cheese, fold in half and cook for 1 more minute.']),

  ('chickpea-spinach-curry', 'Chickpea & Spinach Curry', 'Creamy coconut curry that makes great leftovers for tomorrow''s lunch.', '🍛', 25, 2, 1.40, 'Easy',
    array['vegan','meal-prep','one-pot'],
    array['Start cooking the rice according to the packet instructions.',
          'Chop the onion and garlic and fry in the oil over medium heat for 5 minutes until soft.',
          'Stir in the curry powder and cook for 30 seconds until fragrant.',
          'Add the drained chickpeas and the coconut milk, then simmer for 10 minutes until slightly thickened.',
          'Stir in the spinach until wilted, season with salt and serve over the rice.']),

  ('black-bean-quesadillas', 'Black Bean Quesadillas', 'Crispy, melty and filling, with a fibre boost from the beans.', '🌮', 15, 1, 1.60, 'Easy',
    array['quick','vegetarian'],
    array['Finely dice the pepper and roughly mash the drained beans with a fork.',
          'Spread the beans over one half of each tortilla, top with the pepper and cheese, then fold in half.',
          'Heat a dry or very lightly oiled frying pan over medium heat.',
          'Cook the quesadillas for 2-3 minutes per side until golden and the cheese has melted. Cut into wedges.']),

  ('tuna-pasta-salad', 'Lemony Tuna Pasta Salad', 'A fresh make-ahead lunch that keeps for two days in the fridge.', '🥗', 20, 2, 1.30, 'Easy',
    array['meal-prep','high-protein','lunchbox'],
    array['Cook the pasta according to the packet, then drain and rinse under cold water to cool.',
          'Dice the cucumber and tomatoes.',
          'Whisk the juice of the lemon with 2 tbsp olive oil and a pinch of salt and pepper.',
          'Toss the pasta, drained tuna, vegetables and dressing together. Keeps in the fridge for up to 2 days.']),

  ('overnight-oats', 'Overnight Oats', 'Five minutes the night before means breakfast is waiting for your 9am.', '🥣', 5, 1, 0.60, 'Easy',
    array['breakfast','no-cook','meal-prep'],
    array['In a jar or container, mix the oats, milk and yogurt.',
          'Stir in the honey, cover and refrigerate overnight (at least 4 hours).',
          'In the morning, stir and add a splash more milk if it is too thick. Eat cold or microwave for 1-2 minutes.']),

  ('peanut-butter-banana-toast', 'Peanut Butter Banana Toast', 'Sweet, salty and full of energy for a long study session.', '🍌', 5, 1, 0.50, 'Easy',
    array['breakfast','snack','quick'],
    array['Toast the bread.',
          'Spread the peanut butter on the warm toast.',
          'Slice the banana on top and finish with a drizzle of honey.']),

  ('shakshuka', 'Easy Shakshuka', 'Eggs gently poached in a spiced pepper and tomato sauce. Brunch hero.', '🍅', 25, 2, 1.10, 'Easy',
    array['vegetarian','one-pan','brunch'],
    array['Slice the onion and pepper and fry in the oil in a wide pan over medium heat for 6-8 minutes until soft.',
          'Add the chopped garlic (and a pinch of cumin or paprika if you have them) and cook for 1 minute.',
          'Pour in the canned tomatoes, season with salt and simmer for 5 minutes until slightly thickened.',
          'Make 4 small wells in the sauce and crack an egg into each. Cover and cook on low heat for 5-7 minutes until the whites are set but the yolks are still soft.',
          'Serve straight from the pan, with bread for dipping if you have some.']),

  ('lemon-garlic-chicken-rice', 'Lemon Garlic Chicken & Rice', 'Juicy chicken strips in a zesty garlic pan sauce over fluffy rice.', '🍗', 30, 2, 2.20, 'Easy',
    array['high-protein','dinner'],
    array['Cook the rice according to the packet instructions.',
          'Slice the chicken into strips and season with salt and pepper.',
          'Heat 1 tbsp oil in a pan over medium-high heat and cook the chicken for 6-8 minutes, turning, until golden and cooked through with no pink in the middle.',
          'Lower the heat, add the sliced garlic and cook for 1 minute, then squeeze over the lemon juice and stir to coat.',
          'Serve over the rice with the pan juices spooned on top.']),

  ('red-lentil-soup', 'Red Lentil & Tomato Soup', 'Hearty, freezer-friendly and costs less than a coffee per bowl.', '🥕', 30, 3, 0.60, 'Easy',
    array['vegan','meal-prep','budget'],
    array['Chop the onion, carrots and garlic and soften in the oil in a large pot for 5 minutes.',
          'Add the rinsed lentils, canned tomatoes and 900 ml water (or stock) and bring to the boil.',
          'Simmer for 20 minutes, stirring occasionally, until the lentils are completely soft.',
          'Season with salt. Blend part of the soup for a creamier texture, or leave it chunky. Freezes well.']),

  ('sheet-pan-sweet-potato-chickpeas', 'Sheet-Pan Sweet Potato & Chickpeas', 'Throw it all on one tray and study while the oven does the work.', '🍠', 35, 2, 1.20, 'Easy',
    array['vegan','one-pan','hands-off'],
    array['Preheat the oven to 200°C (180°C fan).',
          'Cut the sweet potatoes into 2 cm cubes and the pepper and onion into chunks. Drain the chickpeas and pat them dry.',
          'Toss everything on a baking tray with 2 tbsp oil and a good pinch of salt (plus paprika or cumin if you have them).',
          'Roast for 25-30 minutes, turning halfway, until the sweet potato is tender and the chickpeas are crisp.']),

  ('quick-mushroom-risotto', 'Quick Mushroom Risotto', 'Creamy, comforting and surprisingly cheap. Worth the stirring.', '🍄', 35, 2, 1.80, 'Medium',
    array['vegetarian','comfort'],
    array['Keep about 750 ml of hot water or stock in a pan over low heat.',
          'Fry the chopped onion in the oil for 4 minutes, then add the sliced mushrooms and garlic and cook for 4 minutes more.',
          'Add the rice and stir for 1 minute to coat it in the oil.',
          'Add a ladle of hot liquid at a time, stirring often and waiting until it is mostly absorbed before adding more. Continue for 18-20 minutes until the rice is creamy and just tender.',
          'Take off the heat, stir in the butter and grated parmesan, season with salt and rest for 1 minute.']),

  ('veggie-noodle-stir-fry', 'Veggie Noodle Stir-Fry', 'Faster than delivery and a lot cheaper. Crunchy veg, glossy noodles.', '🍜', 15, 1, 1.30, 'Easy',
    array['quick','vegan','one-pan'],
    array['Cook the noodles according to the packet, then drain and rinse briefly.',
          'Cut the carrot and pepper into thin strips and slice the garlic.',
          'Stir-fry the vegetables in the oil over high heat for 3-4 minutes until just tender, adding the garlic for the final 30 seconds.',
          'Add the noodles and soy sauce and toss for 1-2 minutes until hot and glossy.']),

  ('greek-salad', 'Classic Greek Salad', 'No cooking, big flavour. Great with bread on a hot day.', '🥒', 10, 1, 1.90, 'Easy',
    array['no-cook','vegetarian','fresh'],
    array['Chop the tomatoes and cucumber into chunks and thinly slice the onion.',
          'Combine in a bowl and season lightly with salt (the feta is already salty).',
          'Place the feta on top, drizzle with olive oil and add dried oregano if you have it.']),

  ('avocado-egg-toast', 'Avocado & Egg Toast', 'The café classic for a fraction of the price.', '🥑', 10, 1, 1.40, 'Easy',
    array['breakfast','quick','vegetarian'],
    array['Toast the bread.',
          'Fry or poach the egg to your liking (about 3-4 minutes for a runny yolk).',
          'Mash the avocado with a pinch of salt and spread it on the toast.',
          'Top with the egg and a crack of black pepper.']),

  ('spanish-potato-omelette', 'Spanish Potato Omelette', 'Tortilla de patatas: three ingredients, endless student dinners.', '🥔', 40, 3, 0.70, 'Medium',
    array['vegetarian','meal-prep','classic'],
    array['Peel and thinly slice the potatoes and onion.',
          'Cook them gently in plenty of olive oil in a non-stick pan over medium-low heat, covered, for 15-20 minutes, stirring occasionally, until very soft but not browned.',
          'Beat the eggs with salt in a large bowl. Drain the potatoes and onion (save the oil), fold them into the eggs and leave for 5 minutes.',
          'Heat 1 tbsp of the saved oil in the pan, pour in the mixture and cook on medium-low for 5-6 minutes until mostly set.',
          'Place a large plate over the pan, flip carefully, slide the omelette back in and cook for 2-3 minutes more. Serve warm or cold.']),

  ('chorizo-chickpea-stew', 'Chorizo & Chickpea Stew', 'Smoky, warming one-pot stew inspired by Spanish home cooking.', '🍲', 25, 2, 1.50, 'Easy',
    array['one-pot','comfort','meal-prep'],
    array['Dice the chorizo, onion and garlic.',
          'Fry the chorizo in a little oil for 3 minutes until it releases its red oil, then add the onion and cook for 5 minutes.',
          'Add the garlic for 1 minute, then stir in the drained chickpeas and canned tomatoes.',
          'Simmer for 12-15 minutes until thickened. Season to taste and serve with bread.']),

  ('pasta-peas-ham', 'Pasta with Peas & Ham', 'A 15-minute comfort bowl made from fridge odds and ends.', '🥓', 15, 1, 1.30, 'Easy',
    array['quick','comfort'],
    array['Cook the pasta in salted water, adding the frozen peas for the final 3 minutes.',
          'Chop the ham into bite-sized pieces.',
          'Reserve a splash of pasta water, drain, then return everything to the pot with the oil, ham, grated parmesan and a little pasta water. Stir until glossy.']),

  ('loaded-jacket-potato', 'Loaded Microwave Jacket Potato', 'No oven needed. A filling dorm-friendly dinner in 15 minutes.', '🥔', 15, 1, 1.10, 'Easy',
    array['microwave','vegetarian','dorm-friendly'],
    array['Prick the potato all over with a fork. Microwave on high for 8-10 minutes, turning halfway, until soft in the centre.',
          'Meanwhile, warm the drained beans in the microwave for 1 minute with a pinch of salt.',
          'Split the potato open, fluff up the inside and season with salt.',
          'Top with the beans, cheese and a spoonful of yogurt. Microwave for 30 seconds more to melt the cheese if you like.']),

  ('coconut-lentil-dal', 'Coconut Lentil Dal', 'Silky, gently spiced lentils. Cheap, filling and freezes brilliantly.', '🥥', 30, 3, 0.80, 'Easy',
    array['vegan','meal-prep','budget'],
    array['Finely chop the onion, garlic and ginger and fry in the oil for 5 minutes.',
          'Stir in the curry powder and cook for 30 seconds.',
          'Add the rinsed lentils, coconut milk and 400 ml water. Simmer for 20 minutes, stirring often so nothing sticks, until the lentils break down.',
          'Season with salt and add a splash of water if it is too thick. Serve with rice or bread.']),

  ('zucchini-feta-pasta', 'Zucchini & Feta Pasta', 'Bright, lemony and light, with salty feta crumbled on top.', '🍋', 20, 2, 1.40, 'Easy',
    array['vegetarian','fresh'],
    array['Cook the pasta according to the packet.',
          'Meanwhile, grate or thinly slice the zucchini and fry it in 2 tbsp oil over medium-high heat for 5 minutes until soft and lightly golden. Add the garlic for 1 minute.',
          'Drain the pasta, reserving a splash of water, and toss it with the zucchini, lemon juice and pasta water.',
          'Crumble the feta over the top and season with black pepper.']),

  ('banana-oat-pancakes', 'Banana Oat Pancakes', 'Three-ingredient pancakes with no flour and no added sugar.', '🥞', 15, 1, 0.60, 'Easy',
    array['breakfast','vegetarian','budget'],
    array['Mash the banana until smooth, whisk in the eggs and stir in the oats. Rest for 2 minutes to thicken.',
          'Heat a lightly oiled non-stick pan over medium-low heat.',
          'Spoon in small pancakes and cook for about 2 minutes per side until golden and set. Serve with honey or yogurt if you have some.']),

  ('chicken-salad-wrap', 'Chicken Salad Wraps', 'Fresh, high-protein wraps with a quick yogurt sauce.', '🌯', 20, 2, 2.10, 'Easy',
    array['high-protein','lunchbox'],
    array['Slice the chicken into thin strips and season with salt and pepper.',
          'Cook in a little oil over medium-high heat for 6-8 minutes until cooked through with no pink inside.',
          'Shred the lettuce and slice the tomato. Mix the yogurt with a pinch of salt and pepper for a quick sauce.',
          'Warm the tortillas briefly in a dry pan, fill with lettuce, tomato, chicken and yogurt sauce, and roll up tightly.']),

  ('garlic-mushrooms-on-toast', 'Garlic Mushrooms on Toast', 'Buttery, savoury and ready in 12 minutes.', '🍞', 12, 1, 1.20, 'Easy',
    array['quick','vegetarian','breakfast'],
    array['Slice the mushrooms and garlic.',
          'Melt the butter in a pan over medium-high heat and fry the mushrooms for 5-6 minutes until golden and their liquid has evaporated.',
          'Add the garlic for the final minute and season with salt and pepper.',
          'Toast the bread and pile the mushrooms on top.'])
on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      emoji = excluded.emoji,
      total_minutes = excluded.total_minutes,
      servings = excluded.servings,
      estimated_cost_per_serving_eur = excluded.estimated_cost_per_serving_eur,
      difficulty = excluded.difficulty,
      tags = excluded.tags,
      instructions = excluded.instructions;


-- -----------------------------------------------------------------------------
-- 5. Seed: recipe ↔ ingredient links
-- -----------------------------------------------------------------------------
insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, is_staple)
select r.id, i.id, v.quantity, v.is_staple
from (values
  ('egg-fried-rice', 'rice', '1½ cups cooked (leftover is best)', false),
  ('egg-fried-rice', 'egg', '2', false),
  ('egg-fried-rice', 'frozen peas', '½ cup', false),
  ('egg-fried-rice', 'spring onion', '2, sliced', false),
  ('egg-fried-rice', 'soy sauce', '1-2 tbsp', false),
  ('egg-fried-rice', 'olive oil', '1 tbsp', true),

  ('tomato-garlic-spaghetti', 'pasta', '200 g', false),
  ('tomato-garlic-spaghetti', 'canned tomatoes', '400 g can', false),
  ('tomato-garlic-spaghetti', 'garlic', '3 cloves', false),
  ('tomato-garlic-spaghetti', 'onion', '1 small', false),
  ('tomato-garlic-spaghetti', 'olive oil', '2 tbsp', true),
  ('tomato-garlic-spaghetti', 'salt', 'to taste', true),

  ('cheesy-veggie-omelette', 'egg', '3', false),
  ('cheesy-veggie-omelette', 'cheese', '30 g, grated', false),
  ('cheesy-veggie-omelette', 'spinach', '1 handful', false),
  ('cheesy-veggie-omelette', 'tomato', '1', false),
  ('cheesy-veggie-omelette', 'olive oil', '1 tsp', true),
  ('cheesy-veggie-omelette', 'salt', 'pinch', true),
  ('cheesy-veggie-omelette', 'black pepper', 'pinch', true),

  ('chickpea-spinach-curry', 'chickpeas', '400 g can, drained', false),
  ('chickpea-spinach-curry', 'coconut milk', '200 ml', false),
  ('chickpea-spinach-curry', 'spinach', '2 handfuls', false),
  ('chickpea-spinach-curry', 'onion', '1', false),
  ('chickpea-spinach-curry', 'garlic', '2 cloves', false),
  ('chickpea-spinach-curry', 'curry powder', '1 tbsp', false),
  ('chickpea-spinach-curry', 'rice', '150 g, to serve', false),
  ('chickpea-spinach-curry', 'olive oil', '1 tbsp', true),
  ('chickpea-spinach-curry', 'salt', 'to taste', true),

  ('black-bean-quesadillas', 'tortilla', '2', false),
  ('black-bean-quesadillas', 'black beans', '½ can, drained', false),
  ('black-bean-quesadillas', 'cheese', '50 g, grated', false),
  ('black-bean-quesadillas', 'bell pepper', '½', false),
  ('black-bean-quesadillas', 'olive oil', 'a few drops', true),

  ('tuna-pasta-salad', 'pasta', '150 g', false),
  ('tuna-pasta-salad', 'tuna', '1 can, drained', false),
  ('tuna-pasta-salad', 'cucumber', '½', false),
  ('tuna-pasta-salad', 'tomato', '2', false),
  ('tuna-pasta-salad', 'lemon', '½', false),
  ('tuna-pasta-salad', 'olive oil', '2 tbsp', true),
  ('tuna-pasta-salad', 'salt', 'pinch', true),
  ('tuna-pasta-salad', 'black pepper', 'pinch', true),

  ('overnight-oats', 'oats', '50 g', false),
  ('overnight-oats', 'milk', '120 ml', false),
  ('overnight-oats', 'yogurt', '2 tbsp', false),
  ('overnight-oats', 'honey', '1 tsp', false),

  ('peanut-butter-banana-toast', 'bread', '2 slices', false),
  ('peanut-butter-banana-toast', 'peanut butter', '2 tbsp', false),
  ('peanut-butter-banana-toast', 'banana', '1', false),
  ('peanut-butter-banana-toast', 'honey', 'a drizzle', false),

  ('shakshuka', 'egg', '4', false),
  ('shakshuka', 'canned tomatoes', '400 g can', false),
  ('shakshuka', 'onion', '1', false),
  ('shakshuka', 'bell pepper', '1', false),
  ('shakshuka', 'garlic', '2 cloves', false),
  ('shakshuka', 'olive oil', '1 tbsp', true),
  ('shakshuka', 'salt', 'to taste', true),

  ('lemon-garlic-chicken-rice', 'chicken breast', '2 (about 300 g)', false),
  ('lemon-garlic-chicken-rice', 'rice', '150 g', false),
  ('lemon-garlic-chicken-rice', 'lemon', '1', false),
  ('lemon-garlic-chicken-rice', 'garlic', '3 cloves', false),
  ('lemon-garlic-chicken-rice', 'olive oil', '1 tbsp', true),
  ('lemon-garlic-chicken-rice', 'salt', 'to taste', true),
  ('lemon-garlic-chicken-rice', 'black pepper', 'to taste', true),

  ('red-lentil-soup', 'lentils', '150 g red lentils', false),
  ('red-lentil-soup', 'carrot', '2', false),
  ('red-lentil-soup', 'onion', '1', false),
  ('red-lentil-soup', 'garlic', '2 cloves', false),
  ('red-lentil-soup', 'canned tomatoes', '400 g can', false),
  ('red-lentil-soup', 'olive oil', '1 tbsp', true),
  ('red-lentil-soup', 'salt', 'to taste', true),

  ('sheet-pan-sweet-potato-chickpeas', 'sweet potato', '2 medium', false),
  ('sheet-pan-sweet-potato-chickpeas', 'chickpeas', '400 g can, drained', false),
  ('sheet-pan-sweet-potato-chickpeas', 'bell pepper', '1', false),
  ('sheet-pan-sweet-potato-chickpeas', 'onion', '1', false),
  ('sheet-pan-sweet-potato-chickpeas', 'olive oil', '2 tbsp', true),
  ('sheet-pan-sweet-potato-chickpeas', 'salt', 'pinch', true),

  ('quick-mushroom-risotto', 'rice', '150 g (arborio if you have it)', false),
  ('quick-mushroom-risotto', 'mushroom', '200 g', false),
  ('quick-mushroom-risotto', 'onion', '1', false),
  ('quick-mushroom-risotto', 'garlic', '2 cloves', false),
  ('quick-mushroom-risotto', 'parmesan', '30 g, grated', false),
  ('quick-mushroom-risotto', 'butter', '1 tbsp', false),
  ('quick-mushroom-risotto', 'olive oil', '1 tbsp', true),
  ('quick-mushroom-risotto', 'salt', 'to taste', true),

  ('veggie-noodle-stir-fry', 'noodles', '1 portion', false),
  ('veggie-noodle-stir-fry', 'carrot', '1', false),
  ('veggie-noodle-stir-fry', 'bell pepper', '½', false),
  ('veggie-noodle-stir-fry', 'garlic', '1 clove', false),
  ('veggie-noodle-stir-fry', 'soy sauce', '1-2 tbsp', false),
  ('veggie-noodle-stir-fry', 'olive oil', '1 tbsp', true),

  ('greek-salad', 'tomato', '2', false),
  ('greek-salad', 'cucumber', '½', false),
  ('greek-salad', 'feta', '60 g', false),
  ('greek-salad', 'onion', '¼ (red if possible)', false),
  ('greek-salad', 'olive oil', '1 tbsp', true),
  ('greek-salad', 'salt', 'pinch', true),

  ('avocado-egg-toast', 'bread', '2 slices', false),
  ('avocado-egg-toast', 'avocado', '½', false),
  ('avocado-egg-toast', 'egg', '1', false),
  ('avocado-egg-toast', 'olive oil', '1 tsp, for frying', true),
  ('avocado-egg-toast', 'salt', 'pinch', true),
  ('avocado-egg-toast', 'black pepper', 'pinch', true),

  ('spanish-potato-omelette', 'potato', '3 medium (about 500 g)', false),
  ('spanish-potato-omelette', 'egg', '5', false),
  ('spanish-potato-omelette', 'onion', '1', false),
  ('spanish-potato-omelette', 'olive oil', 'about 100 ml', true),
  ('spanish-potato-omelette', 'salt', 'to taste', true),

  ('chorizo-chickpea-stew', 'chorizo', '80 g', false),
  ('chorizo-chickpea-stew', 'chickpeas', '400 g can, drained', false),
  ('chorizo-chickpea-stew', 'canned tomatoes', '400 g can', false),
  ('chorizo-chickpea-stew', 'onion', '1', false),
  ('chorizo-chickpea-stew', 'garlic', '2 cloves', false),
  ('chorizo-chickpea-stew', 'olive oil', '1 tsp', true),
  ('chorizo-chickpea-stew', 'salt', 'to taste', true),

  ('pasta-peas-ham', 'pasta', '100 g', false),
  ('pasta-peas-ham', 'ham', '2 slices', false),
  ('pasta-peas-ham', 'frozen peas', '⅓ cup', false),
  ('pasta-peas-ham', 'parmesan', '20 g, grated', false),
  ('pasta-peas-ham', 'olive oil', '1 tbsp (or a knob of butter)', true),
  ('pasta-peas-ham', 'salt', 'for the water', true),

  ('loaded-jacket-potato', 'potato', '1 large', false),
  ('loaded-jacket-potato', 'black beans', '½ can, drained', false),
  ('loaded-jacket-potato', 'cheese', '40 g, grated', false),
  ('loaded-jacket-potato', 'yogurt', '2 tbsp', false),
  ('loaded-jacket-potato', 'salt', 'pinch', true),

  ('coconut-lentil-dal', 'lentils', '200 g red lentils', false),
  ('coconut-lentil-dal', 'coconut milk', '400 ml can', false),
  ('coconut-lentil-dal', 'onion', '1', false),
  ('coconut-lentil-dal', 'garlic', '2 cloves', false),
  ('coconut-lentil-dal', 'ginger', 'thumb-sized piece', false),
  ('coconut-lentil-dal', 'curry powder', '1 tbsp', false),
  ('coconut-lentil-dal', 'olive oil', '1 tbsp', true),
  ('coconut-lentil-dal', 'salt', 'to taste', true),

  ('zucchini-feta-pasta', 'pasta', '200 g', false),
  ('zucchini-feta-pasta', 'zucchini', '1 large', false),
  ('zucchini-feta-pasta', 'feta', '100 g', false),
  ('zucchini-feta-pasta', 'garlic', '2 cloves', false),
  ('zucchini-feta-pasta', 'lemon', '½', false),
  ('zucchini-feta-pasta', 'olive oil', '2 tbsp', true),
  ('zucchini-feta-pasta', 'salt', 'for the water', true),
  ('zucchini-feta-pasta', 'black pepper', 'to taste', true),

  ('banana-oat-pancakes', 'banana', '1 ripe', false),
  ('banana-oat-pancakes', 'egg', '2', false),
  ('banana-oat-pancakes', 'oats', '40 g', false),
  ('banana-oat-pancakes', 'olive oil', 'a few drops', true),

  ('chicken-salad-wrap', 'tortilla', '2', false),
  ('chicken-salad-wrap', 'chicken breast', '1', false),
  ('chicken-salad-wrap', 'lettuce', '1 handful', false),
  ('chicken-salad-wrap', 'tomato', '1', false),
  ('chicken-salad-wrap', 'yogurt', '3 tbsp', false),
  ('chicken-salad-wrap', 'olive oil', '1 tsp', true),
  ('chicken-salad-wrap', 'salt', 'pinch', true),
  ('chicken-salad-wrap', 'black pepper', 'pinch', true),

  ('garlic-mushrooms-on-toast', 'mushroom', '150 g', false),
  ('garlic-mushrooms-on-toast', 'bread', '2 slices', false),
  ('garlic-mushrooms-on-toast', 'butter', '1 tbsp', false),
  ('garlic-mushrooms-on-toast', 'garlic', '1 clove', false),
  ('garlic-mushrooms-on-toast', 'salt', 'pinch', true),
  ('garlic-mushrooms-on-toast', 'black pepper', 'pinch', true)
) as v (slug, ingredient, quantity, is_staple)
join public.recipes r on r.slug = v.slug
join public.ingredients i on i.name = v.ingredient
on conflict (recipe_id, ingredient_id) do update
  set quantity = excluded.quantity,
      is_staple = excluded.is_staple;


-- -----------------------------------------------------------------------------
-- 6. Sanity check — expect 25 recipes, 47 ingredients, 159 links
-- -----------------------------------------------------------------------------
select
  (select count(*) from public.recipes)            as recipes,
  (select count(*) from public.ingredients)        as ingredients,
  (select count(*) from public.recipe_ingredients) as recipe_ingredient_links;
