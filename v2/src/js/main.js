// Scroll-triggered reveal (fade + slide-up), mirrors the Framer "onInView" appear effect.
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      }
    }
  },
  { threshold: 0.3 },
)
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el))

// Mount-triggered reveal for above-the-fold content (hero, page heading).
document.querySelectorAll('.reveal-on-mount').forEach((el) => {
  requestAnimationFrame(() => el.classList.add('is-visible'))
})

// Hero mosaic: staggered entrance matching the original Framer "Hero" component
// (tween ease [0.44,0,0.56,1], 0.8s duration, per-tile delay from data-delay).
document.querySelectorAll('.mosaic-tile, .mosaic-hero-image').forEach((el) => {
  const delay = Number(el.dataset.delay || 0)
  el.style.transitionDelay = `${delay}s`
  requestAnimationFrame(() => el.classList.add('is-visible'))
})

// About page accordion.
document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item')
    const wasOpen = item.classList.contains('open')
    const group = item.parentElement
    group.querySelectorAll('.accordion-item').forEach((el) => {
      el.classList.remove('open')
      el.querySelector('.accordion-icon').textContent = '+'
    })
    if (!wasOpen) {
      item.classList.add('open')
      trigger.querySelector('.accordion-icon').textContent = '−'
    }
  })
})
