document.addEventListener('DOMContentLoaded', function () {
  var timerDisplay = document.getElementById('timerDisplay');
  var stateDisplay = document.getElementById('stateDisplay');
  var toggleBtn = document.getElementById('toggleBtn');
  var summonBtn = document.getElementById('summonBtn');
  var intervalButtons = document.querySelectorAll('.interval-btn');

  var DEFAULT_INTERVAL_MINUTES = 30;
  var countdownTimerId = null;
  var currentNextBreakTimestamp = null;
  var currentIsActive = false;
  var currentIntervalMinutes = DEFAULT_INTERVAL_MINUTES;

  function formatTime(totalSeconds) {
    if (totalSeconds < 0) {
      totalSeconds = 0;
    }
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = Math.floor(totalSeconds % 60);
    var minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
    var secondsStr = seconds < 10 ? '0' + seconds : String(seconds);
    return minutesStr + ':' + secondsStr;
  }

  function updateTimerDisplay() {
    if (!currentIsActive || !currentNextBreakTimestamp) {
      timerDisplay.textContent = formatTime(currentIntervalMinutes * 60);
      return;
    }
    var remainingMs = currentNextBreakTimestamp - Date.now();
    var remainingSeconds = Math.round(remainingMs / 1000);
    if (remainingSeconds <= 0) {
      timerDisplay.textContent = '00:00';
    } else {
      timerDisplay.textContent = formatTime(remainingSeconds);
    }
  }

  function updateStateDisplay() {
    stateDisplay.textContent = currentIsActive ? 'Running' : 'Paused';
  }

  function updateToggleButton() {
    if (currentIsActive) {
      toggleBtn.textContent = 'Pause ⏸️';
      toggleBtn.classList.add('paused');
    } else {
      toggleBtn.textContent = 'Start ▶️';
      toggleBtn.classList.remove('paused');
    }
  }

  function updateIntervalButtonsUI() {
    intervalButtons.forEach(function (btn) {
      var btnMinutes = parseInt(btn.getAttribute('data-minutes'), 10);
      if (btnMinutes === currentIntervalMinutes) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function startCountdownLoop() {
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    updateTimerDisplay();
    countdownTimerId = setInterval(function () {
      updateTimerDisplay();
    }, 1000);
  }

  function stopCountdownLoop() {
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
  }

  function loadStateFromStorage() {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      timerDisplay.textContent = formatTime(DEFAULT_INTERVAL_MINUTES * 60);
      return;
    }
    chrome.storage.local.get(
      ['intervalMinutes', 'isActive', 'nextBreakTimestamp'],
      function (result) {
        if (chrome.runtime.lastError) {
          timerDisplay.textContent = formatTime(DEFAULT_INTERVAL_MINUTES * 60);
          return;
        }

        currentIntervalMinutes =
          typeof result.intervalMinutes === 'number' && result.intervalMinutes > 0
            ? result.intervalMinutes
            : DEFAULT_INTERVAL_MINUTES;

        currentIsActive = result.isActive === true;

        currentNextBreakTimestamp =
          typeof result.nextBreakTimestamp === 'number' ? result.nextBreakTimestamp : null;

        updateIntervalButtonsUI();
        updateStateDisplay();
        updateToggleButton();

        if (currentIsActive) {
          startCountdownLoop();
        } else {
          stopCountdownLoop();
          updateTimerDisplay();
        }
      }
    );
  }

  function saveIntervalToStorage(minutes) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      return;
    }
    chrome.storage.local.set({ intervalMinutes: minutes }, function () {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  }

  function saveActiveStateToStorage(isActive) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      return;
    }
    chrome.storage.local.set({ isActive: isActive }, function () {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  }

  function sendMessageToBackground(message, callback) {
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      if (typeof callback === 'function') {
        callback(null);
      }
      return;
    }
    try {
      chrome.runtime.sendMessage(message, function (response) {
        if (chrome.runtime.lastError) {
          if (typeof callback === 'function') {
            callback(null);
          }
          return;
        }
        if (typeof callback === 'function') {
          callback(response);
        }
      });
    } catch (err) {
      if (typeof callback === 'function') {
        callback(null);
      }
    }
  }

  function handleIntervalButtonClick(event) {
    var target = event.currentTarget;
    if (!target) {
      return;
    }
    var minutes = parseInt(target.getAttribute('data-minutes'), 10);
    if (isNaN(minutes) || minutes <= 0) {
      return;
    }

    currentIntervalMinutes = minutes;
    updateIntervalButtonsUI();
    saveIntervalToStorage(minutes);

    sendMessageToBackground(
      { type: 'SET_INTERVAL', minutes: minutes },
      function (response) {
        if (response && typeof response.nextBreakTimestamp === 'number') {
          currentNextBreakTimestamp = response.nextBreakTimestamp;
          if (currentIsActive) {
            startCountdownLoop();
          }
        } else {
          updateTimerDisplay();
        }
      }
    );
  }

  function handleToggleClick() {
    var newActiveState = !currentIsActive;
    currentIsActive = newActiveState;
    updateStateDisplay();
    updateToggleButton();
    saveActiveStateToStorage(newActiveState);

    sendMessageToBackground(
      { type: 'TOGGLE_ACTIVE', isActive: newActiveState },
      function (response) {
        if (response && typeof response.nextBreakTimestamp === 'number') {
          currentNextBreakTimestamp = response.nextBreakTimestamp;
        }

        if (currentIsActive) {
          startCountdownLoop();
        } else {
          stopCountdownLoop();
          updateTimerDisplay();
        }
      }
    );
  }

  function handleSummonClick() {
    if (!chrome || !chrome.tabs || !chrome.tabs.query) {
      return;
    }

    summonBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError) {
        summonBtn.disabled = false;
        return;
      }

      if (!tabs || tabs.length === 0 || !tabs[0] || typeof tabs[0].id !== 'number') {
        summonBtn.disabled = false;
        return;
      }

      var activeTabId = tabs[0].id;

      try {
        chrome.tabs.sendMessage(activeTabId, { type: 'SHOW_CAT' }, function () {
          if (chrome.runtime.lastError) {
            if (chrome.scripting && chrome.scripting.executeScript) {
              chrome.scripting.executeScript(
                {
                  target: { tabId: activeTabId },
                  files: ['content.js']
                },
                function () {
                  if (chrome.runtime.lastError) {
                    summonBtn.disabled = false;
                    return;
                  }
                  try {
                    chrome.tabs.sendMessage(
                      activeTabId,
                      { type: 'SHOW_CAT' },
                      function () {
                        if (chrome.runtime.lastError) {
                          summonBtn.disabled = false;
                          return;
                        }
                        summonBtn.disabled = false;
                      }
                    );
                  } catch (err) {
                    summonBtn.disabled = false;
                  }
                }
              );
            } else {
              summonBtn.disabled = false;
            }
            return;
          }
          summonBtn.disabled = false;
        });
      } catch (err) {
        summonBtn.disabled = false;
      }
    });
  }

  intervalButtons.forEach(function (btn) {
    btn.addEventListener('click', handleIntervalButtonClick);
  });

  toggleBtn.addEventListener('click', handleToggleClick);
  summonBtn.addEventListener('click', handleSummonClick);

  loadStateFromStorage();
});