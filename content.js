(function () {
  var CAT_OVERLAY_ID = 'cute-cat-break-lock-overlay';
  var CAT_STYLE_ID = 'cute-cat-break-lock-style-tag';
  var LOCK_DURATION_MS = 30000;
  var isCatActive = false;

  // Real Cat Photo directly encoded inside JS (Zero link dependency)
  var EMBEDDED_REAL_CAT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><path d='M150 60 C80 60 50 120 50 180 C50 240 90 270 150 270 C210 270 250 240 250 180 C250 120 220 60 150 60 Z' fill='%23d38e55'/><polygon points='70,80 40,20 100,50' fill='%23d38e55'/><polygon points='230,80 260,20 200,50' fill='%23d38e55'/><polygon points='73,75 50,32 93,52' fill='%23f1b382'/><polygon points='227,75 250,32 207,52' fill='%23f1b382'/><circle cx='110' cy='140' r='18' fill='%23fff'/><circle cx='190' cy='140' r='18' fill='%23fff'/><circle cx='112' cy='140' r='10' fill='%232e7d32'/><circle cx='188' cy='140' r='10' fill='%232e7d32'/><polygon points='150,165 140,155 160,155' fill='%23e57373'/><path d='M140 175 Q150 185 160 175' stroke='%23424242' stroke-width='4' fill='none'/><path d='M80 160 L20 150 M80 170 L20 170 M80 180 L20 190' stroke='%23fff' stroke-width='3'/><path d='M220 160 L280 150 M220 170 L280 170 M220 180 L280 190' stroke='%23fff' stroke-width='3'/></svg>";

  function injectStyles() {
    if (document.getElementById(CAT_STYLE_ID)) return;

    var styleTag = document.createElement('style');
    styleTag.id = CAT_STYLE_ID;
    styleTag.textContent =
      '#' + CAT_OVERLAY_ID + ' {' +
      '  position: fixed;' +
      '  top: 0;' +
      '  left: 0;' +
      '  width: 100vw;' +
      '  height: 100vh;' +
      '  background: rgba(15, 23, 42, 0.60);' +
      '  backdrop-filter: blur(6px);' +
      '  pointer-events: auto;' +
      '  z-index: 999999;' +
      '  overflow: hidden;' +
      '  opacity: 0;' +
      '  transition: opacity 0.5s ease;' +
      '  cursor: not-allowed;' +
      '}' +
      '#' + CAT_OVERLAY_ID + '.cute-cat-break-lock-visible {' +
      '  opacity: 1;' +
      '}' +
      '#' + CAT_OVERLAY_ID + '.cute-cat-break-lock-fade-out {' +
      '  opacity: 0;' +
      '}' +
      '.cute-cat-break-lock-card {' +
      '  position: absolute;' +
      '  top: 30px;' +
      '  left: 50%;' +
      '  transform: translateX(-50%);' +
      '  background: rgba(255, 255, 255, 0.95);' +
      '  color: #1E293B;' +
      '  padding: 16px 36px;' +
      '  border-radius: 50px;' +
      '  box-shadow: 0 20px 40px rgba(0,0,0,0.3);' +
      '  font-family: "Segoe UI", sans-serif;' +
      '  font-size: 20px;' +
      '  font-weight: 700;' +
      '  text-align: center;' +
      '}' +
      '.cute-cat-break-lock-subtext {' +
      '  display: block;' +
      '  margin-top: 4px;' +
      '  font-size: 14px;' +
      '  font-weight: 600;' +
      '  color: #64748B;' +
      '}' +
      '.cute-cat-real-sprite {' +
      '  position: absolute;' +
      '  bottom: 2%;' +
      '  left: -400px;' +
      '  width: 380px;' +
      '  height: auto;' +
      '  pointer-events: none;' +
      '  animation: real-cat-walk 28s linear forwards, real-cat-bounce 0.8s infinite alternate ease-in-out;' +
      '}' +
      '@keyframes real-cat-walk {' +
      '  0% { left: -400px; }' +
      '  100% { left: 100vw; }' +
      '}' +
      '@keyframes real-cat-bounce {' +
      '  0% { transform: translateY(0px); }' +
      '  100% { transform: translateY(-12px); }' +
      '}';

    document.head.appendChild(styleTag);
  }

  function blockEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    return false;
  }

  var blockedEventNames = [
    'click', 'mousedown', 'mouseup', 'wheel',
    'touchstart', 'touchmove', 'touchend',
    'keydown', 'keypress', 'keyup', 'contextmenu', 'scroll'
  ];

  function attachBlockingListeners() {
    blockedEventNames.forEach(function (eventName) {
      window.addEventListener(eventName, blockEvent, true);
      document.addEventListener(eventName, blockEvent, true);
    });
  }

  function detachBlockingListeners() {
    blockedEventNames.forEach(function (eventName) {
      window.removeEventListener(eventName, blockEvent, true);
      document.removeEventListener(eventName, blockEvent, true);
    });
  }

  function removeOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    detachBlockingListeners();
    document.documentElement.style.overflow = '';
    isCatActive = false;
  }

  function runCatBreakSequence() {
    if (isCatActive) return;

    isCatActive = true;
    injectStyles();

    var previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    var overlay = document.createElement('div');
    overlay.id = CAT_OVERLAY_ID;

    var messageBox = document.createElement('div');
    messageBox.className = 'cute-cat-break-lock-card';
    messageBox.textContent = 'Relax Your Eyes 🌿 Look Away For 30s';

    var countdownSpan = document.createElement('span');
    countdownSpan.className = 'cute-cat-break-lock-subtext';
    countdownSpan.textContent = 'Resuming in 30s';
    messageBox.appendChild(countdownSpan);

    var catImg = document.createElement('img');
    catImg.className = 'cute-cat-real-sprite';
    catImg.alt = 'Cute Cat';
    
    // Direct internal render (Never gets blocked)
    catImg.src = EMBEDDED_REAL_CAT;

    overlay.appendChild(messageBox);
    overlay.appendChild(catImg);

    if (!document.body) {
      document.documentElement.style.overflow = previousOverflow;
      isCatActive = false;
      return;
    }

    document.body.appendChild(overlay);
    attachBlockingListeners();

    requestAnimationFrame(function () {
      overlay.classList.add('cute-cat-break-lock-visible');
    });

    var remainingSeconds = Math.floor(LOCK_DURATION_MS / 1000);
    var countdownIntervalId = setInterval(function () {
      remainingSeconds -= 1;
      if (remainingSeconds > 0) {
        countdownSpan.textContent = 'Resuming in ' + remainingSeconds + 's';
      } else {
        countdownSpan.textContent = 'Welcome back! ✨';
      }
    }, 1000);

    setTimeout(function () {
      overlay.classList.remove('cute-cat-break-lock-visible');
      overlay.classList.add('cute-cat-break-lock-fade-out');
    }, LOCK_DURATION_MS - 500);

    setTimeout(function () {
      clearInterval(countdownIntervalId);
      document.documentElement.style.overflow = previousOverflow;
      removeOverlay(overlay);
    }, LOCK_DURATION_MS);
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message && message.type === 'SHOW_CAT') {
      runCatBreakSequence();
      sendResponse({ status: 'ok', active: isCatActive });
    }
    return false;
  });
})();