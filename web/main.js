(function () {
  const links = document.querySelectorAll('a[href^="#"]');
  for (const link of links) {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${targetId}`);
    });
  }

  const platform = (navigator.platform || '').toLowerCase();
  const ua = (navigator.userAgent || '').toLowerCase();
  let bestPlatform = 'windows';
  if (platform.includes('mac') || ua.includes('mac os')) bestPlatform = 'macos';
  else if (platform.includes('linux') || ua.includes('linux')) bestPlatform = 'linux';

  const platformCards = {
    windows: 0,
    macos: 1,
    linux: 2
  };
  const cards = document.querySelectorAll('.download-card');
  const idx = platformCards[bestPlatform];
  if (cards[idx]) {
    cards[idx].style.borderColor = 'rgba(143, 211, 255, 0.6)';
    cards[idx].style.transform = 'translateY(-2px)';
  }
})();
