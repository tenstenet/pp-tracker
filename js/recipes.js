// js/recipes.js
// Список рецептов: поиск, фильтр по категории, добавление в дневник (1 порция),
// избранное, переход в карточку рецепта. Для администратора — добавление,
// изменение и удаление рецептов.

document.addEventListener('DOMContentLoaded', () => {
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
  let renderToken = 0; // защита от гонки при быстром вводе в поиск

  if (isAdmin) addBtn.style.display = '';

  refresh();
  searchInput.addEventListener('input', refresh);
  categorySelect.addEventListener('change', refresh);

  // ============ ЗАГРУЗКА И РЕНДЕР ============

  async function refresh() {
    const token = ++renderToken;
    try {
      const [items, favs] = await Promise.all([
        API.getRecipes({ search: searchInput.value, category: categorySelect.value }),
        API.getFavorites('recipe').catch(() => [])
      ]);
      if (token !== renderToken) return;

      recipes = items;
      renderGrid(items, new Set(favs.map(f => f.itemId)));
    } catch (err) {
      console.error(err);
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

  function openForm(recipe) {
    if (!isAdmin) return;
    clearFormErrors();

    rTitle.textContent = recipe ? 'Изменить рецепт' : 'Новый рецепт';
    field('id').value          = recipe ? recipe.id : '';
    field('name').value        = recipe ? recipe.name : '';
    field('category').value    = recipe ? recipe.category : Object.keys(categories)[0];
    field('description').value = recipe ? (recipe.description || '') : '';
    ['calories', 'protein', 'fats', 'carbs'].forEach(k => {
      field(k).value = recipe ? recipe[k] : '';
    });
    field('ingredients').value = recipe ? (recipe.ingredients || []).join('\n') : '';
    field('steps').value       = recipe ? (recipe.steps || []).join('\n') : '';

    adminPanel.style.display = 'block';
    adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeForm() {
    adminPanel.style.display = 'none';
  }

  rForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors();

    const data = readForm();
    if (!data) return;

    const id = field('id').value;
    try {
      if (id) await API.updateRecipe(Number(id), data);
      else    await API.addRecipe(data);

      closeForm();
      showToast(id ? 'Рецепт обновлён' : 'Рецепт добавлен');
      refresh();
    } catch (err) {
      showFormError('recipe-name', err.message);
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

    const values = {};
    [['calories', 3000, 'ккал'], ['protein', 300, 'г'], ['fats', 300, 'г'], ['carbs', 500, 'г']].forEach(([k, max, unit]) => {
      const raw = field(k).value.trim();
      const n = Number(raw);
      if (raw === '' || !isFinite(n)) return fail('recipe-' + k, 'Введите число');
      if (n < 0) return fail('recipe-' + k, 'Не меньше 0');
      if (n > max) return fail('recipe-' + k, `Не больше ${max} ${unit}`);
      values[k] = n;
    });

    const ingredients = lines(field('ingredients').value);
    if (ingredients.length === 0) fail('recipe-ingredients', 'Добавьте хотя бы один ингредиент');

    const steps = lines(field('steps').value);
    if (steps.length === 0) fail('recipe-steps', 'Добавьте хотя бы один шаг');

    return ok ? { name, category, description, ...values, ingredients, steps } : null;
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
