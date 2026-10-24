/* Digit Hunt website — main.js */

/* ── Nav border once the page scrolls ──────────────────────── */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const update = () => nav.classList.toggle('nav--scrolled', window.scrollY > 8);
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ── Footer year ───────────────────────────────────────────── */
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

/* ── Today's Daily Hunt number ─────────────────────────────── */
// Mirrors LevelGenerator.dailyChallengeNumber: Daily Hunt #1 was 9 October 2026 and the
// number goes up by one each day, counted on the player's own calendar date.
(function () {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const epoch = Date.UTC(2026, 9, 9);
  const number = Math.round((today - epoch) / 86400000) + 1;
  if (number < 1) return;

  document.querySelectorAll('[data-hunt-number]').forEach((el) => { el.textContent = '#' + number; });
  document.querySelectorAll('[data-hunt-only]').forEach((el) => { el.hidden = false; });
  document.querySelectorAll('[data-hunt-heading]').forEach((el) => {
    el.textContent = 'Daily Hunt #' + number + ' is ready.';
  });
})();

/* ── Practice puzzle ───────────────────────────────────────── */
// A 4-digit, 6-guess board scored the same way as the app: exact matches first, then
// right-digit-wrong-spot from whatever is left of the code.
(function () {
  const game = document.getElementById('game');
  if (!game) return;

  const LENGTH = 4;
  const MAX_GUESSES = 6;
  const OPENING_GUESS = [1, 2, 3, 4];
  const RANK = { absent: 1, present: 2, correct: 3 };
  const SPOKEN = { correct: 'right spot', present: 'wrong spot', absent: 'not in the number' };

  const rows = Array.from(game.querySelectorAll('.row'));
  const digitKeys = Array.from(game.querySelectorAll('[data-digit]'));
  const status = document.getElementById('game-status');
  const announcer = document.getElementById('game-announcer');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let secret = [];
  let guesses = [];
  let current = [];
  let keyStates = {};
  let busy = false;
  let over = false;
  let opening = false;
  let inView = true;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const animate = (el, frames, options) =>
    reducedMotion.matches || !el.animate ? Promise.resolve() : el.animate(frames, options).finished;

  function score(guess, code) {
    const result = new Array(LENGTH).fill('absent');
    const left = {};
    guess.forEach((d, i) => {
      if (d === code[i]) result[i] = 'correct';
      else left[code[i]] = (left[code[i]] || 0) + 1;
    });
    guess.forEach((d, i) => {
      if (result[i] !== 'correct' && left[d] > 0) {
        result[i] = 'present';
        left[d] -= 1;
      }
    });
    return result;
  }

  function randomCode() {
    const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, LENGTH);
  }

  // The opening guess should light up at least one tile without solving the puzzle.
  function codeForOpening() {
    for (;;) {
      const code = randomCode();
      const result = score(OPENING_GUESS, code);
      const lit = result.filter((s) => s !== 'absent').length;
      if (lit > 0 && result.some((s) => s !== 'correct')) return code;
    }
  }

  function tile(row, col) {
    return rows[row].children[col];
  }

  function setStatus(text, button) {
    status.textContent = '';
    const line = document.createElement('span');
    line.textContent = text;
    status.appendChild(line);
    if (button) status.appendChild(button);
  }

  function paintKeys() {
    digitKeys.forEach((key) => {
      const state = keyStates[key.dataset.digit];
      if (state) key.dataset.state = state;
      else delete key.dataset.state;
    });
  }

  function setKeysDisabled(disabled) {
    game.querySelectorAll('.key').forEach((key) => { key.disabled = disabled; });
  }

  function type(digit) {
    if (busy || over || current.length >= LENGTH) return;
    const cell = tile(guesses.length, current.length);
    current.push(digit);
    cell.textContent = digit;
    cell.dataset.state = 'filled';
    animate(cell, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 120 });
  }

  function erase() {
    if (busy || over || current.length === 0) return;
    current.pop();
    const cell = tile(guesses.length, current.length);
    cell.textContent = '';
    delete cell.dataset.state;
  }

  function clearRow() {
    while (current.length) erase();
  }

  async function flip(cell, state, delay) {
    await wait(reducedMotion.matches ? 0 : delay);
    await animate(cell, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }], { duration: 150, fill: 'forwards' });
    cell.dataset.state = state;
    await animate(cell, [{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: 150, fill: 'forwards' });
    cell.getAnimations && cell.getAnimations().forEach((a) => a.cancel());
    animate(cell, [{ transform: 'scaleY(.9)' }, { transform: 'scaleY(1.04)', offset: .6 }, { transform: 'scaleY(1)' }], { duration: 240, easing: 'ease-out' });
  }

  async function submit() {
    if (busy || over) return;
    const row = guesses.length;
    if (current.length < LENGTH) {
      setStatus('Enter all 4 digits first.');
      animate(rows[row], [
        { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' },
      ], { duration: 280 });
      return;
    }

    busy = true;
    const guess = current.slice();
    const result = score(guess, secret);
    guesses.push(guess);
    current = [];

    await Promise.all(result.map((state, i) => flip(tile(row, i), state, i * 180)));

    result.forEach((state, i) => {
      const d = guess[i];
      if (!keyStates[d] || RANK[state] > RANK[keyStates[d]]) keyStates[d] = state;
    });
    paintKeys();

    const spoken = guess.map((d, i) => d + ', ' + SPOKEN[result[i]]).join('; ');
    rows[row].setAttribute('aria-label', 'Guess ' + (row + 1) + ': ' + spoken);
    busy = false;

    if (result.every((s) => s === 'correct')) {
      finish('Cracked in ' + guesses.length + (guesses.length === 1 ? ' guess.' : ' guesses.'));
    } else if (guesses.length === MAX_GUESSES) {
      finish('Out of guesses. The number was ' + secret.join('') + '.');
    } else {
      const left = MAX_GUESSES - guesses.length;
      const leftText = left + (left === 1 ? ' guess left.' : ' guesses left.');
      if (opening) {
        opening = false;
        setStatus('We opened with 1234. Your turn.');
        announcer.textContent = 'Practice puzzle. We opened with 1234: ' + spoken + '. ' + leftText;
      } else {
        setStatus(leftText);
        announcer.textContent = spoken + '. ' + leftText;
      }
    }
  }

  function finish(message) {
    over = true;
    const hadFocus = game.contains(document.activeElement);
    setKeysDisabled(true);
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn-ghost btn-sm';
    again.textContent = 'New puzzle';
    again.addEventListener('click', () => reset(false));
    setStatus(message, again);
    announcer.textContent = message;
    if (hadFocus) again.focus();
  }

  function reset(withOpening) {
    const hadFocus = game.contains(document.activeElement);
    rows.forEach((row, r) => {
      row.setAttribute('aria-label', 'Guess ' + (r + 1) + ', empty');
      Array.from(row.children).forEach((cell) => {
        cell.textContent = '';
        delete cell.dataset.state;
      });
    });
    guesses = [];
    current = [];
    keyStates = {};
    over = false;
    busy = false;
    paintKeys();
    setKeysDisabled(false);

    if (withOpening) {
      opening = true;
      secret = codeForOpening();
      OPENING_GUESS.forEach((d) => {
        const cell = tile(0, current.length);
        current.push(d);
        cell.textContent = d;
        cell.dataset.state = 'filled';
      });
      wait(reducedMotion.matches ? 0 : 500).then(submit);
    } else {
      secret = randomCode();
      setStatus('New code. Type 4 digits, then press Guess.');
      announcer.textContent = 'New puzzle. 6 guesses left.';
      // The New puzzle button just left the page, so keep keyboard users on the keypad.
      if (hadFocus) game.querySelector('[data-digit="1"]').focus();
    }
  }

  game.addEventListener('click', (e) => {
    const key = e.target.closest('.key');
    if (!key || key.disabled) return;
    if (key.dataset.digit) type(Number(key.dataset.digit));
    else if (key.dataset.action === 'delete') erase();
    else if (key.dataset.action === 'clear') clearRow();
    else if (key.dataset.action === 'guess') submit();
  });

  // Physical keyboard works while the board is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.3 }).observe(game);
  }

  document.addEventListener('keydown', (e) => {
    if (!inView || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    if (target.closest && target.closest('input, textarea, select, [contenteditable]')) return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      type(Number(e.key));
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      erase();
    } else if (e.key === 'Enter') {
      // Let Enter activate whatever link or button has focus.
      if (target.closest && target.closest('a, button, summary')) return;
      e.preventDefault();
      submit();
    }
  });

  reset(true);
})();
