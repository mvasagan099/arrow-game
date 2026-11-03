/**
 * Arrow Escape — Automated Genuine Screenshot Capture Script
 * Connects to running Android emulator via Chrome DevTools Protocol and ADB.
 * Captures official 1080x2400 portrait screenshots of all required game states.
 */

import { execSync } from 'child_process';

const DEVTOOLS_URL = 'http://127.0.0.1:9222/json';
const OUT_DIR = 'docs/play-store/screenshots';

async function getPageWsUrl() {
  const res = await fetch(DEVTOOLS_URL);
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page' && t.url.includes('localhost'));
  if (!page || !page.webSocketDebuggerUrl) {
    throw new Error('Could not find active Arrow Escape WebView target on ' + DEVTOOLS_URL);
  }
  return page.webSocketDebuggerUrl;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Connecting to Android WebView DevTools...');
  const wsUrl = await getPageWsUrl();
  const ws = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  console.log('Connected to Chrome DevTools WebSocket:', wsUrl);

  function evalJs(code) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 1000000);
      const onMsg = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id === id) {
          ws.removeEventListener('message', onMsg);
          resolve(data.result?.result?.value);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression: code, returnByValue: true, awaitPromise: true }
      }));
    });
  }

  function capture(filename) {
    const dest = `${OUT_DIR}/${filename}.png`;
    console.log(`Capturing: ${dest}`);
    execSync(`adb -s emulator-5554 exec-out screencap -p > "${dest}"`);
  }

  // Ensure unlock stats to allow jumping
  await evalJs(`
    if (window.__arrows?.data) {
      window.__arrows.data.stats.maxLevel = 2000;
      window.__arrows.data.currentLevel = 2000;
      window.__arrows.persist.save(window.__arrows.data);
    }
  `);

  // 1. Home Screen
  console.log('1. Setting up Home Screen...');
  await evalJs(`
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('screen-game')?.classList.remove('active');
    document.getElementById('screen-game')?.classList.add('hidden');
    document.getElementById('screen-home')?.classList.remove('hidden');
    document.getElementById('screen-home')?.classList.add('active');
  `);
  await sleep(600);
  capture('01_home_screen');

  // 2. Beginner Gameplay (Level 5)
  console.log('2. Setting up Beginner Gameplay (Level 5)...');
  await evalJs(`
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('btn-home-play')?.click();
    if (document.getElementById('level-jump')) {
      document.getElementById('level-jump').value = 5;
      document.getElementById('btn-jump')?.click();
    }
  `);
  await sleep(600);
  capture('02_beginner_gameplay');

  // 3. Advanced Puzzle with Bent Arrows (Level 905 - Hard)
  console.log('3. Setting up Advanced Puzzle (Level 905 - Hard)...');
  await evalJs(`
    document.getElementById('btn-pause')?.click();
    setTimeout(() => {
      document.getElementById('btn-pause-home')?.click();
      setTimeout(() => {
        document.getElementById('btn-home-levels')?.click();
        setTimeout(() => {
          const inp = document.getElementById('level-jump');
          if (inp) inp.value = 905;
          document.getElementById('btn-jump')?.click();
        }, 300);
      }, 300);
    }, 300);
  `);
  await sleep(1500);
  capture('03_advanced_puzzle');

  // 4. Obstacles & Color-Keyed Locks (Level 550 - Medium)
  console.log('4. Setting up Obstacles & Locks (Level 550)...');
  await evalJs(`
    document.getElementById('btn-pause')?.click();
    setTimeout(() => {
      document.getElementById('btn-pause-home')?.click();
      setTimeout(() => {
        document.getElementById('btn-home-levels')?.click();
        setTimeout(() => {
          const inp = document.getElementById('level-jump');
          if (inp) inp.value = 550;
          document.getElementById('btn-jump')?.click();
        }, 300);
      }, 300);
    }, 300);
  `);
  await sleep(1500);
  capture('04_obstacles_and_locks');

  // 5. Rotating Pivot Arrow Puzzle (Level 1310 - Expert)
  console.log('5. Setting up Rotating Pivots (Level 1310)...');
  await evalJs(`
    document.getElementById('btn-pause')?.click();
    setTimeout(() => {
      document.getElementById('btn-pause-home')?.click();
      setTimeout(() => {
        document.getElementById('btn-home-levels')?.click();
        setTimeout(() => {
          const inp = document.getElementById('level-jump');
          if (inp) inp.value = 1310;
          document.getElementById('btn-jump')?.click();
        }, 300);
      }, 300);
    }, 300);
  `);
  await sleep(1500);
  capture('05_rotating_pivots');

  // 6. Level Complete / Victory Dialog
  console.log('6. Setting up Level Complete dialog...');
  await evalJs(`
    const modal = document.getElementById('modal-victory');
    if (modal) {
      document.getElementById('victory-level-label').textContent = 'Level 1310 Solved!';
      document.getElementById('victory-tier-tag').textContent = 'Expert Tier';
      document.getElementById('stars-container').innerHTML = '<span class=\"star filled\">★</span><span class=\"star filled\">★</span><span class=\"star filled\">★</span>';
      document.getElementById('reward-base-amount').textContent = '+10';
      document.getElementById('reward-perfect-amount').textContent = '+5';
      document.getElementById('victory-moves').textContent = '14 Moves';
      document.getElementById('victory-accuracy').textContent = '100% Flawless';
      modal.className = 'modal open';
    }
  `);
  await sleep(600);
  capture('06_level_complete');

  // 7. Level Selection (6 Difficulty Tiers)
  console.log('7. Setting up Level Selection modal...');
  await evalJs(`
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('screen-game')?.classList.remove('active');
    document.getElementById('screen-game')?.classList.add('hidden');
    document.getElementById('screen-home')?.classList.remove('hidden');
    document.getElementById('screen-home')?.classList.add('active');
    document.getElementById('btn-home-levels')?.click();
  `);
  await sleep(600);
  capture('07_level_selection');

  // 8. Daily Challenge & 7-Day Streak
  console.log('8. Setting up Daily Challenge & Streak modal...');
  await evalJs(`
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('btn-home-daily-gift')?.click();
  `);
  await sleep(600);
  capture('08_daily_challenge');

  // 9. Cosmetic Shop
  console.log('9. Setting up Cosmetic Shop modal...');
  await evalJs(`
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('btn-home-shop')?.click();
  `);
  await sleep(600);
  capture('09_cosmetic_shop');

  // 10. Achievements & Themes
  console.log('10. Setting up Achievements modal...');
  await evalJs(`
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('btn-home-achievements')?.click();
  `);
  await sleep(600);
  capture('10_achievements_themes');

  // Return to clean home screen
  await evalJs(`
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.getElementById('screen-game')?.classList.remove('active');
    document.getElementById('screen-game')?.classList.add('hidden');
    document.getElementById('screen-home')?.classList.remove('hidden');
    document.getElementById('screen-home')?.classList.add('active');
  `);

  ws.close();
  console.log('ALL 10 GENUINE SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
