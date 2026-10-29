// js/recipes.js
// Список рецептов: поиск, фильтр по категории, добавление в дневник (1 порция),
// избранное, переход в карточку рецепта. Для администратора — добавление,
// изменение и удаление рецептов.

document.addEventListener('DOMContentLoaded', async () => {
  if (!await window.authReady) return;
  const dateFromURL = pickDate(new URLSearchParams(location.search).get('date'));
  document.getElementById('back-link').href = `diary.html?date=${dateFromURL}`;

  const isAdmin    = API.isAdmin();
  const categories = API.RECIPE_CATEGORIES;

  // ---- Элементы ----
  const grid           = document.getElementById('recipes-grid');
  const searchInput    = document.getElementById('search');
  const categorySelect = document.getElementById('category-filter');
  const emptySearch    = document.getElementById('empty-search');
  const toast          = document.getElementById('toast');

  // админ-панель
  const addBtn     = document.getElementById('admin-add-recipe');
  const adminPanel = document.getElementById('recipe-admin-panel');
  const rForm      = document.getElementById('recipe-form');
  const rTitle     = document.getElementById('recipe-form-title');
  const rCancel    = document.getElementById('recipe-cancel');
  const field      = (name) => document.getElementById('recipe-' + name);

  let recipes = [];
  let ingredientProducts = [];
  let formVersion = 0;
  let renderToken = 0; // защита от гонки при быстром вводе в поиск

  if (isAdmin) addBtn.style.display = '';

  refresh();
  searchInput.addEventListener('input', refresh);
  categorySelect.addEventListener('change', refresh);

  // ============ ЗАГРУЗКА И РЕНДЕР ============

  async function refresh() {
    const token = ++renderToken;
    try {
      const items = await API.getRecipes({ search: searchInput.value, category: categorySelect.value });
      if (token !== renderToken) return;

      recipes = items;
      renderGrid(items, new Set(items.filter(item => item.isFavorite).map(item => item.id)));
    } catch (err) {
      console.error(err);
      emptySearch.style.display = 'none';
      grid.style.display = 'grid';
      grid.innerHTML = `<div class="diary-empty" style="grid-column: 1 / -1;">Ошибка: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderGrid(items, favIds) {
    const isEmpty = items.length === 0;
    emptySearch.style.display = isEmpty ? 'block' : 'none';
    grid.style.display        = isEmpty ? 'none'  : 'grid';

    grid.innerHTML = items.map(r => {
      const isFav = favIds.has(r.id);
      return `
        <div class="product-card">
          ${r.imagePath ? `<img class="product-card__image" src="${escapeHtml(API.getImageUrl(r.imagePath))}" alt="${escapeHtml(r.name)}" loading="lazy">` : ''}
          <div class="product-card__head">
            <div class="product-card__name">${escapeHtml(r.name)}</div>
            <button type="button" class="product-card__fav ${isFav ? 'product-card__fav_active' : ''}"
                    data-action="fav" data-id="${r.id}" aria-label="В избранное">★</button>
          </div>
          <div class="product-card__kbju">
            ${r.calories} ккал · Б ${r.protein} · Ж ${r.fats} · У ${r.carbs}
          </div>
          <div class="product-card__hint">
            ${escapeHtml(categories[r.category] || 'Без категории')}${r.description ? ' · ' + escapeHtml(r.description) : ''}
          </div>
          <div class="product-card__actions">
            <a class="button button_theme_outline product-card__add"
               href="recipe.html?id=${r.id}&date=${dateFromURL}">Рецепт</a>
            <button type="button" class="button button_theme_green product-card__add"
                    data-action="add" data-id="${r.id}">В дневник</button>
          </div>
          ${isAdmin ? `
          <div class="product-card__actions">
            <button type="button" class="button button_theme_outline product-card__add"
                    data-action="edit" data-id="${r.id}">Изменить</button>
            <button type="button" class="button button_theme_outline product-card__add"
                    data-action="delete" data-id="${r.id}">Удалить</button>
          </div>` : ''}
        </div>
      `;
    }).join('');
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);

    switch (btn.dataset.action) {
      case 'add':    addToDiary(id); break;
      case 'fav':    toggleFavorite(id, btn); break;
      case 'edit':   openForm(recipes.find(r => r.id === id)); break;
      case 'delete': deleteRecipe(id); break;
    }
  });

  // ============ ИЗБРАННОЕ ============

  async function toggleFavorite(recipeId, btnEl) {
    try {
      if (btnEl.classList.contains('product-card__fav_active')) {
        await API.removeFavorite('recipe', recipeId);
        btnEl.classList.remove('product-card__fav_active');
        showToast('Убрано из избранного');
      } else {
        await API.addFavorite({ type: 'recipe', itemId: recipeId });
        btnEl.classList.add('product-card__fav_active');
        showToast('Добавлено в избранное');
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  // ============ ДОБАВЛЕНИЕ В ДНЕВНИК (1 порция) ============

  async function addToDiary(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
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
  }

  // ============ АДМИНИСТРАТОР: ДОБАВЛЕНИЕ / ИЗМЕНЕНИЕ / УДАЛЕНИЕ ============

  addBtn.addEventListener('click', () => openForm(null));
  rCancel.addEventListener('click', closeForm);

  // openForm(recipe) — загрузить продукты и открыть редактор рецепта
  async function openForm(recipe) {
    if (!isAdmin) return;
    const version = ++formVersion;
    try {
      const items = await API.getProducts();
      if (version !== formVersion) return;
      ingredientProducts = items;
      clearFormErrors();
      rTitle.textContent = recipe ? 'Изменить рецепт' : 'Новый рецепт';
      field('id').value = recipe ? recipe.id : '';
      field('name').value = recipe ? recipe.name : '';
      field('category').value = recipe ? recipe.category : Object.keys(categories)[0];
      field('description').value = recipe ? recipe.description : '';
      field('steps').value = recipe ? recipe.steps.join('\n') : '';
      field('ingredients').replaceChildren();
      const ingredients = recipe ? recipe.ingredientItems : [];
      if (ingredients.length) ingredients.forEach(addIngredientRow);
      else addIngredientRow();
      updateNutritionPreview();
      adminPanel.style.display = 'block';
      adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showToast('Не удалось открыть рецепт: ' + error.message);
    }
  }

  // addIngredientRow(item) — добавить выбор продукта и его граммовки
  function addIngredientRow(item = {}) {
    const row = document.createElement('div');
    row.className = 'recipe-ingredient-row';
    const select = document.createElement('select');
    select.className = 'form__select';
    select.setAttribute('aria-label', 'Продукт');
    select.add(new Option('Выберите продукт', ''));
    ingredientProducts.forEach(product => select.add(new Option(product.name, product.id)));
    select.value = item.product_id || '';
    const grams = document.createElement('input');
    grams.type = 'number';
    grams.className = 'form__input';
    grams.min = '0.01';
    grams.max = '4999.99';
    grams.step = '0.01';
    grams.placeholder = 'Граммы';
    grams.setAttribute('aria-label', 'Количество в граммах');
    grams.value = item.amount_grams || 100;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button_theme_outline';
    remove.textContent = 'Убрать';
    remove.addEventListener('click', () => { row.remove(); updateNutritionPreview(); });
    select.addEventListener('change', updateNutritionPreview);
    grams.addEventListener('input', updateNutritionPreview);
    row.append(select, grams, remove);
    field('ingredients').append(row);
  }

  // updateNutritionPreview() — показать КБЖУ выбранных ингредиентов
  function updateNutritionPreview() {
    const totals = { calories: 0, protein: 0, fats: 0, carbs: 0 };
    field('ingredients').querySelectorAll('.recipe-ingredient-row').forEach(row => {
      const product = ingredientProducts.find(item => item.id === Number(row.querySelector('select').value));
      const grams = Number(row.querySelector('input').value);
      if (!product || !Number.isFinite(grams) || grams <= 0 || grams >= 5000) return;
      Object.keys(totals).forEach(key => { totals[key] += product[key] * grams / 100; });
    });
    document.getElementById('recipe-nutrition').textContent =
      'Одна порция — весь рецепт: ' + Math.round(totals.calories) + ' ккал · Б ' + totals.protein.toFixed(1) +
      ' · Ж ' + totals.fats.toFixed(1) + ' · У ' + totals.carbs.toFixed(1);
  }

  document.getElementById('recipe-add-ingredient').addEventListener('click', () => {
    addIngredientRow();
    updateNutritionPreview();
  });

  function closeForm() {
    formVersion++;
    adminPanel.style.display = 'none';
  }

  rForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors();

    const data = readForm();
    if (!data) return;

    const id = field('id').value;
    const submit = rForm.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      if (id) await API.updateRecipe(Number(id), data);
      else    await API.addRecipe(data);

      closeForm();
      showToast(id ? 'Рецепт обновлён' : 'Рецепт добавлен');
      refresh();
    } catch (err) {
      showFormError('recipe-name', err.message);
    } finally {
      submit.disabled = false;
    }
  });

  // Возвращает данные формы или null, если есть ошибки (они уже показаны)
  function readForm() {
    let ok = true;
    const fail = (id, msg) => { showFormError(id, msg); ok = false; };
    const lines = (text) => text.split('\n').map(s => s.trim()).filter(Boolean);

    const name = field('name').value.trim();
    if (name.length < 2) fail('recipe-name', 'Введите название');

    const category = field('category').value;
    if (!categories[category]) fail('recipe-category', 'Выберите категорию');

    const description = field('description').value.trim();
    if (description.length > 120) fail('recipe-description', 'Не больше 120 символов');

    const ingredients = [];
    const seen = new Set();
    field('ingredients').querySelectorAll('.recipe-ingredient-row').forEach(row => {
      const productId = Number(row.querySelector('select').value);
      const grams = Number(row.querySelector('input').value);
      if (!ingredientProducts.some(product => product.id === productId)) {
        fail('recipe-ingredients', 'Выберите продукт для каждого ингредиента');
      } else if (seen.has(productId)) {
        fail('recipe-ingredients', 'Продукт повторяется. Объедините его граммовку в одной строке');
      }
      if (!Number.isFinite(grams) || grams <= 0 || grams >= 5000) {
        fail('recipe-ingredients', 'Граммовка каждого ингредиента должна быть больше 0 и меньше 5000');
      }
      seen.add(productId);
      ingredients.push({ product_id: productId, amount_grams: grams });
    });
    if (!ingredients.length) fail('recipe-ingredients', 'Добавьте хотя бы один ингредиент');

    const steps = lines(field('steps').value);
    if (steps.length === 0) fail('recipe-steps', 'Добавьте хотя бы один шаг');

    return ok ? { name, category, description, ingredients, steps } : null;
  }

  async function deleteRecipe(id) {
    const r = recipes.find(x => x.id === id);
    if (!confirm(`Удалить рецепт «${r ? r.name : ''}»? Он пропадёт из справочника и избранного.`)) return;
    try {
      await API.deleteRecipe(id);
      showToast('Рецепт удалён');
      refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  function showFormError(id, message) {
    const input = document.getElementById(id);
    const error = rForm.querySelector(`[data-error-for="${id}"]`);
    if (input) input.classList.add('form__input_error');
    if (error) error.textContent = message;
  }

  function clearFormErrors() {
    rForm.querySelectorAll('.form__error').forEach(el => el.textContent = '');
    rForm.querySelectorAll('.form__input_error').forEach(el => el.classList.remove('form__input_error'));
  }

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

  // Дата из адреса: только корректная и не из будущего, иначе сегодня
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
