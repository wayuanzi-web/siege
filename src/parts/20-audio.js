/* ===== 20-audio: 全部用 WebAudio 即時合成，不載任何音檔 ===== */
const AU = { ctx: null, out: null, sg: null, mg: null, nbuf: null, sfxOn: true, musOn: true, vibOn: true, quiet: false, last: {}, combo: 0, comboT: 0, mus: null };
function auInit() {
  if (AU.ctx) { if (AU.ctx.state !== 'running') { try { AU.ctx.resume(); } catch (e) { /* 等下一次觸控再試 */ } } return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = new AC(); AU.ctx = ctx;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.18;
    AU.out = ctx.createGain(); AU.out.gain.value = 1.4; AU.out.connect(comp); comp.connect(ctx.destination);
    AU.sg = ctx.createGain(); AU.sg.gain.value = AU.sfxOn ? 1 : 0; AU.sg.connect(AU.out);
    AU.mg = ctx.createGain(); AU.mg.gain.value = AU.musOn ? 0.3 : 0; AU.mg.connect(AU.out);
    const n = ctx.sampleRate * 1.5, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    AU.nbuf = buf;
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { AU.ctx = null; }
}
function auSet() { if (!AU.ctx) return; AU.sg.gain.value = AU.sfxOn ? 1 : 0; AU.mg.gain.value = AU.musOn ? 0.3 : 0; }
function tone(f, dur, type, vol, f2, t0, dest, atk) {
  const ctx = AU.ctx, t = (t0 || 0) + ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (atk || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || AU.sg); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, vol, type, f, f2, q, t0, dest) {
  const ctx = AU.ctx, t = (t0 || 0) + ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = AU.nbuf; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur); fl.Q.value = q || 0.8;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dest || AU.sg); s.start(t, Math.random()); s.stop(t + dur + 0.03);
}
// 同一種聲音太密集就略過，免得糊成一片
function gap(name, ms) { const n = performance.now(); if (n - (AU.last[name] || 0) < ms) return true; AU.last[name] = n; return false; }
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const UI_SFX = { click: 1, buy: 1, deny: 1, star: 1, win: 1, lose: 1 };
function sfx(name, arg) {
  if (!AU.ctx || !AU.sfxOn || AU.ctx.state !== 'running') return;
  if (AU.quiet && !UI_SFX[name]) return;          // 主畫面背景的示範戰局不出聲
  try {
    const r = Math.random();
    switch (name) {
      // 開火
      case 'rocket': if (gap('rocket', 70)) return; noise(0.22, 0.1, 'bandpass', 900 + r * 500, 2600, 1.2); tone(210 + r * 50, 0.12, 'triangle', 0.07, 120); break;
      case 'bolt': if (gap('bolt', 50)) return; noise(0.05, 0.07, 'highpass', 3600 + r * 1500, 0, 1.2); tone(700 + r * 160, 0.05, 'triangle', 0.045, 300); break;
      case 'cannon': if (gap('cannon', 120)) return; tone(110, 0.3, 'sine', 0.4, 38); noise(0.22, 0.22, 'lowpass', 1100, 160, 0.9); break;
      case 'whoosh': if (gap('whoosh', 110)) return; noise(0.3, 0.1, 'bandpass', 500, 1700, 1.6); break;
      case 'frost': if (gap('frost', 110)) return; tone(1500 + r * 300, 0.16, 'sine', 0.05, 2300); tone(2200, 0.1, 'triangle', 0.025, 0, 0.03); break;
      case 'charge': if (gap('charge', 110)) return; tone(300, 0.2, 'sawtooth', 0.04, 980, 0, null, 0.05); break;
      case 'dark': if (gap('dark', 110)) return; tone(160, 0.3, 'sawtooth', 0.08, 70); tone(240, 0.3, 'square', 0.03, 100); break;
      case 'drill': if (gap('drill', 80)) return; tone(180 + r * 40, 0.22, 'sawtooth', 0.06, 420); noise(0.2, 0.08, 'bandpass', 1800, 900, 2.5); break;
      case 'snipe': if (gap('snipe', 90)) return; noise(0.05, 0.3, 'highpass', 2600, 0, 1); tone(1400, 0.06, 'square', 0.05, 300); noise(0.4, 0.06, 'bandpass', 900, 300, 1.5, 0.04); break;
      case 'mag': if (gap('mag', 200)) return; tone(110, 0.5, 'sawtooth', 0.06, 220, 0, null, 0.05); tone(165, 0.5, 'square', 0.03, 330, 0, null, 0.05); break;
      case 'crit': [88, 95].forEach((n, i) => tone(NOTE(n), 0.16, 'triangle', 0.09, 0, i * 0.05)); break;
      case 'fix': if (gap('fix', 160)) return; for (let i = 0; i < 2; i++) { tone(900 + r * 200, 0.06, 'square', 0.04, 600, i * 0.11); noise(0.04, 0.06, 'bandpass', 2400, 0, 2, i * 0.11); } break;
      // 第四篇
      case 'zip': if (gap('zip', 110)) return; noise(0.2, 0.12, 'bandpass', 1600, 4200, 1.4); tone(520, 0.12, 'square', 0.03, 1300); break;
      case 'heave': if (gap('heave', 140)) return; tone(96, 0.3, 'sine', 0.32, 48); noise(0.24, 0.14, 'lowpass', 520, 120, 1); break;
      case 'warp': if (gap('warp', 90)) return; tone(300, 0.36, 'sine', 0.06, 1200, 0, null, 0.04); tone(450, 0.3, 'triangle', 0.035, 1800, 0.04); break;
      case 'mirror': if (gap('mirror', 70)) return; tone(2600 + r * 500, 0.24, 'sine', 0.05, 1900); tone(3900, 0.16, 'sine', 0.025); break;
      case 'reel': if (gap('reel', 300)) return; noise(0.6, 0.1, 'bandpass', 900, 2600, 2); tone(200, 0.5, 'sawtooth', 0.035, 330, 0, null, 0.05); break;
      case 'seed': if (gap('seed', 110)) return; noise(0.08, 0.1, 'bandpass', 2600, 1400, 2); tone(880 + r * 120, 0.08, 'triangle', 0.04, 1300); break;
      case 'axe': if (gap('axe', 90)) return; noise(0.22, 0.1, 'bandpass', 1100, 2400, 3); tone(300, 0.2, 'triangle', 0.03, 600, 0, null, 0.02); break;
      case 'chop': if (gap('chop', 70)) return; noise(0.07, 0.24, 'bandpass', 1400 + r * 400, 700, 2.2); tone(170, 0.08, 'square', 0.06, 90); break;
      case 'dig': if (gap('dig', 160)) return; noise(0.35, 0.12, 'lowpass', 500, 150, 1); tone(70, 0.3, 'sine', 0.14, 45); break;
      case 'drum': if (gap('drum', 90)) return; tone(64, 0.45, 'sine', 0.5, 38); noise(0.12, 0.2, 'lowpass', 400, 90, 1); tone(128, 0.18, 'triangle', 0.08, 70, 0.01); break;
      case 'grow': if (gap('grow', 150)) return; tone(420 + r * 80, 0.3, 'sine', 0.04, 760, 0, null, 0.05); noise(0.25, 0.05, 'bandpass', 3200, 2000, 3); break;
      case 'sand': if (gap('sand', 400)) return; noise(1.1, 0.14, 'lowpass', 380, 120, 0.8); tone(52, 1, 'sine', 0.12, 40, 0, null, 0.2); break;
      case 'stick': if (gap('stick', 120)) return; noise(0.12, 0.12, 'lowpass', 700, 200, 1.5); tone(220, 0.08, 'sine', 0.06, 140); break;
      // 命中
      case 'tick': if (gap('tick', 45)) return; noise(0.03, 0.06, 'bandpass', 2200 + r * 1600, 0, 2); break;
      case 'boom': if (gap('boom', 60)) return; noise(0.3, 0.2, 'lowpass', 1300, 120, 0.8); tone(125 + r * 30, 0.22, 'sine', 0.2, 46); break;
      case 'boom2': if (gap('boom2', 90)) return; noise(0.6, 0.4, 'lowpass', 1300, 60, 0.8); tone(92, 0.5, 'sine', 0.42, 28); noise(0.2, 0.1, 'highpass', 3000, 0, 1, 0.02); break;
      case 'boom3': if (gap('boom3', 120)) return; noise(1.0, 0.55, 'lowpass', 1500, 50, 0.8); tone(80, 0.8, 'sine', 0.5, 24); noise(0.4, 0.14, 'highpass', 2600, 0, 1, 0.03); break;
      case 'ice': if (gap('ice', 80)) return; noise(0.2, 0.12, 'highpass', 4200, 2000, 1.5); tone(1800 + r * 500, 0.14, 'triangle', 0.05, 900); break;
      case 'fireboom': if (gap('fireboom', 80)) return; noise(0.45, 0.2, 'bandpass', 600, 220, 0.8); tone(110, 0.25, 'sine', 0.18, 50); break;
      case 'thunder': if (gap('thunder', 140)) return; noise(0.08, 0.4, 'highpass', 2500, 0, 1); noise(0.9, 0.4, 'lowpass', 900, 70, 0.7, 0.03); tone(70, 0.7, 'sawtooth', 0.14, 34, 0.03); break;
      // 磚
      case 'crack': if (gap('crack', 70)) return; noise(0.08, 0.14, 'bandpass', 1300 + r * 700, 400, 1.6); break;
      case 'crumble': if (gap('crumble', 70)) return; noise(0.16, 0.16, 'lowpass', 800 + r * 400, 200, 1); tone(150 + r * 50, 0.08, 'triangle', 0.06, 80); break;
      case 'clang': if (gap('clang', 120)) return; tone(880 + r * 200, 0.2, 'square', 0.045, 660); tone(1320, 0.12, 'square', 0.025); break;
      case 'shatter': if (gap('shatter', 80)) return; noise(0.22, 0.14, 'highpass', 5200, 2400, 1.2); tone(2400 + r * 800, 0.1, 'sine', 0.04, 1200); break;
      case 'creak': if (gap('creak', 400)) return; tone(92, 0.4, 'sawtooth', 0.07, 60, 0, null, 0.08); noise(0.35, 0.06, 'bandpass', 320, 180, 3); break;
      case 'thud': if (gap('thud', 120)) return; tone(84, 0.3, 'sine', 0.4, 30); noise(0.22, 0.2, 'lowpass', 600, 90, 1); break;
      case 'crash': if (gap('crash', 200)) return; tone(70, 0.6, 'sine', 0.5, 24); noise(0.7, 0.36, 'lowpass', 1100, 70, 0.8); for (let i = 0; i < 4; i++) noise(0.18, 0.12, 'bandpass', 900 + Math.random() * 900, 300, 1.2, 0.08 + i * 0.09); break;
      case 'collapse': noise(2.0, 0.55, 'lowpass', 1500, 55, 0.7); tone(92, 1.6, 'sine', 0.5, 22); for (let i = 0; i < 9; i++) noise(0.3, 0.2, 'lowpass', 1000, 100, 1, 0.12 + i * 0.17); break;
      // 第二篇
      case 'glass': if (gap('glass', 70)) return; noise(0.3, 0.16, 'highpass', 6000, 3000, 1.4); for (let i = 0; i < 3; i++) tone(2600 + Math.random() * 2400, 0.16 + Math.random() * 0.12, 'sine', 0.035, 0, i * 0.03); break;
      case 'tink': if (gap('tink', 90)) return; tone(3200 + r * 1600, 0.12, 'sine', 0.03, 0); break;
      case 'snap': if (gap('snap', 80)) return; noise(0.06, 0.28, 'bandpass', 2400, 900, 2); tone(300, 0.08, 'triangle', 0.08, 120); noise(0.3, 0.06, 'bandpass', 600, 200, 3, 0.04); break;
      case 'chainsnap': if (gap('chainsnap', 120)) return; tone(1180 + r * 200, 0.3, 'square', 0.05, 900); tone(1760, 0.2, 'square', 0.03, 0, 0.02); noise(0.12, 0.14, 'highpass', 3000, 0, 1); break;
      case 'splash': if (gap('splash', 120)) return; noise(0.45, 0.22, 'bandpass', 900 + r * 500, 2600, 0.8); noise(0.6, 0.08, 'highpass', 3000, 1500, 0.8, 0.05); break;
      case 'chime': for (let i = 0; i < 5; i++) tone(NOTE(84 + [0, 4, 7, 12, 16][i]), 1.2, 'sine', 0.06, 0, i * 0.07); break;
      case 'thunk': if (gap('thunk', 120)) return; tone(70 + r * 20, 0.35, 'sine', 0.45, 30); noise(0.28, 0.24, 'lowpass', 700, 90, 1); break;
      case 'bong': if (gap('bong', 300)) return; [1, 2.76, 5.4, 8.9].forEach((k, i) => tone(98 * k, 2.6 / (1 + i * 0.6), 'sine', [0.34, 0.14, 0.07, 0.035][i], 0, 0, null, 0.004)); noise(0.12, 0.2, 'lowpass', 900, 200, 1); break;
      case 'groan': if (gap('groan', 600)) return; tone(70, 1.4, 'sawtooth', 0.08, 44, 0, null, 0.2); tone(105, 1.2, 'sawtooth', 0.04, 70, 0.1, null, 0.2); noise(1.2, 0.07, 'bandpass', 260, 120, 4); break;
      // 倍增符
      case 'gate': {
        if (gap('gate' + (arg || 0), 38)) return;
        const n = performance.now(); if (n - AU.comboT > 500) AU.combo = 0; AU.comboT = n; AU.combo = Math.min(AU.combo + 1, 14);
        const f = NOTE((arg === 1 ? 60 : 72) + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33][AU.combo]);
        tone(f, 0.11, 'triangle', arg === 1 ? 0.05 : 0.09); tone(f * 2, 0.07, 'sine', 0.035); break;
      }
      case 'gold': if (gap('gold', 34)) return; { const f = NOTE(84 + ((r * 5) | 0) * 2); tone(f, 0.16, 'triangle', 0.1); tone(f * 1.5, 0.12, 'sine', 0.05); } break;
      case 'goldin': [84, 88, 91, 96].forEach((n, i) => tone(NOTE(n), 0.2, 'triangle', 0.09, 0, i * 0.07)); noise(0.5, 0.05, 'highpass', 6000, 0, 1, 0); break;
      case 'gspawn': if (gap('gspawn', 150)) return; tone(NOTE(79), 0.14, 'triangle', 0.06); tone(NOTE(86), 0.16, 'triangle', 0.05, 0, 0.07); break;
      case 'ghit': if (gap('ghit', 55)) return; tone(520 + r * 120, 0.05, 'square', 0.035, 380); break;
      case 'gbreak': noise(0.4, 0.16, 'highpass', 3500, 1200, 1); [96, 91, 88, 84].forEach((n, i) => tone(NOTE(n), 0.14, 'triangle', 0.06, 0, i * 0.05)); break;
      case 'gfade': if (gap('gfade', 200)) return; tone(NOTE(84), 0.2, 'sine', 0.04, NOTE(72)); break;
      case 'bad': if (gap('bad', 110)) return; tone(160, 0.14, 'sawtooth', 0.07, 82); break;
      // 兵
      case 'kill': [72, 79, 84].forEach((n, i) => tone(NOTE(n), 0.14, 'square', 0.05, 0, i * 0.05)); noise(0.2, 0.1, 'bandpass', 1200, 400, 1.2); break;
      case 'lostunit': tone(300, 0.4, 'sawtooth', 0.1, 110); noise(0.3, 0.12, 'lowpass', 800, 200, 1); break;
      // 技能與機關
      case 'shield': tone(420, 0.5, 'sine', 0.14, 840, 0, null, 0.05); tone(630, 0.5, 'triangle', 0.06, 1260, 0, null, 0.05); noise(0.5, 0.05, 'highpass', 5000, 0, 1); break;
      case 'shieldhit': if (gap('shieldhit', 55)) return; tone(1100 + r * 500, 0.07, 'sine', 0.04); break;
      case 'ult': noise(0.9, 0.2, 'bandpass', 600, 3200, 1.2); [67, 72, 76, 79, 84].forEach((n, i) => { tone(NOTE(n), 0.22, 'sawtooth', 0.05, 0, i * 0.06); tone(NOTE(n), 0.22, 'triangle', 0.07, 0, i * 0.06); }); tone(70, 0.5, 'sine', 0.3, 34); break;
      case 'port': if (gap('port', 70)) return; tone(900, 0.14, 'sine', 0.05, 2400); break;
      case 'ping': if (gap('ping', 60)) return; tone(2100 + r * 700, 0.16, 'sine', 0.06); tone(3200, 0.1, 'sine', 0.025); break;
      case 'flak': if (gap('flak', 90)) return; noise(0.06, 0.1, 'bandpass', 2600, 0, 2); tone(520, 0.05, 'square', 0.03, 300); break;
      case 'pop': noise(0.12, 0.3, 'highpass', 1800, 600, 0.9); tone(420, 0.12, 'square', 0.08, 120); break;
      case 'launch': if (gap('launch', 300)) return; noise(0.5, 0.08, 'bandpass', 300, 900, 1.4); break;
      case 'drop': if (gap('drop', 200)) return; tone(1400, 0.5, 'sine', 0.05, 500); break;
      case 'lantern': [76, 81, 88].forEach((n, i) => tone(NOTE(n), 0.3, 'sine', 0.06, 0, i * 0.12)); break;
      case 'bonus': [72, 76, 79, 84, 88].forEach((n, i) => tone(NOTE(n), 0.2, 'triangle', 0.09, 0, i * 0.055)); break;
      case 'lit': if (gap('lit', 70)) return; noise(0.14, 0.07, 'bandpass', 700, 1800, 1.4); break;
      case 'fizz': if (gap('fizz', 400)) return; noise(1.4, 0.06, 'highpass', 3800, 6000, 0.9); noise(1.2, 0.04, 'bandpass', 1600, 2600, 2, 0.1); break;
      case 'orb': tone(60, 1.1, 'sawtooth', 0.18, 110, 0, null, 0.3); for (let i = 0; i < 3; i++) tone(i & 1 ? 415 : 554, 0.2, 'sawtooth', 0.09, 0, i * 0.22, null, 0.03); break;
      case 'erupt': if (gap('erupt', 300)) return; noise(1.1, 0.3, 'lowpass', 400, 1600, 0.8); tone(58, 0.9, 'sine', 0.3, 40, 0, null, 0.1); break;
      case 'warn': if (gap('warn', 500)) return; for (let i = 0; i < 3; i++) tone(i & 1 ? 520 : 700, 0.15, 'sawtooth', 0.09, 0, i * 0.16, null, 0.02); break;
      case 'rumble': tone(48, 1.2, 'sine', 0.4, 36, 0, null, 0.2); noise(1.2, 0.2, 'lowpass', 300, 120, 0.8); break;
      case 'phase': tone(70, 1.2, 'sawtooth', 0.22, 40, 0, null, 0.06); noise(1.0, 0.2, 'bandpass', 380, 160, 1.5); for (let i = 0; i < 6; i++) tone(i & 1 ? 415 : 554, 0.24, 'sawtooth', 0.13, 0, 0.2 + i * 0.26, null, 0.03); break;
      case 'horn': tone(146, 1.0, 'sawtooth', 0.15, 0, 0, null, 0.12); tone(219, 1.0, 'sawtooth', 0.1, 0, 0.05, null, 0.12); noise(0.9, 0.05, 'lowpass', 500, 0, 1); break;
      case 'gust': noise(1.4, 0.14, 'bandpass', 300, 1100, 0.9); noise(1.2, 0.07, 'highpass', 2600, 0, 0.7, 0.2); break;
      // 第三篇的環境
      case 'surge': noise(2.4, 0.32, 'lowpass', 260, 900, 0.7); noise(2.0, 0.12, 'bandpass', 1200, 500, 0.8, 0.4); tone(44, 1.8, 'sine', 0.3, 34, 0, null, 0.3); break;          // 暴潮：一大片海水湧上來的轟隆聲
      case 'tide': noise(1.6, 0.08, 'bandpass', 500, 900, 0.9); break;
      case 'lava': noise(2.0, 0.16, 'lowpass', 180, 420, 0.8); tone(40, 1.6, 'sine', 0.26, 30, 0, null, 0.3); for (let i = 0; i < 4; i++) tone(90 + r * 60, 0.09, 'sine', 0.05, 40, 0.3 + i * 0.27); break;          // 岩漿上漲：低沉的隆隆聲，咕嘟咕嘟冒泡
      case 'pour': noise(2.2, 0.18, 'bandpass', 900, 2600, 0.6); noise(1.8, 0.08, 'highpass', 4200, 7000, 0.8, 0.15); tone(70, 0.6, 'sine', 0.2, 44); break;          // 鐵水澆下來：嘶——
      case 'volcano': noise(1.4, 0.36, 'lowpass', 500, 2000, 0.7); tone(36, 1.4, 'sine', 0.42, 28, 0, null, 0.15); break;          // 火山噴發
      case 'roar': if (gap('roar', 900)) return; tone(55, 1.4, 'sawtooth', 0.2, 36, 0, null, 0.15); tone(83, 1.2, 'sawtooth', 0.12, 58, 0.06, null, 0.15); noise(1.3, 0.18, 'bandpass', 420, 160, 1.2); noise(0.8, 0.08, 'highpass', 2400, 900, 0.9, 0.3); break;          // 機關巨獸吼一聲：低沉的鐵嗓子，接著洩一陣蒸汽
      case 'servo': if (gap('servo', 180)) return; tone(62, 0.34, 'sine', 0.42, 30); noise(0.26, 0.22, 'lowpass', 700, 90, 1); tone(330, 0.18, 'square', 0.03, 150, 0.05); break;          // 巨獸的一步：咚——鏗
      case 'flame': if (gap('flame', 240)) return; noise(0.5, 0.16, 'bandpass', 520, 1300, 0.7); noise(0.4, 0.06, 'highpass', 2600, 4000, 0.8, 0.05); break;          // 噴火：呼——
      case 'beam': if (gap('beam', 900)) return; tone(110, 2.0, 'sawtooth', 0.1, 230, 0, null, 0.3); tone(880, 1.8, 'sine', 0.05, 1760, 0.1, null, 0.3); noise(1.8, 0.1, 'bandpass', 1600, 3200, 2); break;          // 光束：越來越尖的嗡嗡聲
      case 'steam': noise(1.6, 0.4, 'highpass', 1800, 900, 0.7); noise(0.9, 0.3, 'lowpass', 900, 120, 0.8); tone(60, 0.7, 'sine', 0.4, 26); break;          // 鍋爐炸開：轟一聲，接著一大陣蒸汽嘶嘶
      case 'clank': if (gap('clank', 300)) return; tone(420, 0.12, 'square', 0.06, 180); noise(0.18, 0.16, 'bandpass', 1400, 600, 2); tone(260, 0.3, 'triangle', 0.05, 90, 0.08); break;          // 連結器斷開：鏗——
      case 'screech': noise(2.2, 0.08, 'bandpass', 3200, 2400, 6); tone(1900, 2, 'sawtooth', 0.02, 1500); break;          // 車廂煞車滑走
      case 'whistle': [0, 1].forEach((i) => tone(i ? 740 : 588, 0.55, 'triangle', 0.06, 0, i * 0.05, null, 0.06)); break;          // 汽笛（換景、進隧道）
      // 回合
      case 'turn': tone(NOTE(79), 0.12, 'triangle', 0.08); tone(NOTE(86), 0.2, 'triangle', 0.07, 0, 0.09); break;
      case 'arm': [72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.12, 'square', 0.05, 0, i * 0.045)); noise(0.3, 0.06, 'highpass', 5000, 0, 1); break;
      case 'chain': [60, 64, 67, 72, 76, 79].slice(0, 3 + Math.min(3, arg || 0)).forEach((n, i) => { tone(NOTE(n + 12), 0.2, 'triangle', 0.1, 0, i * 0.07); tone(NOTE(n), 0.2, 'sawtooth', 0.04, 0, i * 0.07); }); break;
      case 'fire0': tone(140, 0.12, 'sine', 0.2, 60); noise(0.08, 0.1, 'lowpass', 900, 200, 1); break;
      // 介面
      case 'click': tone(660, 0.05, 'triangle', 0.06, 880); break;
      case 'buy': [79, 84, 88].forEach((n, i) => tone(NOTE(n), 0.14, 'triangle', 0.08, 0, i * 0.06)); break;
      case 'deny': tone(180, 0.14, 'square', 0.04, 120); break;
      case 'star': tone(NOTE(84 + (arg || 0) * 4), 0.3, 'triangle', 0.1); tone(NOTE(96 + (arg || 0) * 4), 0.2, 'sine', 0.04, 0, 0.03); break;
      case 'win': [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => { tone(NOTE(n), 0.34, 'sawtooth', 0.07, 0, i * 0.11); tone(NOTE(n), 0.34, 'triangle', 0.1, 0, i * 0.11); }); [72, 76, 79].forEach((n) => tone(NOTE(n), 1.1, 'triangle', 0.09, 0, 0.82, null, 0.03)); break;
      case 'lose': [67, 63, 60, 55].forEach((n, i) => tone(NOTE(n), 0.42, 'triangle', 0.13, 0, i * 0.24)); break;
    }
  } catch (e) { /* 聲音失敗不影響遊戲 */ }
}

/* ---------- 配樂：每個場景一組音階、速度、鼓點 ---------- */
const MUS = [
  { sc: [60, 62, 64, 67, 69], bpm: 104, lead: [0, -1, 2, -1, 3, 2, -1, 4, 3, -1, 2, -1, 0, -1, 1, 2, 4, -1, 3, -1, 2, 3, -1, 0, 1, -1, 2, -1, 3, 4, 2, -1], drum: 0, wave: 'triangle' },       // 青丘：明亮
  { sc: [57, 58, 61, 64, 65], bpm: 100, lead: [0, -1, 1, 2, -1, 1, 0, -1, 3, -1, 4, 3, 2, -1, 1, -1, 0, 1, 2, -1, 3, 2, 1, -1, 4, -1, 3, 2, 1, 2, 0, -1], drum: 1, wave: 'sawtooth' },        // 黃沙：異域
  { sc: [62, 65, 67, 69, 72], bpm: 90, lead: [4, -1, -1, 2, -1, -1, 3, -1, 1, -1, -1, 0, -1, 2, -1, -1, 3, -1, -1, 4, -1, 2, -1, -1, 1, -1, 0, -1, -1, 2, -1, -1], drum: 2, wave: 'sine' },    // 霜河：清冷
  { sc: [52, 55, 57, 59, 62], bpm: 118, lead: [0, 0, -1, 2, -1, 0, 3, -1, 0, 0, -1, 4, -1, 3, 2, -1, 0, 0, -1, 2, -1, 0, 3, -1, 4, -1, 3, -1, 2, 1, 0, -1], drum: 3, wave: 'sawtooth' },     // 熔岩：急促
  { sc: [65, 67, 69, 72, 74], bpm: 108, lead: [0, 2, 4, 2, 1, 3, 4, -1, 0, 2, 4, 3, 2, -1, 1, -1, 0, 2, 3, 2, 1, 3, 4, -1, 4, 3, 2, 1, 0, -1, 2, -1], drum: 0, wave: 'triangle' },           // 雲海：輕快
  { sc: [50, 51, 55, 56, 58], bpm: 124, lead: [0, -1, 0, 1, -1, 0, 3, -1, 2, -1, 1, 0, -1, 4, 3, -1, 0, -1, 0, 1, -1, 3, 4, -1, 3, 2, 1, -1, 0, 1, 0, -1], drum: 3, wave: 'square' },         // 魔王城：陰沉
  // 第二篇
  { sc: [55, 58, 60, 62, 65], bpm: 100, lead: [0, -1, -1, 1, -1, 2, 3, -1, -1, 2, 1, -1, 0, -1, -1, -1, 1, -1, -1, 2, -1, 3, 4, -1, -1, 3, 2, -1, 1, -1, -1, -1], drum: 1, wave: 'triangle' },    // 怒海：一起一伏的浪
  { sc: [60, 62, 65, 67, 70], bpm: 110, lead: [0, -1, 2, 3, -1, 2, 0, -1, 4, -1, 3, -1, 2, 3, 2, -1, 0, -1, 2, 3, -1, 4, 3, -1, 2, -1, 0, 1, 2, -1, 0, -1], drum: 0, wave: 'triangle' },     // 石林：輕快
  { sc: [57, 60, 62, 64, 67], bpm: 86, lead: [4, -1, -1, 3, -1, 2, -1, -1, 3, -1, -1, 1, -1, 0, -1, -1, 2, -1, -1, 3, -1, 4, -1, -1, 3, -1, 2, -1, 1, -1, -1, -1], drum: 2, wave: 'sine' },        // 懸空寺：空靈
  { sc: [52, 55, 57, 58, 62], bpm: 112, lead: [0, -1, 0, 2, -1, 3, 2, -1, 0, -1, 4, -1, 3, 2, -1, -1, 0, -1, 0, 2, -1, 3, 4, -1, 3, -1, 2, 0, -1, 2, -1, -1], drum: 1, wave: 'sawtooth' },   // 天秤寨：西部
  { sc: [64, 66, 68, 71, 73], bpm: 92, lead: [4, 3, -1, 2, -1, 3, -1, -1, 1, 2, -1, 0, -1, 1, -1, -1, 4, 3, -1, 2, -1, 4, -1, -1, 3, -1, 2, -1, 1, -1, -1, -1], drum: 2, wave: 'sine' },         // 琉璃宮：月夜
  { sc: [57, 58, 62, 64, 65], bpm: 100, lead: [2, -1, 3, 4, -1, 3, 2, -1, 0, -1, 1, -1, 2, -1, -1, -1, 4, -1, 3, 2, -1, 1, 2, -1, 3, -1, 2, 1, 0, -1, -1, -1], drum: 0, wave: 'triangle' }      // 五重塔：秋寺
];
// 第四篇
MUS[18] = { sc: [62, 64, 67, 69, 74], bpm: 96, lead: [0, -1, 2, -1, 4, -1, -1, 3, -1, 2, -1, -1, 1, -1, 0, -1, 2, -1, 4, -1, 3, -1, -1, 4, -1, 2, -1, 1, 0, -1, -1, -1], drum: 2, wave: 'triangle' };       // 天秤孤峰：高山、風
MUS[20] = { sc: [57, 60, 62, 64, 67], bpm: 88, lead: [0, -1, 2, -1, -1, 3, -1, 2, 4, -1, -1, 3, -1, 2, 0, -1, 1, -1, 2, -1, -1, 4, -1, 3, 2, -1, -1, 1, -1, 0, -1, -1], drum: 2, wave: 'triangle' };       // 古木藤城：清晨的森林
MUS[21] = { sc: [57, 58, 61, 62, 64], bpm: 110, lead: [0, 1, -1, 2, -1, 1, 0, -1, 3, -1, 2, 1, -1, 4, 3, -1, 0, 1, -1, 2, 3, -1, 2, 1, 4, -1, 3, -1, 2, 1, 0, -1], drum: 3, wave: 'sawtooth' };         // 流沙古城：沙海、鼓點
MUS[22] = { sc: [50, 53, 55, 57, 60], bpm: 84, lead: [0, -1, -1, 2, -1, -1, 1, -1, -1, -1, 3, -1, 2, -1, -1, -1, 0, -1, -1, 4, -1, -1, 3, -1, 2, -1, -1, -1, 1, -1, -1, -1], drum: 2, wave: 'sine' };       // 無月夜襲：夜色、壓低的聲音
MUS[23] = { sc: [62, 64, 66, 69, 71], bpm: 116, lead: [0, 2, 4, -1, 3, 2, 1, -1, 4, 3, 2, -1, 0, -1, 1, 2, 3, 4, -1, 2, 3, -1, 1, 0, 4, -1, 3, 2, 1, -1, 0, -1], drum: 0, wave: 'sawtooth' };         // 天空要塞：決戰
MUS[24] = { sc: [60, 62, 64, 67, 69], bpm: 104, lead: [0, 2, -1, 4, -1, 3, 2, -1, 0, -1, 2, 3, 4, -1, -1, 2, 3, -1, 1, -1, 0, 2, -1, 4, 3, -1, 2, -1, 1, 0, -1, -1], drum: 1, wave: 'square' };       // 疊城對決：輕快、一塊一塊疊上去
MUS[25] = { sc: [57, 58, 61, 64, 65], bpm: 92, lead: [0, -1, 2, 1, -1, 3, -1, 2, 4, -1, 3, -1, 1, 2, -1, 0, -1, 1, 3, -1, 2, -1, 4, 3, -1, 1, -1, 2, 0, -1, -1, -1], drum: 3, wave: 'triangle' };       // 煉金沸城：冒泡的坩堝、詭譎
MUS[19] = { sc: [55, 56, 59, 60, 63], bpm: 102, lead: [0, -1, 1, -1, 2, 1, 0, -1, 3, -1, 2, -1, 4, 3, 2, -1, 0, -1, 1, 2, -1, 3, -1, -1, 4, -1, 3, 2, 1, -1, 0, -1], drum: 1, wave: 'sawtooth' };         // 鏡門天塹：黃昏峽谷、古紋
const MUS_HOME = { sc: [57, 60, 62, 64, 67], bpm: 84, lead: [0, -1, -1, 2, -1, -1, 3, -1, 2, -1, -1, 4, -1, 3, -1, -1, 2, -1, -1, 0, -1, 1, -1, -1, 2, -1, 3, -1, -1, 2, -1, -1], drum: 2, wave: 'triangle' };   // 主畫面
function musStart(theme) { musStop(); if (!AU.ctx) return; AU.mus = { th: theme === 'home' ? MUS_HOME : MUS[theme] || MUS[0], step: 0, next: AU.ctx.currentTime + 0.1, heat: 0 }; }
function musStop() { AU.mus = null; }
function musStep(heat) {
  try {
    const m = AU.mus; if (!m || !AU.ctx || AU.ctx.state !== 'running' || !AU.musOn) return;
    m.heat += (heat - m.heat) * 0.05;
    const ctx = AU.ctx, th = m.th, bpm = th.bpm + m.heat * 18, sl = 60 / bpm / 4, d = AU.mg, sc = th.sc;
    if (m.next < ctx.currentTime - 0.3) m.next = ctx.currentTime + 0.05;
    while (m.next < ctx.currentTime + 0.14) {
      const s = m.step % 32, s16 = s % 16, t0 = m.next - ctx.currentTime, hot = m.heat > 0.45;
      // 鼓
      if (th.drum === 0) { if (s16 === 0 || s16 === 6 || s16 === 8 || (hot && (s16 === 3 || s16 === 11 || s16 === 14))) { tone(92, 0.26, 'sine', 0.46, 40, t0, d); noise(0.05, 0.12, 'lowpass', 500, 0, 1, t0, d); } if (s16 === 4 || s16 === 12) noise(0.07, 0.14, 'bandpass', 1900, 0, 1.4, t0, d); }
      else if (th.drum === 1) { if (s16 === 0 || s16 === 3 || s16 === 8 || s16 === 11) { tone(120, 0.18, 'sine', 0.4, 60, t0, d); } if (s16 === 6 || s16 === 14 || (hot && (s16 & 1))) noise(0.04, 0.12, 'bandpass', 2600, 0, 2, t0, d); }
      else if (th.drum === 2) { if (s16 === 0) tone(78, 0.5, 'sine', 0.34, 40, t0, d); if (s16 === 8 || (hot && s16 === 12)) noise(0.09, 0.07, 'highpass', 5200, 0, 1, t0, d); }
      else { if (s16 === 0 || s16 === 4 || s16 === 8 || s16 === 10 || s16 === 12 || (hot && s16 === 14)) { tone(86, 0.24, 'sine', 0.5, 36, t0, d); noise(0.05, 0.14, 'lowpass', 500, 0, 1, t0, d); } if (s16 === 4 || s16 === 12) noise(0.09, 0.18, 'bandpass', 1700, 0, 1.2, t0, d); if (hot && (s16 & 1)) noise(0.025, 0.05, 'highpass', 6000, 0, 1, t0, d); }
      // 低音
      if (s16 === 0 || s16 === 8) tone(NOTE(sc[0] - 12), sl * 7, 'triangle', 0.2, 0, t0, d, 0.02);
      if (s16 === 12) tone(NOTE(sc[(m.step >> 4) & 1 ? 3 : 2] - 12), sl * 3.5, 'triangle', 0.16, 0, t0, d, 0.02);
      // 主旋律
      const li = th.lead[(s + ((m.step >> 5) & 1) * 7) % 32];
      if (li >= 0) { const f = NOTE(sc[li] + 12); tone(f, sl * 2.6, th.wave, th.wave === 'triangle' || th.wave === 'sine' ? 0.12 : 0.045, 0, t0, d, 0.004); tone(f * 2, sl * 1.2, 'sine', 0.03, 0, t0, d, 0.004); }
      m.step++; m.next += sl;
    }
  } catch (e) { /* 聲音失敗不影響遊戲 */ }
}
function vibrate(ms) { try { if (AU.vibOn && !AU.quiet && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 不支援震動 */ } }
