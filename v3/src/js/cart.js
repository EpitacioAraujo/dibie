/* Carrinho dibiê — vendas via WhatsApp, sem backend.
   Fluxo: clique no produto → modal → adicionar → carrinho → wa.me
   com mensagem personalizada + código do pedido. Estado em localStorage. */

(function () {
  var WHATSAPP = '5500000000000'; /* ponytail: trocar pelo número real (DDI+DDD+número) */
  var CART_KEY = 'dibie-cart';

  var cart;
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    cart = [];
  }

  function save() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    render();
  }
  function cartCount() {
    return cart.reduce(function (s, i) { return s + i.qty; }, 0);
  }
  function cartTotal() {
    return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  }

  /* ---- UI compartilhada (injetada pra não duplicar markup nas páginas) ---- */
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div class="shop-overlay" id="shopOverlay"></div>' +
      '<div class="prod-modal" id="prodModal" role="dialog" aria-modal="true">' +
      '  <button class="shop-close" id="modalClose" aria-label="Fechar">×</button>' +
      '  <img id="modalImg" src="" alt="" />' +
      '  <p class="product-cat" id="modalCat"></p>' +
      '  <div class="product-meta text-body"><span id="modalName"></span><span class="text-black-40" id="modalPrice"></span></div>' +
      '  <div class="modal-actions">' +
      '    <div class="qty-stepper text-body">' +
      '      <button id="qtyMinus" aria-label="Diminuir">−</button>' +
      '      <span id="qtyValue">1</span>' +
      '      <button id="qtyPlus" aria-label="Aumentar">+</button>' +
      '    </div>' +
      '    <button class="btn-dark text-body" id="addToCart">Adicionar ao carrinho</button>' +
      '  </div>' +
      '</div>' +
      '<aside class="cart-drawer" id="cartDrawer" aria-label="Carrinho">' +
      '  <div class="cart-head">' +
      '    <p class="text-h6" style="margin:0">Carrinho</p>' +
      '    <button class="shop-close" id="cartClose" aria-label="Fechar">×</button>' +
      '  </div>' +
      '  <div class="cart-items" id="cartItems"></div>' +
      '  <div class="cart-foot">' +
      '    <div class="product-meta text-body"><span>Total</span><span id="cartTotal"></span></div>' +
      '    <button class="btn-dark text-body" id="checkout">Finalizar pelo WhatsApp</button>' +
      '  </div>' +
      '</aside>'
  );

  var header = document.querySelector('.site-header');
  header.insertAdjacentHTML(
    'beforeend',
    '<button class="cart-btn text-body" id="cartBtn">Carrinho <span id="cartCount">0</span></button>'
  );

  var overlay = document.getElementById('shopOverlay');
  var modal = document.getElementById('prodModal');
  var drawer = document.getElementById('cartDrawer');
  var qtyValue = document.getElementById('qtyValue');
  var current = null; // produto aberto no modal
  var qty = 1;

  function fmt(v) {
    return 'R$ ' + v;
  }

  function closeAll() {
    document.body.classList.remove('shop-open');
    modal.classList.remove('open');
    drawer.classList.remove('open');
  }
  function openModal(p) {
    current = p;
    qty = 1;
    qtyValue.textContent = '1';
    document.getElementById('modalImg').src = p.img;
    document.getElementById('modalImg').alt = p.name;
    document.getElementById('modalCat').textContent = p.cat;
    document.getElementById('modalName').textContent = p.name;
    document.getElementById('modalPrice').textContent = fmt(p.price);
    drawer.classList.remove('open');
    modal.classList.add('open');
    document.body.classList.add('shop-open');
  }
  function openDrawer() {
    modal.classList.remove('open');
    drawer.classList.add('open');
    document.body.classList.add('shop-open');
  }

  function render() {
    document.getElementById('cartCount').textContent = cartCount();
    document.getElementById('cartTotal').textContent = fmt(cartTotal());
    var box = document.getElementById('cartItems');
    if (!cart.length) {
      box.innerHTML = '<p class="text-body text-black-40">Seu carrinho está vazio.</p>';
      return;
    }
    box.innerHTML = cart
      .map(function (i, idx) {
        return (
          '<div class="cart-item">' +
          '<img src="' + i.img + '" alt="" />' +
          '<div class="cart-item-info text-body">' +
          '<span>' + i.name + '</span>' +
          '<span class="text-black-40">' + fmt(i.price) + '</span>' +
          '</div>' +
          '<div class="qty-stepper text-body">' +
          '<button data-dec="' + idx + '" aria-label="Diminuir">−</button>' +
          '<span>' + i.qty + '</span>' +
          '<button data-inc="' + idx + '" aria-label="Aumentar">+</button>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  /* ---- Cards de produto → modal (lê os dados do próprio card) ---- */
  document.querySelectorAll('.product').forEach(function (card) {
    card.addEventListener('click', function (ev) {
      ev.preventDefault();
      openModal({
        name: card.querySelector('.product-meta span').textContent,
        price: parseFloat(card.querySelector('.product-meta span + span').textContent.replace(/[^\d]/g, '')),
        cat: card.querySelector('.product-cat').textContent,
        img: card.querySelector('img').src,
      });
    });
  });

  /* ---- Modal ---- */
  document.getElementById('qtyMinus').addEventListener('click', function () {
    qty = Math.max(1, qty - 1);
    qtyValue.textContent = qty;
  });
  document.getElementById('qtyPlus').addEventListener('click', function () {
    qty += 1;
    qtyValue.textContent = qty;
  });
  document.getElementById('addToCart').addEventListener('click', function () {
    var found = cart.find(function (i) { return i.name === current.name; });
    if (found) found.qty += qty;
    else cart.push({ name: current.name, price: current.price, img: current.img, qty: qty });
    save();
    openDrawer();
  });

  /* ---- Carrinho ---- */
  document.getElementById('cartItems').addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.dataset.inc !== undefined) cart[t.dataset.inc].qty += 1;
    else if (t.dataset.dec !== undefined) {
      var item = cart[t.dataset.dec];
      item.qty -= 1;
      if (item.qty <= 0) cart.splice(t.dataset.dec, 1);
    } else return;
    save();
  });

  document.getElementById('checkout').addEventListener('click', function () {
    if (!cart.length) return;
    var code = 'DB-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    var lines = cart.map(function (i) {
      return i.qty + 'x ' + i.name + ' — ' + fmt(i.price * i.qty);
    });
    var msg =
      'Oi, dibiê! Quero fechar um pedido 🧡\n' +
      'Código do carrinho: ' + code + '\n\n' +
      lines.join('\n') +
      '\n\nTotal: ' + fmt(cartTotal());
    window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg));
  });

  document.getElementById('cartBtn').addEventListener('click', openDrawer);
  document.getElementById('modalClose').addEventListener('click', closeAll);
  document.getElementById('cartClose').addEventListener('click', closeAll);
  overlay.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeAll();
  });

  render();
})();
