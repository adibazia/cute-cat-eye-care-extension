var ALARM_NAME = 'catBreakAlarm';
var DEFAULT_INTERVAL_MINUTES = 30;

function computeNextBreakTimestamp(intervalMinutes) {
  return Date.now() + intervalMinutes * 60 * 1000;
}

function createAlarm(intervalMinutes) {
  chrome.alarms.clear(ALARM_NAME, function () {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes
    });
  });
}

function clearAlarm() {
  chrome.alarms.clear(ALARM_NAME);
}

function getStoredSettings(callback) {
  chrome.storage.local.get(
    ['intervalMinutes', 'isActive', 'nextBreakTimestamp'],
    function (result) {
      if (chrome.runtime.lastError) {
        callback({
          intervalMinutes: DEFAULT_INTERVAL_MINUTES,
          isActive: false,
          nextBreakTimestamp: null
        });
        return;
      }
      callback({
        intervalMinutes:
          typeof result.intervalMinutes === 'number' && result.intervalMinutes > 0
            ? result.intervalMinutes
            : DEFAULT_INTERVAL_MINUTES,
        isActive: result.isActive === true,
        nextBreakTimestamp:
          typeof result.nextBreakTimestamp === 'number' ? result.nextBreakTimestamp : null
      });
    }
  );
}

function sendCatMessageToActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (chrome.runtime.lastError) {
      return;
    }
    if (!tabs || tabs.length === 0 || !tabs[0] || typeof tabs[0].id !== 'number') {
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
                  return;
                }
                try {
                  chrome.tabs.sendMessage(activeTabId, { type: 'SHOW_CAT' }, function () {
                    if (chrome.runtime.lastError) {
                      return;
                    }
                  });
                } catch (err) {
                  return;
                }
              }
            );
          }
        }
      });
    } catch (err) {
      return;
    }
  });
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set(
    {
      intervalMinutes: DEFAULT_INTERVAL_MINUTES,
      isActive: true,
      nextBreakTimestamp: computeNextBreakTimestamp(DEFAULT_INTERVAL_MINUTES)
    },
    function () {
      if (chrome.runtime.lastError) {
        return;
      }
      createAlarm(DEFAULT_INTERVAL_MINUTES);
    }
  );
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (!alarm || alarm.name !== ALARM_NAME) {
    return;
  }

  getStoredSettings(function (settings) {
    if (!settings.isActive) {
      return;
    }

    sendCatMessageToActiveTab();

    var nextTimestamp = computeNextBreakTimestamp(settings.intervalMinutes);
    chrome.storage.local.set({ nextBreakTimestamp: nextTimestamp }, function () {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || typeof message.type !== 'string') {
    sendResponse(null);
    return false;
  }

  if (message.type === 'SET_INTERVAL') {
    var newMinutes =
      typeof message.minutes === 'number' && message.minutes > 0
        ? message.minutes
        : DEFAULT_INTERVAL_MINUTES;

    getStoredSettings(function (settings) {
      var nextTimestamp = computeNextBreakTimestamp(newMinutes);

      chrome.storage.local.set(
        {
          intervalMinutes: newMinutes,
          nextBreakTimestamp: nextTimestamp
        },
        function () {
          if (chrome.runtime.lastError) {
            sendResponse(null);
            return;
          }

          if (settings.isActive) {
            createAlarm(newMinutes);
          }

          sendResponse({ nextBreakTimestamp: nextTimestamp });
        }
      );
    });

    return true;
  }

  if (message.type === 'TOGGLE_ACTIVE') {
    var newIsActive = message.isActive === true;

    getStoredSettings(function (settings) {
      var intervalMinutes = settings.intervalMinutes;

      if (newIsActive) {
        var nextTimestamp = computeNextBreakTimestamp(intervalMinutes);

        chrome.storage.local.set(
          {
            isActive: true,
            nextBreakTimestamp: nextTimestamp
          },
          function () {
            if (chrome.runtime.lastError) {
              sendResponse(null);
              return;
            }
            createAlarm(intervalMinutes);
            sendResponse({ nextBreakTimestamp: nextTimestamp });
          }
        );
      } else {
        chrome.storage.local.set(
          {
            isActive: false
          },
          function () {
            if (chrome.runtime.lastError) {
              sendResponse(null);
              return;
            }
            clearAlarm();
            sendResponse({ nextBreakTimestamp: null });
          }
        );
      }
    });

    return true;
  }

  sendResponse(null);
  return false;
});