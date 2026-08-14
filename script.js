document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const yearEl = document.getElementById('year');
  const filterPills = document.getElementById('filterPills');
  const productCards = document.querySelectorAll('.product-card');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  });

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });

  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-link');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(section => spy.observe(section));

  if (filterPills) {
    filterPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      filterPills.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      productCards.forEach(card => {
        card.classList.toggle('hidden', filter !== 'all' && card.dataset.cat !== filter);
      });
    });
  }

  const enquiryForm = document.getElementById('enquiryForm');
  const whatsappBtn = document.getElementById('whatsappBtn');
  const ownerEmail = 'amod.shantiautoparts@gmail.com';
  const whatsappNumber = '919431844035';

  function buildEnquiryMessage() {
    const name = document.getElementById('enqName').value.trim();
    const phone = document.getElementById('enqPhone').value.trim();
    const vehicle = document.getElementById('enqVehicle').value.trim();
    const items = document.getElementById('enqItems').value.trim();
    let msg = `Name: ${name}\nPhone: ${phone}\n`;
    if (vehicle) msg += `Vehicle: ${vehicle}\n`;
    msg += `\nItem(s) needed:\n${items}`;
    return msg;
  }

  if (enquiryForm) {
    enquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!enquiryForm.reportValidity()) return;
      const name = document.getElementById('enqName').value.trim();
      const subject = encodeURIComponent(`Part Enquiry from ${name} — Apoorva Auto Parts Website`);
      const body = encodeURIComponent(buildEnquiryMessage());
      window.location.href = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
    });
  }

  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const itemsField = document.getElementById('enqItems');
      const nameField = document.getElementById('enqName');
      const phoneField = document.getElementById('enqPhone');
      if (!itemsField.value.trim()) { itemsField.focus(); return; }
      if (!nameField.value.trim()) { nameField.focus(); return; }
      if (!phoneField.value.trim()) { phoneField.focus(); return; }
      const text = encodeURIComponent(buildEnquiryMessage());
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank', 'noopener');
    });
  }

  const revealTargets = document.querySelectorAll('.category-tile, .product-card, .enquiry-form, .about-copy, .about-media, .detail-card, .badge-item');
  revealTargets.forEach(el => el.classList.add('reveal'));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  revealTargets.forEach(el => revealObserver.observe(el));
});
