// js/diary.js

document.addEventListener('DOMContentLoaded', () => {
  // ---- Состояние ----
  // Дата берётся из ?date=YYYY-MM-DD (после добавления еды со страниц продуктов/рецептов),
  // иначе — сегодня. Будущие даты не допускаются.
  const fromUrl = new URLSearchParams(location.search).get('date');
  let currentDate = (isValidISO(fromUrl) && fromUrl <= todayISO()) ? fromUrl : todayISO();

  // ---- Элементы ----
  const dateEl       = document.getElementById('current-date');
  const datePicker   = document.getElementById('date-picker');
  const prevBtn      = document.getElementById('prev-day');
  const nextBtn      = document.getElementById('next-day');
  const productsList = document.getElementById('products-list');
  const recipesList  = document.getElementById('recipes-list');

  const totalCaloriesEl = document.getElementById('total-calories');
  const totalProteinEl  = document.getElementById('total-protein');
  const totalFatsEl     = document.getElementById('total-fats');
  const totalCarbsEl    = document.getElementById('total-carbs');

  // ---- Инициализация ----
  renderDate();
  loadAndRender();

  prevBtn.addEventListener('click', () => changeDay(-1));
  nextBtn.addEventListener('click', () => changeDay(1));

  if (datePicker) {
    datePicker.addEventListener('change', () => {
      const value = datePicker.value;
      if (!isValidISO(value) || value > todayISO()) {
        datePicker.value = currentDate; // пусто или будущее — возвращаем прежнюю дату
        return;
      }
      currentDate = value;
      renderDate();
      loadAndRender();
    });
  }

  document.querySelectorAll('.diary-section__add').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type; // 'product' | 'recipe'
      goToAddPage(type);
    });
  });

  // ---- Логика ----

  function toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function todayISO() {
    return toISO(new Date());
  }

  function isValidISO(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00');
    return !isNaN(d.getTime()) && toISO(d) === value;
  }

  function changeDay(delta) {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);

    const next = toISO(d);
    if (next > todayISO()) return; // не пускаем в будущее

    currentDate = next;
    renderDate();
    loadAndRender();
  }

  function renderDate() {
    const d = new Date(currentDate + 'T00:00:00');
    dateEl.textContent = d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });

    if (datePicker) {
      datePicker.max = todayISO();
      datePicker.value = currentDate;
    }

    // Скрываем стрелку «вперёд», если уже сегодня
    nextBtn.style.visibility = (currentDate === todayISO()) ? 'hidden' : 'visible';

    // Дата остаётся в адресе — после обновления страницы откроется тот же день
    try { history.replaceState(null, '', `?date=${currentDate}`); } catch (e) { /* не критично */ }
  }

  async function loadAndRender() {
    const dateAtRequest = currentDate;
    try {
      const meals = await API.getMeals(dateAtRequest);
      if (dateAtRequest !== currentDate) return; // пользователь уже перешёл на другой день

      renderList(productsList, meals.filter(m => m.type === 'product'));
      renderList(recipesList,  meals.filter(m => m.type === 'recipe'));
      renderSummary(meals);
    } catch (err) {
      console.error(err);
    }
  }

  function renderSummary(meals) {
    const total = meals.reduce((acc, m) => {
      acc.calories += m.calories || 0;
      acc.protein  += m.protein  || 0;
      acc.fats     += m.fats     || 0;
      acc.carbs    += m.carbs    || 0;
      return acc;
    }, { calories: 0, protein: 0, fats: 0, carbs: 0 });

    totalCaloriesEl.textContent = Math.round(total.calories);
    totalProteinEl.textContent  = Math.round(total.protein);
    totalFatsEl.textContent     = Math.round(total.fats);
    totalCarbsEl.textContent    = Math.round(total.carbs);
  }

  function renderList(container, items) {
    if (items.length === 0) {
      const isToday = (currentDate === todayISO());
      container.innerHTML = `
        <div class="diary-empty">
          ${isToday ? 'Ты ещё ничего не ел сегодня' : 'Пусто'}
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const gramsStr = item.grams ? `${item.grams} г · ` : '';
      return `
        <div class="diary-item" data-id="${item.id}">
          <div class="diary-item__info">
            <div class="diary-item__name">${escapeHtml(item.name)}</div>
            <div class="diary-item__details">
              ${gramsStr}
              ${Math.round(item.calories)} ккал
              · Б ${Math.round(item.protein || 0)}
              · Ж ${Math.round(item.fats || 0)}
              · У ${Math.round(item.carbs || 0)}
            </div>
          </div>
          <button type="button" class="diary-item__delete" data-id="${item.id}" aria-label="Удалить">×</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.diary-item__delete').forEach(btn => {
      btn.addEventListener('click', () => deleteItem(btn.dataset.id));
    });
  }

  async function deleteItem(id) {
    if (!confirm('Удалить запись?')) return;
    try {
      await API.deleteMeal(Number(id));
      loadAndRender();
    } catch (err) {
      alert(err.message);
    }
  }

  function goToAddPage(type) {
    const page = type === 'product' ? 'products.html' : 'recipes.html';
    location.href = `${page}?date=${currentDate}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
