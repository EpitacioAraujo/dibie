/* Intro dibiê v3 — sequência em 6 fases (ver v3/assets/presentation/):
   1. página em branco
   2. as 3 linhas deslizam para a esquerda em velocidades diferentes
      enquanto os tiles surgem fora de ordem (só fade-in)
   3. mosaico completo, linhas seguem deslizando
   4. o frame central cruza o centro da tela: SÓ ELE para (FLIP) e o
      zoom começa no mesmo instante; o resto da linha continua
   5. zoom em andamento; header aparece, linhas saem
   6. hero pronta: carrossel com fading + indicador */

(function () {
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animated = document.querySelectorAll('.mosaic-tile, .hero-frame');
  var frame = document.getElementById('heroFrame');
  var hero = document.querySelector('.hero');

  var ZOOM_MS = 1300; // zoom de 1.2s + respiro

  /* ---- Carrossel ---- */
  var slides = document.querySelectorAll('.hero-slide');
  var captions = document.querySelectorAll('.hero-caption-slides .caption');
  var dots = document.querySelectorAll('.hero-dots .dot');
  var current = 0;
  var timer = null;
  var INTERVAL = 5000;

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      s.classList.toggle('active', i === current);
    });
    captions.forEach(function (c, i) {
      c.classList.toggle('active', i === current);
    });
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === current);
    });
  }

  function startCarousel() {
    if (timer) return;
    timer = setInterval(function () {
      goTo(current + 1);
    }, INTERVAL);
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      goTo(i);
      clearInterval(timer);
      timer = null;
      startCarousel();
    });
  });

  /* ---- Scroll reveal (seções pós-hero, padrão único reutilizável) ----
     .reveal: fade + translateY; .reveal-color: só transição de cor
     (wordmark do footer). [data-stagger] no container escalona os
     filhos .reveal via --reveal-delay. Dispara uma vez só. */
  var revealEls = document.querySelectorAll('.reveal, .reveal-color');
  if (revealEls.length) {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseFloat(group.dataset.stagger) || 0.12;
      group.querySelectorAll('.reveal').forEach(function (el, i) {
        el.style.setProperty('--reveal-delay', i * step + 's');
      });
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---- Camadas sincronizadas ----
     O trilho do meio (tiles + espaçador) desliza sem parar. O frame é
     uma camada separada, absoluta na .hero, posicionada sobre o
     espaçador e animada na MESMA velocidade — parece a mesma linha.
     Ele para exatamente no centro; aí o zoom começa (intervalo 0). */
  // véu texturizado do header: liga assim que houver qualquer scroll (todas as páginas)
  function onScroll() {
    body.classList.toggle('scrolled', window.scrollY > 0);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var spacer = document.getElementById('midSpacer');
  if (!spacer) return; // páginas sem hero (ex.: pecas.html) param aqui
  var midTrack = spacer.parentNode;
  var zoomed = false;

  function startZoom() {
    if (zoomed) return;
    zoomed = true;

    var h = hero.getBoundingClientRect();
    var r = frame.getBoundingClientRect(); // onde ele REALMENTE está
    var pad = window.innerWidth >= 768 ? 48 : 24;

    body.classList.add('zooming');

    // cresce a partir da posição real (centro), com os dois keyframes
    // explícitos em px — nada depende de 'auto' nem de transition CSS
    frame.animate(
      [
        {
          left: r.left - h.left + 'px',
          top: r.top - h.top + 'px',
          width: r.width + 'px',
          height: r.height + 'px',
        },
        {
          left: pad + 'px',
          top: '0px',
          width: h.width - pad * 2 + 'px',
          height: h.height - 24 + 'px', // padding-bottom da .hero
        },
      ],
      {
        duration: reduceMotion ? 0 : 1200,
        easing: 'cubic-bezier(0.44, 0, 0.56, 1)',
        fill: 'forwards',
      }
    );

    setTimeout(finishIntro, reduceMotion ? 0 : ZOOM_MS);
  }

  // posiciona o frame sobre o espaçador e inicia o deslize sincronizado
  function startDrift() {
    var s = spacer.getBoundingClientRect(); // ainda no estado --from
    var h = hero.getBoundingClientRect();
    var t = midTrack.getBoundingClientRect();

    var startLeft = s.left - h.left;
    var top = s.top - h.top;
    var targetLeft = h.width / 2 - s.width / 2; // centro da tela

    // velocidade do trilho do meio: 24% da largura dele em 7s (linear)
    var speed = (0.24 * t.width) / 7000; // px/ms
    var duration = (startLeft - targetLeft) / speed;

    // mesma velocidade linear do trilho, partindo exatamente do espaçador
    var drift = frame.animate(
      [
        { left: startLeft + 'px', top: top + 'px' },
        { left: targetLeft + 'px', top: top + 'px' },
      ],
      { duration: duration, easing: 'linear', fill: 'forwards' }
    );

    body.classList.add('drifting');

    // chegou ao centro → só ele para, e o zoom dispara na hora
    drift.onfinish = startZoom;
  }

  /* ---- Intro ---- */
  var finished = false;
  function finishIntro() {
    if (finished) return;
    finished = true;
    body.classList.add('hero-ready');
    body.classList.remove('intro');
    startCarousel();
  }

  if (reduceMotion) {
    animated.forEach(function (el) {
      el.classList.add('is-visible');
    });
    body.classList.add('drifting');
    startZoom(); // duração 0: cai direto no estado final
    return;
  }

  // fase 1: um instante em branco antes do mosaico
  setTimeout(function () {
    // fases 2–3: linhas deslizando + tiles surgindo fora de ordem
    animated.forEach(function (el) {
      var delay = parseFloat(el.dataset.delay || 0) * 1000;
      setTimeout(function () {
        el.classList.add('is-visible');
      }, delay);
    });

    // fases 4–6: frame desliza junto, para no centro e cresce
    startDrift();
  }, 400);
})();
