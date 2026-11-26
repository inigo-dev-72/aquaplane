
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const W = 800;
  const H = 480;

  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlayTitle');
  const copy = document.getElementById('overlayText');

  const startBtn = document.getElementById('startBtn');
  const soundBtn = document.getElementById('soundBtn');
  const throttleBtn = document.getElementById('throttle');

  const bestEl = document.getElementById('best');

  let state = 'title';

  let boat = { x: 170, y: 235, vy: 0 };
  let skier = { x: 95, y: 260 };

  let obstacles = [];
  let lives = 3;
  let score = 0;
  let best = Number(localStorage.getItem('aquaplane-best') || 0);

  let speed = 2.2;
  let spawn = 0;
  let frame = 0;

  let throttle = false;
  let sound = true;
  let audio = null;
  let invuln = 0;

  const keys = {
    up: false,
    down: false
  };

  bestEl.textContent = best;

  // Sonido retro
  function tone(freq = 220, dur = 0.08, type = 'square', vol = 0.035) {
    if (!sound) return;

    try {
      audio = audio || new (
        window.AudioContext || window.webkitAudioContext
      )();

      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;

      osc.connect(gain);
      gain.connect(audio.destination);

      osc.start();

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + dur
      );

      osc.stop(audio.currentTime + dur);

    } catch (e) {}
  }

  // Comenzar partida
  function start() {
    state = 'playing';

    overlay.classList.add('hidden');

    lives = 3;
    score = 0;
    speed = 2.2;
    spawn = 30;
    frame = 0;
    invuln = 90;

    boat = { x: 170, y: 235, vy: 0 };
    skier = { x: 95, y: 260 };

    obstacles = [];

    tone(440, 0.12);
  }

  // Fin de partida
  function end() {
    state = 'over';

    title.textContent = 'GAME OVER';

    copy.innerHTML =
      `Puntuación: ${Math.floor(score)}<br>` +
      `Récord: ${best}`;

    startBtn.textContent = 'VOLVER A JUGAR';

    overlay.classList.remove('hidden');

    tone(90, 0.5, 'sawtooth');
  }

  startBtn.addEventListener('click', start);

  soundBtn.addEventListener('click', () => {
    sound = !sound;

    soundBtn.textContent =
      'SONIDO: ' + (sound ? 'ON' : 'OFF');

    if (sound) tone(500);
  });

  // Teclado
  window.addEventListener('keydown', e => {

    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'ArrowUp') keys.up = true;
    if (e.code === 'ArrowDown') keys.down = true;
    if (e.code === 'Space') throttle = true;

    if (
      (e.code === 'Enter' || e.code === 'Space') &&
      state !== 'playing'
    ) {
      start();
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowUp') keys.up = false;
    if (e.code === 'ArrowDown') keys.down = false;
    if (e.code === 'Space') throttle = false;
  });

  // Controles táctiles
  function bindHold(element, callback) {

    element.addEventListener('pointerdown', e => {
      e.preventDefault();
      callback(true);

      if (element.setPointerCapture) {
        element.setPointerCapture(e.pointerId);
      }
    });

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => {
      element.addEventListener(event, () => callback(false));
    });
  }

  document.querySelectorAll('[data-control]').forEach(button => {
    bindHold(button, value => {
      keys[button.dataset.control] = value;
    });
  });

  bindHold(throttleBtn, value => {
    throttle = value;
  });

  // Detección de colisiones
  function rectHit(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // Crear obstáculos
  function addObstacle() {

    const shark = Math.random() < 0.24;

    obstacles.push({
      x: W + 25,
      y: 70 + Math.random() * 330,
      w: shark ? 62 : 38,
      h: shark ? 28 : 36,
      type: shark ? 'shark' : 'rock',
      phase: Math.random() * 6
    });
  }

  // Actualización de la partida
  function update() {

    if (state !== 'playing') return;

    frame++;

    speed = Math.min(5.4, 2.2 + score / 950);

    score += 0.12 * speed;

    // Movimiento vertical de la lancha
    const move =
      (keys.down ? 1 : 0) -
      (keys.up ? 1 : 0);

    boat.vy = move * 3.7;

    boat.y += boat.vy;

    boat.y = Math.max(
      65,
      Math.min(405, boat.y)
    );

    // El esquiador sigue a la lancha con retraso
    const targetY = boat.y + 28;

    skier.y += (targetY - skier.y) * 0.075;

    // Aceleración y retroceso horizontal
    boat.x += throttle
      ? Math.min(4.5, (350 - boat.x) * 0.09)
      : (170 - boat.x) * 0.075;

    // El esquiador también tiene retraso horizontal
    skier.x += (boat.x - 75 - skier.x) * 0.055;

    // Aparición de obstáculos
    spawn--;

    if (spawn <= 0) {
      addObstacle();

      spawn = Math.max(
        34,
        95 - score / 25
      ) + Math.random() * 35;
    }

    // Movimiento de obstáculos
    obstacles.forEach(o => {

      o.x -= speed + (
        o.type === 'shark' ? 0.45 : 0
      );

      if (o.type === 'shark') {
        o.y += Math.sin(frame * 0.07 + o.phase) * 0.8;
      }

    });

    obstacles = obstacles.filter(o => o.x > -90);

    // Protección temporal después de un choque
    if (invuln > 0) invuln--;

    // Comprobar colisiones
    if (invuln === 0) {

      const boatBox = {
        x: boat.x - 27,
        y: boat.y - 15,
        w: 58,
        h: 31
      };

      const skiBox = {
        x: skier.x - 10,
        y: skier.y - 8,
        w: 22,
        h: 18
      };

      const hit = obstacles.find(o =>
        rectHit(boatBox, o) ||
        rectHit(skiBox, o)
      );

      if (hit) {

        obstacles = obstacles.filter(o => o !== hit);

        lives--;

        invuln = 100;

        tone(120, 0.24, 'sawtooth');

        if (lives <= 0) {

          best = Math.max(
            best,
            Math.floor(score)
          );

          localStorage.setItem(
            'aquaplane-best',
            best
          );

          bestEl.textContent = best;

          end();
        }
      }
    }
  }

  // Dibujar agua
  function water() {

    // Fondo marino uniforme
    ctx.fillStyle = '#075080';
    ctx.fillRect(0, 0, W, H);

    // Ondas discretas
    for (let y = 65; y < H; y += 48) {

      const offset = (frame * 0.35) % 100;

      for (let x = -100 + offset; x < W; x += 100) {

        ctx.fillStyle = '#09608b';

        ctx.fillRect(
          x,
          y,
          18,
          2
        );

      }
    }

    // Franja superior
    ctx.fillStyle = '#063c68';
    ctx.fillRect(0, 0, W, 42);

    ctx.fillStyle = '#14749a';
    ctx.fillRect(0, 40, W, 2);

  }


  // Dibujar lancha y esquiador
  function drawBoat() {

    if (
      invuln > 0 &&
      Math.floor(frame / 6) % 2 === 0
    ) return;

    // Estela
    ctx.fillStyle = '#b7f4ee';

    ctx.fillRect(
      boat.x - 35,
      boat.y + 5,
      24,
      3
    );

    ctx.fillRect(
      boat.x - 49,
      boat.y + 12,
      35,
      2
    );

    // Casco
    ctx.fillStyle = '#f4d83d';

    ctx.fillRect(
      boat.x - 24,
      boat.y - 7,
      50,
      17
    );

    ctx.fillRect(
      boat.x + 17,
      boat.y - 3,
      17,
      9
    );

    // Cabina
    ctx.fillStyle = '#e85b35';

    ctx.fillRect(
      boat.x - 15,
      boat.y - 12,
      26,
      8
    );

    ctx.fillRect(
      boat.x - 9,
      boat.y - 18,
      13,
      7
    );

    ctx.fillStyle = '#172d49';

    ctx.fillRect(
      boat.x - 5,
      boat.y - 15,
      6,
      5
    );

    ctx.fillStyle = '#fff1a3';

    ctx.fillRect(
      boat.x - 26,
      boat.y + 10,
      49,
      3
    );

    // Cuerda
    ctx.strokeStyle = '#f7e7a0';
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
      boat.x - 22,
      boat.y + 7
    );

    ctx.lineTo(
      skier.x + 5,
      skier.y
    );

    ctx.stroke();

    // Esquiador
    ctx.fillStyle = '#ffdf49';

    ctx.fillRect(
      skier.x - 5,
      skier.y - 10,
      12,
      10
    );

    ctx.fillStyle = '#f0a47d';

    ctx.fillRect(
      skier.x - 3,
      skier.y - 17,
      9,
      7
    );

    ctx.fillStyle = '#162c4a';

    ctx.fillRect(
      skier.x - 7,
      skier.y + 1,
      16,
      3
    );

    ctx.fillRect(
      skier.x - 12,
      skier.y + 5,
      13,
      2
    );
  }

  // Dibujar obstáculos
  function drawObstacle(o) {

    if (o.type === 'rock') {

      ctx.fillStyle = '#536b78';

      ctx.fillRect(
        o.x + 5,
        o.y + 8,
        28,
        25
      );

      ctx.fillRect(
        o.x + 10,
        o.y + 3,
        17,
        8
      );

      ctx.fillStyle = '#8297a0';

      ctx.fillRect(
        o.x + 12,
        o.y + 7,
        9,
        5
      );

      ctx.fillStyle = '#344c5c';

      ctx.fillRect(
        o.x + 8,
        o.y + 29,
        27,
        5
      );

    } else {

      // Tiburón
      ctx.fillStyle = '#263e58';

      ctx.fillRect(
        o.x + 3,
        o.y + 9,
        51,
        14
      );

      ctx.fillRect(
        o.x + 15,
        o.y + 3,
        25,
        10
      );

      ctx.fillRect(
        o.x + 7,
        o.y + 5,
        12,
        8
      );

      ctx.fillStyle = '#e9f6e7';

      ctx.fillRect(
        o.x + 45,
        o.y + 12,
        4,
        4
      );

      ctx.fillStyle = '#e85c56';

      ctx.fillRect(
        o.x + 3,
        o.y + 19,
        13,
        4
      );

      ctx.fillRect(
        o.x + 17,
        o.y + 23,
        12,
        3
      );

      ctx.fillStyle = '#f5e8d2';

      ctx.fillRect(
        o.x + 22,
        o.y + 10,
        5,
        3
      );
    }
  }

  // Marcador superior
  function hud() {

    ctx.fillStyle = '#031b34';
    ctx.fillRect(0, 0, W, 42);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';

    ctx.fillText(
      'PUNTOS ' + String(Math.floor(score)).padStart(5, '0'),
      18,
      27
    );

    ctx.fillStyle = '#f4d83d';

    ctx.fillText(
      '♥ '.repeat(lives),
      620,
      27
    );

    ctx.fillStyle = '#9eeaff';
    ctx.font = '11px monospace';

    ctx.fillText(
      'AQUAPLANE',
      365,
      26
    );
  }

  // Renderizado
  function render() {

    water();

    obstacles.forEach(drawObstacle);

    drawBoat();

    hud();

    if (state === 'title') {

      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';

      ctx.fillText(
        'PULSA EMPEZAR PARA JUGAR',
        285,
        445
      );
    }
  }

  // Bucle principal
  function loop() {

    update();
    render();

    requestAnimationFrame(loop);
  }

  loop();

  // Instalación PWA
  let deferredPrompt = null;

  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', e => {

    e.preventDefault();

    deferredPrompt = e;

    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {

    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    deferredPrompt = null;

    installBtn.hidden = true;
  });

  // Service Worker
  if (
    'serviceWorker' in navigator &&
    location.protocol !== 'file:'
  ) {
    window.addEventListener('load', () => {

      navigator.serviceWorker
        .register('./sw.js')
        .catch(error => console.error(error));

    });
  }

})();
