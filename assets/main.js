/* Digit Hunt website — main.js */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
  const SPOKEN = { correct: 'right spot', present: 'wrong spot', absent: 'not in the code' };

  const rows = Array.from(game.querySelectorAll('.row'));
  const digitKeys = Array.from(game.querySelectorAll('[data-digit]'));
  const status = document.getElementById('game-status');
  const announcer = document.getElementById('game-announcer');

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

  // The row being typed is outlined, and its next empty cell carries the cyan cursor, as in the app.
  function paintCursor() {
    rows.forEach((row, r) => row.classList.toggle('is-active', !over && r === guesses.length));
    game.querySelectorAll('.is-cursor').forEach((c) => c.classList.remove('is-cursor'));
    if (!over && guesses.length < MAX_GUESSES && current.length < LENGTH) {
      tile(guesses.length, current.length).classList.add('is-cursor');
    }
  }

  function setStatus(text, ...extras) {
    status.textContent = '';
    const line = document.createElement('span');
    line.textContent = text;
    status.appendChild(line);
    extras.forEach((el) => status.appendChild(el));
  }

  function answerTiles(code) {
    const wrap = document.createElement('span');
    wrap.className = 'answer';
    wrap.setAttribute('aria-hidden', 'true');
    code.forEach((d) => {
      const t = document.createElement('span');
      t.className = 'tile';
      t.dataset.state = 'correct';
      t.textContent = d;
      wrap.appendChild(t);
    });
    return wrap;
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
    paintCursor();
    animate(cell, [{ transform: 'scale(.86)' }, { transform: 'scale(1.06)', offset: .6 }, { transform: 'scale(1)' }],
      { duration: 160, easing: 'ease-out' });
  }

  function erase() {
    if (busy || over || current.length === 0) return;
    current.pop();
    const cell = tile(guesses.length, current.length);
    cell.textContent = '';
    cell.dataset.state = 'empty';
    paintCursor();
  }

  function clearRow() {
    while (current.length) erase();
  }

  // A tile turns over to show its clue: the face folds away, the clue colour comes up, and the
  // tile settles onto its lip.
  async function flip(cell, state, delay) {
    await wait(reducedMotion.matches ? 0 : delay);
    await animate(cell, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }],
      { duration: 150, easing: 'ease-in', fill: 'forwards' });
    cell.dataset.state = state;
    await animate(cell, [{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }],
      { duration: 150, easing: 'ease-out', fill: 'forwards' });
    cell.getAnimations && cell.getAnimations().forEach((a) => a.cancel());
    animate(cell, [{ transform: 'scaleY(.9)' }, { transform: 'scaleY(1.04)', offset: .6 }, { transform: 'scaleY(1)' }],
      { duration: 240, easing: 'ease-out' });
  }

  // The winning row hops, one tile after another.
  function celebrate(row) {
    Array.from(rows[row].children).forEach((cell, i) => {
      animate(cell, [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-18px) rotate(-4deg)', offset: .4, easing: 'cubic-bezier(.2,0,0,1)' },
        { transform: 'translateY(0)', offset: .75 },
        { transform: 'translateY(-4px)', offset: .87 },
        { transform: 'translateY(0)' },
      ], { duration: 560, delay: i * 90, easing: 'ease-in' });
    });
  }

  async function submit() {
    if (busy || over) return;
    const row = guesses.length;
    if (current.length < LENGTH) {
      setStatus('Enter all 4 digits first.');
      animate(rows[row], [
        { transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' },
        { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' },
      ], { duration: 300, easing: 'ease-in-out' });
      return;
    }

    busy = true;
    const guess = current.slice();
    const result = score(guess, secret);
    guesses.push(guess);
    current = [];
    game.querySelectorAll('.is-cursor').forEach((c) => c.classList.remove('is-cursor'));

    await Promise.all(result.map((state, i) => flip(tile(row, i), state, i * 160)));

    result.forEach((state, i) => {
      const d = guess[i];
      if (!keyStates[d] || RANK[state] > RANK[keyStates[d]]) keyStates[d] = state;
    });
    paintKeys();

    const spoken = guess.map((d, i) => d + ', ' + SPOKEN[result[i]]).join('; ');
    rows[row].setAttribute('aria-label', 'Guess ' + (row + 1) + ': ' + spoken);
    busy = false;

    if (result.every((s) => s === 'correct')) {
      celebrate(row);
      finish('Cracked in ' + guesses.length + (guesses.length === 1 ? ' guess!' : ' guesses!'));
    } else if (guesses.length === MAX_GUESSES) {
      finish('Out of guesses. The code was', answerTiles(secret), 'The code was ' + secret.join(' ') + '.');
    } else {
      paintCursor();
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

  function finish(message, answer, spokenAnswer) {
    over = true;
    paintCursor();
    const hadFocus = game.contains(document.activeElement);
    setKeysDisabled(true);
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn-sm k-cyan';
    again.textContent = 'New puzzle';
    again.addEventListener('click', () => reset(false));
    if (answer) setStatus(message, answer, again);
    else setStatus(message, again);
    announcer.textContent = spokenAnswer ? 'Out of guesses. ' + spokenAnswer : message;
    if (hadFocus) again.focus();
  }

  function reset(withOpening) {
    const hadFocus = game.contains(document.activeElement);
    rows.forEach((row, r) => {
      row.setAttribute('aria-label', 'Guess ' + (r + 1) + ', empty');
      Array.from(row.children).forEach((cell) => {
        cell.textContent = '';
        cell.dataset.state = 'empty';
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
      paintCursor();
      wait(reducedMotion.matches ? 0 : 600).then(submit);
    } else {
      secret = randomCode();
      paintCursor();
      setStatus('New code. Type 4 digits, then press Enter.');
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

/* ── Colorblind colours ────────────────────────────────────── */
// Same swap as the app's Color Blind Mode: blue for the right spot, orange for the wrong one.
// It recolours the practice board, the clue legend and every clue tile on the page.
(function () {
  const toggle = document.getElementById('colorblind-switch');
  if (!toggle) return;
  const root = document.documentElement;
  const set = (on) => {
    root.classList.toggle('colorblind', on);
    toggle.setAttribute('aria-pressed', String(on));
    document.querySelectorAll('[data-clue-word="correct"]').forEach((el) => { el.textContent = on ? 'Blue' : 'Green'; });
    document.querySelectorAll('[data-clue-word="present"]').forEach((el) => { el.textContent = on ? 'Orange' : 'Yellow'; });
    const example = document.querySelector('[data-example]');
    if (example) {
      example.setAttribute('aria-label', 'Example guess 3 8 1 6: the 3 is ' + (on ? 'blue' : 'green') +
        ', the 8 is grey, the 1 is ' + (on ? 'orange' : 'yellow') + ' and the 6 is grey');
    }
  };
  toggle.addEventListener('click', () => set(!root.classList.contains('colorblind')));
})();

/* ── Screens rail ──────────────────────────────────────────── */
// Swipe or scroll it; the arrow buttons page through it for mouse and keyboard users.
(function () {
  const rail = document.getElementById('screens-rail');
  const nav = document.querySelector('[data-rail-nav]');
  if (!rail || !nav) return;
  const prev = nav.querySelector('[data-rail="prev"]');
  const next = nav.querySelector('[data-rail="next"]');
  const step = () => {
    const shot = rail.querySelector('.shot');
    const gap = parseFloat(getComputedStyle(rail.querySelector('.rail-track')).columnGap) || 0;
    const per = shot.getBoundingClientRect().width + gap;
    return Math.max(per, Math.floor(rail.clientWidth / per) * per);
  };
  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    prev.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft >= max - 2;
    nav.hidden = max <= 2;
  };
  const go = (dir) => rail.scrollBy({ left: dir * step(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  rail.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ── In-app mode (?embed=app; the class is set in <head>) ──── */
// The app shows its own title bar and close button, so the page is read-only there: links become
// plain text, and in-page links scroll within the page without adding history entries. Email
// links stay, and the app hands them to the mail app.
(function () {
  if (!document.documentElement.classList.contains('embedded')) return;
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href.startsWith('mailto:')) return;
    if (href.length > 1 && href.startsWith('#')) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(href.slice(1));
        if (target) target.scrollIntoView({ block: 'start' });
      });
    } else {
      a.removeAttribute('href');
      a.removeAttribute('target');
    }
  });
})();
