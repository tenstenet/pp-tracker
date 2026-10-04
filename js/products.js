// js/products.js
// Справочник продуктов: поиск, фильтр по категории, добавление в дневник,
// избранное. Для администратора — добавление, изменение и удаление продуктов.

document.addEventListener('DOMContentLoaded', () => {
  const dateFromURL = pickDate(new URLSearchParams(location.search).get('date'));
  document.getElementById('back-link').href = `diary.html?date=${dateFromURL}`;

  const isAdmin    = API.isAdmin();
  const categories = API.PRODUCT_CATEGORIES;

  // ---- Элементы ----
  const grid           = document.getElementById('products-grid');
  const searchInput    = document.getElementById('search');
  const categorySelect = document.getElementById('category-filter');
  const emptySearch    = document.getElementById('empty-search');
  const gramsPanel     = document.getElementById('grams-panel');
  const selNameEl      = document.getElementById('selected-product-name');
  const selKbjuEl      = document.getElementById('selected-product-kbju');
  const gramsForm      = document.getElementById('grams-form');
  const gramsInput     = document.getElementById('grams-input');
  const preview        = document.getElementById('preview');
  const cancelBtn      = document.getElementById('cancel-selection');
  const toast          = document.getElementById('toast');

  // админ-панель
  const addBtn     = document.getElementById('admin-add-product');
  const adminPanel = document.getElementById('product-admin-panel');
  const pForm      = document.getElementById('product-form');
  const pTitle     = document.getElementById('product-form-title');
  const pCancel    = document.getElementById('product-cancel');
  const field      = (name) => document.getElementById('product-' + name);

  let products = [];          // последний показанный список
  let selectedProduct = null;
  let renderToken = 0;        // защита от гонки при быстром вводе в поиск

  if (isAdmin) addBtn.style.display = '';

  refresh();
  searchInput.addEventListener('input', refresh);
  categorySelect.addEventListener('change', refresh);

  // ============ ЗАГРУЗКА И РЕНДЕР ============

  async function refresh() {
    const token = ++renderToken;
    try {
      const [items, favs] = await Promise.all([
        API.getProducts({ search: searchInput.value, category: categorySelect.value }),
        API.getFavorites('product').catch(() => [])
      ]);
      if (token !== renderToken) return; // пришёл устаревший ответ

      products = items;
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

    grid.innerHTML = items.map(p => {
      const isFav = favIds.has(p.id);
      return `
        <div class="product-card">
          <div class="product-card__head">
            <div class="product-card__name">${escapeHtml(p.name)}</div>
            <button type="button" class="product-card__fav ${isFav ? 'product-card__fav_active' : ''}"
                    data-action="fav" data-id="${p.id}" aria-label="В избранное">★</button>
          </div>
          <div class="product-card__kbju">
            ${p.calories} ккал · Б ${p.protein} · Ж ${p.fats} · У ${p.carbs}
          </div>
          <div class="product-card__hint">на 100 г · ${escapeHtml(categories[p.category] || 'Без категории')}</div>
          <div class="product-card__actions">
            <button type="button" class="button button_theme_green product-card__add"
                    data-action="add" data-id="${p.id}">Добавить</button>
          </div>
          ${isAdmin ? `
          <div class="product-card__actions">
            <button type="button" class="button button_theme_outline product-card__add"
                    data-action="edit" data-id="${p.id}">Изменить</button>
            <button type="button" class="button button_theme_outline product-card__add"
                    data-action="delete" data-id="${p.id}">Удалить</button>
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
      case 'add':    selectProduct(id); break;
      case 'fav':    toggleFavorite(id, btn); break;
      case 'edit':   openForm(products.find(p => p.id === id)); break;
      case 'delete': deleteProduct(id); break;
    }
  });

  // ============ ИЗБРАННОЕ ============

  async function toggleFavorite(productId, btnEl) {
    try {
      if (btnEl.classList.contains('product-card__fav_active')) {
        await API.removeFavorite('product', productId);
        btnEl.classList.remove('product-card__fav_active');
        showToast('Убрано из избранного');
      } else {
        await API.addFavorite({ type: 'product', itemId: productId });
        btnEl.classList.add('product-card__fav_active');
        showToast('Добавлено в избранное');
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  // ============ ВЫБОР ПРОДУКТА И ГРАММОВКА ============

  function selectProduct(productId) {
    selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;

    closeForm();
    selNameEl.textContent = selectedProduct.name;
    selKbjuEl.textContent = `На 100 г: ${selectedProduct.calories} ккал · Б ${selectedProduct.protein} · Ж ${selectedProduct.fats} · У ${selectedProduct.carbs}`;
    gramsInput.value = 100;

    updatePreview();
    gramsPanel.style.display = 'block';

    gramsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => gramsInput.focus({ preventScroll: true }), 400);
  }

  cancelBtn.addEventListener('click', () => {
    selectedProduct = null;
    gramsPanel.style.display = 'none';
  });

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

  // ============ ДОБАВЛЕНИЕ В ДНЕВНИК ============

  gramsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const grams = Number(gramsInput.value);
    const errEl = document.querySelector('[data-error-for="grams-input"]');
    errEl.textContent = '';
    gramsInput.classList.remove('form__input_error');

    if (!grams || grams <= 0 || grams > 5000) {
      errEl.textContent = 'Введите число от 1 до 5000';
      gramsInput.classList.add('form__input_error');
      return;
    }

    const f = grams / 100;
    const meal = {
      type: 'product',
      date: dateFromURL,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      grams: grams,
      calories: selectedProduct.calories * f,
      protein:  selectedProduct.protein  * f,
      fats:     selectedProduct.fats     * f,
      carbs:    selectedProduct.carbs    * f
    };

    try {
      await API.addMeal(meal);
      showToast('Добавлено в дневник');
      selectedProduct = null;
      gramsPanel.style.display = 'none';
    } catch (err) {
      alert(err.message);
    }
  });

  // ============ АДМИНИСТРАТОР: ДОБАВЛЕНИЕ / ИЗМЕНЕНИЕ / УДАЛЕНИЕ ============

  addBtn.addEventListener('click', () => openForm(null));
  pCancel.addEventListener('click', closeForm);

  function openForm(product) {
    if (!isAdmin) return;
    selectedProduct = null;
    gramsPanel.style.display = 'none';
    clearFormErrors();

    pTitle.textContent = product ? 'Изменить продукт' : 'Новый продукт';
    field('id').value       = product ? product.id : '';
    field('name').value     = product ? product.name : '';
    field('category').value = product ? product.category : Object.keys(categories)[0];
    ['calories', 'protein', 'fats', 'carbs'].forEach(k => {
      field(k).value = product ? product[k] : '';
    });

    adminPanel.style.display = 'block';
    adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeForm() {
    adminPanel.style.display = 'none';
  }

  pForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors();

    const data = readForm();
    if (!data) return;

    const id = field('id').value;
    try {
      if (id) await API.updateProduct(Number(id), data);
      else    await API.addProduct(data);

      closeForm();
      showToast(id ? 'Продукт обновлён' : 'Продукт добавлен');
      refresh();
    } catch (err) {
      showFormError('product-name', err.message);
    }
  });

  // Возвращает данные формы или null, если есть ошибки (они уже показаны)
  function readForm() {
    let ok = true;
    const fail = (id, msg) => { showFormError(id, msg); ok = false; };

    const name = field('name').value.trim();
    if (name.length < 2) fail('product-name', 'Введите название');

    const category = field('category').value;
    if (!categories[category]) fail('product-category', 'Выберите категорию');

    const values = {};
    [['calories', 900, 'ккал'], ['protein', 100, 'г'], ['fats', 100, 'г'], ['carbs', 100, 'г']].forEach(([k, max, unit]) => {
      const raw = field(k).value.trim();
      const n = Number(raw);
      if (raw === '' || !isFinite(n)) return fail('product-' + k, 'Введите число');
      if (n < 0) return fail('product-' + k, 'Не меньше 0');
      if (n > max) return fail('product-' + k, `Не больше ${max} ${unit} на 100 г`);
      values[k] = n;
    });

    if (ok && values.protein + values.fats + values.carbs > 100) {
      fail('product-carbs', 'Сумма белков, жиров и углеводов не может быть больше 100 г');
    }
    return ok ? { name, category, ...values } : null;
  }

  async function deleteProduct(id) {
    const p = products.find(x => x.id === id);
    if (!confirm(`Удалить продукт «${p ? p.name : ''}»? Он пропадёт из справочника и избранного.`)) return;
    try {
      await API.deleteProduct(id);
      showToast('Продукт удалён');
      refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  function showFormError(id, message) {
    const input = document.getElementById(id);
    const error = pForm.querySelector(`[data-error-for="${id}"]`);
    if (input) input.classList.add('form__input_error');
    if (error) error.textContent = message;
  }

  function clearFormErrors() {
    pForm.querySelectorAll('.form__error').forEach(el => el.textContent = '');
    pForm.querySelectorAll('.form__input_error').forEach(el => el.classList.remove('form__input_error'));
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

  function round1(n) { return Math.round(n * 10) / 10; }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
