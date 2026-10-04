// js/recipe.js
// Карточка рецепта: описание, КБЖУ на порцию, ингредиенты и шаги приготовления.
// Адрес: recipe.html?id=3[&date=YYYY-MM-DD]
// Все данные приходят из API.getRecipe(id), поэтому после подключения БД
// и правок администратора страница менять не нужно.

document.addEventListener('DOMContentLoaded', () => {
  const params     = new URLSearchParams(location.search);
  const recipeId   = Number(params.get('id'));
  const dateFromURL = pickDate(params.get('date'));

  document.getElementById('back-link').href = `recipes.html?date=${dateFromURL}`;

  // ---- Элементы ----
  const titleEl       = document.getElementById('recipe-title');
  const categoryEl    = document.getElementById('recipe-category-label');
  const cardEl        = document.getElementById('recipe-card');
  const descriptionEl = document.getElementById('recipe-description-text');
  const kbjuEl        = document.getElementById('recipe-kbju');
  const ingredientsEl = document.getElementById('recipe-ingredients-list');
  const stepsEl       = document.getElementById('recipe-steps-list');
  const notFoundEl    = document.getElementById('recipe-not-found');
  const addBtn        = document.getElementById('add-to-diary');
  const favBtn        = document.getElementById('fav-btn');
  const toast         = document.getElementById('toast');

  let recipe = null;
  let isFav = false;

  load();

  async function load() {
    try {
      recipe = Number.isInteger(recipeId) && recipeId > 0 ? await API.getRecipe(recipeId) : null;
    } catch (err) {
      console.error(err);
      recipe = null;
    }

    if (!recipe) {
      titleEl.textContent = 'Рецепт не найден';
      categoryEl.textContent = '';
      cardEl.style.display = 'none';
      notFoundEl.style.display = 'block';
      return;
    }

    render();

    try {
      isFav = await API.isFavorite('recipe', recipe.id);
    } catch (err) {
      isFav = false;
    }
    renderFav();
  }

  function render() {
    document.title = `${recipe.name} — FoodDiary`;
    titleEl.textContent = recipe.name;
    categoryEl.textContent = API.RECIPE_CATEGORIES[recipe.category] || '';

    descriptionEl.textContent = recipe.description || '';
    descriptionEl.style.display = recipe.description ? '' : 'none';

    kbjuEl.textContent = `${recipe.calories} ккал · Б ${recipe.protein} · Ж ${recipe.fats} · У ${recipe.carbs}`;

    ingredientsEl.innerHTML = (recipe.ingredients || [])
      .map(i => `<li>${escapeHtml(i)}</li>`).join('');

    stepsEl.innerHTML = (recipe.steps || [])
      .map(s => `<li>${escapeHtml(s)}</li>`).join('');
  }

  function renderFav() {
    favBtn.textContent = isFav ? '★ В избранном' : '★ В избранное';
    favBtn.classList.toggle('button_theme_green', isFav);
    favBtn.classList.toggle('button_theme_outline', !isFav);
  }

  // ============ ИЗБРАННОЕ ============

  favBtn.addEventListener('click', async () => {
    if (!recipe) return;
    try {
      if (isFav) {
        await API.removeFavorite('recipe', recipe.id);
        isFav = false;
        showToast('Убрано из избранного');
      } else {
        await API.addFavorite({ type: 'recipe', itemId: recipe.id });
        isFav = true;
        showToast('Добавлено в избранное');
      }
      renderFav();
    } catch (err) {
      alert(err.message);
    }
  });

  // ============ ДОБАВЛЕНИЕ В ДНЕВНИК (1 порция) ============

  addBtn.addEventListener('click', async () => {
    if (!recipe) return;
    try {
      await API.addMeal({
        type: 'recipe',
        date: dateFromURL,
        recipeId: recipe.id,
        name: recipe.name,
        calories: recipe.calories,
        protein:  recipe.protein,
        fats:     recipe.fats,
        carbs:    recipe.carbs
      });
      showToast('Добавлено в дневник');
    } catch (err) {
      alert(err.message);
    }
  });

  // ============ TOAST ============
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('toast_visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast_visible'), 2500);
  }

  // ============ УТИЛИТЫ ============
  function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function pickDate(raw) {
    const today = toISO(new Date());
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(raw + 'T00:00:00');
      if (!isNaN(d.getTime()) && toISO(d) === raw && raw <= today) return raw;
    }
    return today;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
