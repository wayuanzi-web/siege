/* ===== 90-web: 只有公開網頁 App 版才有的東西 — 分享、安裝到主畫面、離線快取 ===== */
(function webExtras() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(ua);
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const shareUrl = location.origin + location.pathname + '?openExternalBrowser=1';   // LINE 看到這個參數會改用手機瀏覽器開
  let deferred = null;

  // 分享、安裝：兩顆小按鈕，放在主畫面中間那一欄的最上面（下面是關卡說明）
  const row = document.createElement('div'); row.className = 'webbar';
  row.innerHTML = '<button id="btnShare" class="btn chip" aria-label="分享給朋友"><span>分享</span></button><button id="btnInstall" class="btn chip" aria-label="安裝到主畫面"><span>安裝</span></button>';
  const mid = document.querySelector('#home .home-m'); mid.insertBefore(row, mid.firstChild); $('home').classList.add('web');
  if (standalone) $('btnInstall').hidden = true;

  const how = document.createElement('div'); how.id = 'how'; how.className = 'modal'; how.hidden = true;
  how.setAttribute('role', 'dialog'); how.setAttribute('aria-modal', 'true');
  how.innerHTML = '<div class="plaque narrow chamfer"><h2>安裝</h2><p class="tipline" id="howText"></p><button class="btn" id="howClose"><span>知道了</span></button></div>';
  $('stage').appendChild(how);
  how.style.zIndex = 8;
  const closeHow = () => { how.hidden = true; $('home').inert = false; };
  $('howClose').addEventListener('click', () => { sfx('click'); closeHow(); });

  function toast(msg) { $('liTip').textContent = msg; }

  $('btnShare').addEventListener('click', async () => {
    auInit(); sfx('click');
    const data = { title: '千砲破城', text: '兩座城樓隔空對轟，一發變千發！手機點開就能玩：', url: shareUrl };
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(shareUrl); toast('連結已複製，貼給朋友就能玩。'); }
    catch (e) { toast('把這個網址傳給朋友：' + shareUrl); }
  });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { $('btnInstall').hidden = true; });
  $('btnInstall').addEventListener('click', async () => {
    auInit(); sfx('click');
    if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* 使用者關掉了 */ } deferred = null; return; }
    $('howText').textContent = inApp ? '這個 App 內建的瀏覽器不能安裝。請先點右上角選單，選「用預設瀏覽器開啟」，再回來按安裝。'
      : isIOS ? '在 Safari 點「分享」按鈕，往下找到「加入主畫面」，就會多一個像 App 的圖示。'
        : '請打開瀏覽器的選單，選「安裝應用程式」或「加到主畫面」。';
    how.hidden = false; $('home').inert = true;
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* 沒有離線快取也能玩 */ }); });
  }
})();
