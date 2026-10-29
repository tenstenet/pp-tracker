// js/favorites.js
// Избранное: просмотр, удаление, быстрое добавление в дневник.
// Продукт — через панель граммовки (как на странице «Продукты»),
// рецепт — сразу, 1 порция.

document.addEventListener('DOMContentLoaded', async () => {
  if (!await window.authReady) return;
  const dateFromURL = pickDate(new URLSearchParams(location.search).get('date'));

  document.getElementById('back-link').href = `diary.html?date=${dateFromURL}`;

  const productsContainer = document.getElementById('fav-products');
  const recipesContainer  = document.getElementById('fav-recipes');
  const gramsPanel        = document.getElementById('grams-panel');
  const selNameEl         = document.getElementById('selected-product-name');
  const selKbjuEl         = document.getElementById('selected-product-kbju');
  const gramsForm         = document.getElementById('grams-form');
  const gramsInput        = document.getElementById('grams-input');
  const preview           = document.getElementById('preview');
  const cancelBtn         = document.getElementById('cancel-selection');
  const toast             = document.getElementById('toast');

  let favProducts = [];       // избранные продукты (КБЖУ на 100 г)
  let favRecipes  = [];       // избранные рецепты (КБЖУ на порцию)
  let selectedProduct = null;

  loadFavorites();

  // ============ ЗАГРУЗКА ============

  async function loadFavorites() {
    try {
      favProducts = await API.getFavorites('product');
      favRecipes  = await API.getFavorites('recipe');

      renderProducts(favProducts);
      renderRecipes(favRecipes);
    } catch (err) {
      console.error(err);
      productsContainer.innerHTML = `<div class="diary-empty" style="grid-column: 1 / -1;">Ошибка: ${escapeHtml(err.message)}</div>`;
      recipesContainer.innerHTML  = '';
    }
  }

  // ============ РЕНДЕР: ПРОДУКТЫ ============

  function renderProducts(items) {
    if (items.length === 0) {
      productsContainer.innerHTML = `
        <div class="diary-empty" style="grid-column: 1 / -1;">
          Ты пока не добавил ни один продукт в избранное
        </div>
      `;
      return;
    }

    productsContainer.innerHTML = items.map(p => `
      <div class="product-card">
        <div class="product-card__head">
          <div class="product-card__name">${escapeHtml(p.name)}</div>
          <button type="button" class="product-card__fav product-card__fav_active"
                  data-action="remove" data-type="product" data-id="${p.itemId}"
                  aria-label="Убрать из избранного">★</button>
        </div>
        <div class="product-card__kbju">
          ${p.calories} ккал · Б ${p.protein} · Ж ${p.fats} · У ${p.carbs}
        </div>
        <div class="product-card__hint">на 100 г</div>
        <div class="product-card__actions">
          <button type="button" class="button button_theme_green product-card__add"
                  data-action="add-product" data-id="${p.itemId}">В дневник</button>
          <button type="button" class="button button_theme_outline product-card__add"
                  data-action="remove" data-type="product" data-id="${p.itemId}">Убрать</button>
        </div>
      </div>
    `).join('');
  }

  // ============ РЕНДЕР: РЕЦЕПТЫ ============

  function renderRecipes(items) {
    if (items.length === 0) {
      recipesContainer.innerHTML = `
        <div class="diary-empty" style="grid-column: 1 / -1;">
          Ты пока не добавил ни один рецепт в избранное
        </div>
      `;
      return;
    }

    recipesContainer.innerHTML = items.map(r => `
      <div class="product-card">
        <div class="product-card__head">
          <div class="product-card__name">
            <a href="recipe.html?id=${r.itemId}&date=${dateFromURL}" style="color: inherit; text-decoration: none;">${escapeHtml(r.name)}</a>
          </div>
          <button type="button" class="product-card__fav product-card__fav_active"
                  data-action="remove" data-type="recipe" data-id="${r.itemId}"
                  aria-label="Убрать из избранного">★</button>
        </div>
        <div class="product-card__kbju">
          ${r.calories} ккал · Б ${r.protein} · Ж ${r.fats} · У ${r.carbs}
        </div>
        <div class="product-card__hint">${r.description ? escapeHtml(r.description) : 'на 1 порцию'}</div>
        <div class="product-card__actions">
          <button type="button" class="button button_theme_green product-card__add"
                  data-action="add-recipe" data-id="${r.itemId}">В дневник</button>
          <button type="button" class="button button_theme_outline product-card__add"
                  data-action="remove" data-type="recipe" data-id="${r.itemId}">Убрать</button>
        </div>
      </div>
    `).join('');
  }

  // Один обработчик на обе сетки (делегирование событий)
  [productsContainer, recipesContainer].forEach(container => {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = Number(btn.dataset.id);

      switch (btn.dataset.action) {
        case 'remove':      removeFav(btn.dataset.type, id); break;
        case 'add-product': selectProduct(id); break;
        case 'add-recipe':  addRecipeToDiary(id); break;
      }
    });
  });

  // ============ УДАЛЕНИЕ ИЗ ИЗБРАННОГО ============

  async function removeFav(type, itemId) {
    try {
      await API.removeFavorite(type, itemId);

      // если убрали продукт, который сейчас выбран для граммовки, закрываем панель
      if (type === 'product' && selectedProduct && selectedProduct.itemId === itemId) {
        closeGramsPanel();
      }

      showToast('Убрано из избранного');
      loadFavorites();
    } catch (err) {
      alert(err.message);
    }
  }

  // ============ ПРОДУКТ → ДНЕВНИК (с граммовкой) ============

  function selectProduct(itemId) {
    selectedProduct = favProducts.find(p => p.itemId === itemId);
    if (!selectedProduct) return;

    selNameEl.textContent = selectedProduct.name;
    selKbjuEl.textContent = `На 100 г: ${selectedProduct.calories} ккал · Б ${selectedProduct.protein} · Ж ${selectedProduct.fats} · У ${selectedProduct.carbs}`;
    gramsInput.value = 100;
    clearGramsError();

    updatePreview();
    gramsPanel.style.display = 'block';

    gramsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => gramsInput.focus({ preventScroll: true }), 400);
  }

  function closeGramsPanel() {
    selectedProduct = null;
    gramsPanel.style.display = 'none';
  }

  cancelBtn.addEventListener('click', closeGramsPanel);

  function updatePreview() {
    if (!selectedProduct) return;
    const grams = Number(gramsInput.value) || 0;
    const f = grams / 100;

    preview.innerHTML = `
      <div class="grams-panel__preview-title">Итого за ${grams} г:</div>
      <div class="grams-panel__preview-values">
        <b>${Math.round(selectedProduct.calories * f)} ккал</b>
        · Б ${round1(selectedProduct.protein * f)}
        · Ж ${round1(selectedProduct.fats * f)}
        · У ${round1(selectedProduct.carbs * f)}
      </div>
    `;
  }

  gramsInput.addEventListener('input', updatePreview);

  gramsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    clearGramsError();
    const grams = Number(gramsInput.value);

    if (!grams || grams <= 0 || grams > 5000) {
      document.querySelector('[data-error-for="grams-input"]').textContent = 'Введите число от 1 до 5000';
      gramsInput.classList.add('form__input_error');
      return;
    }

    const f = grams / 100;
    try {
      await API.addMeal({
        type: 'product',
        date: dateFromURL,
        productId: selectedProduct.itemId,
        name: selectedProduct.name,
        grams: grams,
        calories: selectedProduct.calories * f,
        protein:  selectedProduct.protein  * f,
        fats:     selectedProduct.fats     * f,
        carbs:    selectedProduct.carbs    * f
      });
      showToast(`Добавлено в дневник за ${dateLabel()}`);
      closeGramsPanel();
    } catch (err) {
      alert(err.message);
    }
  });

  function clearGramsError() {
    document.querySelector('[data-error-for="grams-input"]').textContent = '';
    gramsInput.classList.remove('form__input_error');
  }

  // ============ РЕЦЕПТ → ДНЕВНИК (1 порция) ============

  async function addRecipeToDiary(itemId) {
    const recipe = favRecipes.find(r => r.itemId === itemId);
    if (!recipe) return;

    try {
      await API.addMeal({
        type: 'recipe',
        date: dateFromURL,
        recipeId: recipe.itemId,
        name: recipe.name,
        calories: recipe.calories,
        protein:  recipe.protein,
        fats:     recipe.fats,
        carbs:    recipe.carbs
      });
      showToast(`Добавлено в дневник за ${dateLabel()}`);
    } catch (err) {
      alert(err.message);
    }
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

  // «сегодня» или «1 октября», чтобы было видно, в какой день попала запись
  function dateLabel() {
    if (dateFromURL === toISO(new Date())) return 'сегодня';
    return new Date(dateFromURL + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }

  function round1(n) { return Math.round(n * 10) / 10; }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
