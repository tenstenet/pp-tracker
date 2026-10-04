// js/favorites.js

document.addEventListener('DOMContentLoaded', () => {
  const dateFromURL = pickDate(new URLSearchParams(location.search).get('date'));

  document.getElementById('back-link').href = `diary.html?date=${dateFromURL}`;

  const productsContainer = document.getElementById('fav-products');
  const recipesContainer  = document.getElementById('fav-recipes');
  const toast             = document.getElementById('toast');

  loadFavorites();

  // ============ ЗАГРУЗКА ============

  async function loadFavorites() {
    try {
      const products = await API.getFavorites('product');
      const recipes  = await API.getFavorites('recipe');

      renderProducts(products);
      renderRecipes(recipes);
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
                  data-type="product" data-id="${p.itemId}" aria-label="Убрать из избранного">★</button>
        </div>
        <div class="product-card__kbju">
          ${p.calories} ккал · Б ${p.protein} · Ж ${p.fats} · У ${p.carbs}
        </div>
        <div class="product-card__hint">на 100 г</div>
        <button type="button" class="button button_theme_outline product-card__add"
                data-type="product" data-id="${p.itemId}">
          Убрать из избранного
        </button>
      </div>
    `).join('');

    productsContainer.querySelectorAll('.product-card__fav, .product-card__add').forEach(btn => {
      btn.addEventListener('click', () => removeFav('product', Number(btn.dataset.id)));
    });
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
                  data-type="recipe" data-id="${r.itemId}" aria-label="Убрать из избранного">★</button>
        </div>
        <div class="product-card__kbju">
          ${r.calories} ккал · Б ${r.protein} · Ж ${r.fats} · У ${r.carbs}
        </div>
        ${r.description ? `<div class="product-card__hint">${escapeHtml(r.description)}</div>` : ''}
        <button type="button" class="button button_theme_outline product-card__add"
                data-type="recipe" data-id="${r.itemId}">
          Убрать из избранного
        </button>
      </div>
    `).join('');

    recipesContainer.querySelectorAll('.product-card__fav, .product-card__add').forEach(btn => {
      btn.addEventListener('click', () => removeFav('recipe', Number(btn.dataset.id)));
    });
  }

  // ============ УДАЛЕНИЕ ============

  async function removeFav(type, itemId) {
    try {
      await API.removeFavorite(type, itemId);
      showToast('Убрано из избранного');
      loadFavorites();
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
