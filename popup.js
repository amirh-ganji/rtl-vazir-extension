const btn = document.getElementById("toggleBtn");
const statusText = document.getElementById("statusText");
const pickBtn = document.getElementById("pickBtn");
const clearBtn = document.getElementById("clearBtn");
const pickStatusText = document.getElementById("pickStatusText");

function updateUI(enabled) {
  if (enabled) {
    btn.textContent = "غیرفعال کردن (بازگشت به چپ‌به‌راست)";
    btn.classList.remove("off");
    btn.classList.add("on");
    statusText.textContent = "وضعیت: فعال (راست‌به‌چپ)";
  } else {
    btn.textContent = "فعال کردن راست‌چین کل صفحه";
    btn.classList.remove("on");
    btn.classList.add("off");
    statusText.textContent = "وضعیت: غیرفعال";
  }
}

function updatePickUI(hasSelections) {
  pickStatusText.textContent = hasSelections
    ? "یک یا چند بخش انتخاب‌شده روی این صفحه وجود دارد"
    : "";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

async function callFunction(tabId, funcName) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (name) => {
      return window[name] ? window[name]() : { error: "not-found" };
    },
    args: [funcName],
  });
  return results && results[0] ? results[0].result : null;
}

let activeTabId = null;

async function refreshState() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id || !/^https?:/.test(tab.url || "")) {
      btn.disabled = true;
      pickBtn.disabled = true;
      clearBtn.disabled = true;
      statusText.textContent = "این افزونه روی این صفحه کار نمی‌کند";
      return;
    }
    activeTabId = tab.id;
    btn.disabled = false;
    pickBtn.disabled = false;
    clearBtn.disabled = false;

    await injectContentScript(tab.id);

    const state = await callFunction(tab.id, "rtlVazirGetState");
    updateUI(state ? state.enabled : false);

    const selState = await callFunction(tab.id, "rtlVazirHasSelections");
    updatePickUI(selState ? selState.has : false);
  } catch (e) {
    statusText.textContent = "خطا در ارتباط با صفحه";
    console.error(e);
  }
}

btn.addEventListener("click", async () => {
  try {
    if (!activeTabId) return;
    await injectContentScript(activeTabId);
    const state = await callFunction(activeTabId, "rtlVazirToggle");
    updateUI(state ? state.enabled : false);
  } catch (e) {
    statusText.textContent = "خطا در اجرای عملیات";
    console.error(e);
  }
});

pickBtn.addEventListener("click", async () => {
  try {
    if (!activeTabId) return;
    await injectContentScript(activeTabId);
    await callFunction(activeTabId, "rtlVazirEnterPickMode");
    // پاپ‌آپ را می‌بندیم تا کاربر بتواند مستقیم روی صفحه کلیک کند
    window.close();
  } catch (e) {
    pickStatusText.textContent = "خطا در فعال‌سازی حالت انتخاب";
    console.error(e);
  }
});

clearBtn.addEventListener("click", async () => {
  try {
    if (!activeTabId) return;
    await injectContentScript(activeTabId);
    await callFunction(activeTabId, "rtlVazirClearSelections");
    updatePickUI(false);
  } catch (e) {
    pickStatusText.textContent = "خطا در پاک‌کردن انتخاب‌ها";
    console.error(e);
  }
});

refreshState();
