function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function toInputDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function toInputDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const SPRITE_SETS = {
  avatar: [
    '../assets/me-1.png',
    '../assets/me-2.png',
    '../assets/me-3.png'
  ],
  naruto: [
    '../assets/naruto-1.png',
    '../assets/naruto-2.png',
    '../assets/naruto-3.png'
  ]
};

function getSpriteFrames(spriteKey) {
  return SPRITE_SETS[spriteKey] || SPRITE_SETS.avatar;
}

function getSpriteLabel(spriteKey) {
  return spriteKey === 'naruto' ? 'Naruto' : 'Me';
}

function getSpriteFrame(spriteKey, spriteVariant) {
  const frames = getSpriteFrames(spriteKey);
  const normalizedVariant = Math.min(frames.length, Math.max(1, Number(spriteVariant) || 1));
  return frames[normalizedVariant - 1];
}

window.growPetShared = {
  formatCurrency,
  toInputDate,
  toInputDateTime,
  escapeHtml,
  getSpriteFrames,
  getSpriteLabel,
  getSpriteFrame
};
