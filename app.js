(() => {
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const form = document.getElementById('order-form');
  if (!form) return;
  const address = document.getElementById('address');
  const suggestions = document.getElementById('address-suggestions');
  const message = document.getElementById('form-message');
  const bankBox = document.getElementById('bank-box');
  const slaughterHome = document.getElementById('slaughter-home');
  const slaughterWrap = document.getElementById('slaughter-home-wrap');
  let requestTimer;
  let controller;

  function showSuggestions(items, status = '') {
    suggestions.replaceChildren();
    suggestions.classList.add('open');
    address.setAttribute('aria-expanded', 'true');
    if (status) {
      const node = document.createElement('div');
      node.className = 'suggestion-status';
      node.textContent = status;
      suggestions.append(node);
    }
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestion-item';
      button.setAttribute('role', 'option');
      button.textContent = item.label;
      button.addEventListener('click', () => {
        address.value = item.label;
        suggestions.classList.remove('open');
        address.setAttribute('aria-expanded', 'false');
        address.focus();
      });
      suggestions.append(button);
    });
  }

  function closeSuggestions() {
    suggestions.classList.remove('open');
    address.setAttribute('aria-expanded', 'false');
  }

  address.addEventListener('input', () => {
    clearTimeout(requestTimer);
    if (controller) controller.abort();
    const typed = address.value.trim();
    if (typed.length < 3) { closeSuggestions(); return; }
    requestTimer = setTimeout(async () => {
      controller = new AbortController();
      showSuggestions([], 'جارٍ البحث عن عناوين في البحرين…');
      try {
        const q = encodeURIComponent(`${typed}, Bahrain`);
        const url = `https://photon.komoot.io/api/?q=${q}&lat=26.0667&lon=50.5577&limit=6&lang=en`;
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('address lookup unavailable');
        const data = await response.json();
        const features = (data.features || []).filter(feature => {
          const p = feature.properties || {};
          return !p.country || /bahrain/i.test(p.country);
        }).map(feature => {
          const p = feature.properties || {};
          const parts = [p.name, p.street, p.district, p.city, p.state].filter(Boolean);
          const unique = [...new Set(parts)];
          return { label: `${unique.join('، ')}، البحرين` };
        }).filter((v, i, a) => v.label && a.findIndex(x => x.label === v.label) === i);
        showSuggestions(features, features.length ? '' : 'لم نعثر على اقتراح. يمكنك كتابة العنوان يدوياً.');
      } catch (error) {
        if (error.name !== 'AbortError') showSuggestions([], 'تعذّر جلب الاقتراحات حالياً. يمكنك كتابة العنوان يدوياً.');
      }
    }, 380);
  });

  address.addEventListener('blur', () => setTimeout(closeSuggestions, 180));
  address.addEventListener('focus', () => { if (suggestions.children.length && address.value.trim().length >= 3) suggestions.classList.add('open'); });

  function updateOptions() {
    const fulfillment = form.querySelector('input[name="fulfillment"]:checked')?.value;
    const isLive = fulfillment === 'حي';
    slaughterWrap.hidden = !isLive;
    slaughterHome.disabled = !isLive;
    if (!isLive) slaughterHome.checked = false;
    bankBox.hidden = form.querySelector('input[name="payment"]:checked')?.value !== 'تحويل بنكي';
    message.className = 'form-message';
    message.textContent = '';
  }
  form.querySelectorAll('input[name="fulfillment"], input[name="payment"]').forEach(input => input.addEventListener('change', updateOptions));
  updateOptions();

  document.getElementById('copy-iban')?.addEventListener('click', async event => {
    try {
      await navigator.clipboard.writeText('BH23BBKU00100000412297');
      event.currentTarget.textContent = 'تم نسخ رقم الحساب';
      setTimeout(() => { event.currentTarget.textContent = 'نسخ رقم الحساب'; }, 1800);
    } catch {
      event.currentTarget.textContent = 'رقم الحساب: BH23BBKU00100000412297';
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    message.className = 'form-message';
    message.textContent = '';
    const phoneInput = form.elements.namedItem('phone');
    const phone = phoneInput.value.replace(/[\s-]/g, '').replace(/^\+?973/, '').replace(/^00973/, '');
    if (!form.reportValidity()) return;
    if (!/^\d{8}$/.test(phone)) {
      message.textContent = 'يرجى إدخال رقم هاتف بحريني صحيح مكوّن من 8 أرقام.';
      message.classList.add('show', 'error');
      phoneInput.focus();
      return;
    }
    const data = new FormData(form);
    const name = data.get('name');
    const fulfill = data.get('fulfillment');
    const payment = data.get('payment');
    const slaughter = slaughterHome.checked ? '، مع طلب الذبح في المنزل' : '';
    const paymentText = payment === 'تحويل بنكي' ? `تحويل بنكي إلى الحساب ${'BH23BBKU00100000412297'}` : 'نقداً عند الاستلام';
    message.innerHTML = '';
    const heading = document.createElement('strong');
    heading.textContent = 'تم تجهيز ملخص طلبك';
    const details = document.createElement('div');
    details.textContent = `${name}، خروف أسترالي ${fulfill} بسعر 35 ديناراً بحرينياً${slaughter}، الدفع ${paymentText}. هذه معاينة فقط؛ لم يتم إرسال الطلب إلى الشركة.`;
    message.append(heading, details);
    message.classList.add('show');
    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
