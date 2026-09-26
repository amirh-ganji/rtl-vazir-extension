// این فایل با chrome.scripting.executeScript ممکن است چند بار در یک تب
// تزریق شود. به همین دلیل کل محتوا داخل یک IIFE با گارد قرار گرفته تا با
// تزریق دوباره خطای "Identifier has already been declared" رخ ندهد.
(function () {
  if (window.__rtlVazirExtLoaded__) {
    return;
  }
  window.__rtlVazirExtLoaded__ = true;

  // ---------- ثابت‌ها ----------
  const STYLE_ID = "__rtl_vazir_ext_style__"; // استایل حالت «کل صفحه»
  const SELECT_STYLE_ID = "__rtl_vazir_select_style__"; // استایل حالت «انتخاب بخشی»
  const FONT_LINK_ID = "__rtl_vazir_ext_font_link__";
  const SELECTED_CLASS = "__rtl_vazir_selected_el__";
  const HOVER_CLASS = "__rtl_vazir_hover_highlight__";
  const PICK_BADGE_ID = "__rtl_vazir_pick_badge__";
  const PICK_DONE_BTN_ID = "__rtl_vazir_pick_done__";

  const FONT_CSS_URL =
    "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css";

  const CODE_SELECTORS = [
    "pre",
    "code",
    "kbd",
    "samp",
    "var",
    ".CodeMirror",
    ".cm-editor",
    ".cm-content",
    ".monaco-editor",
    ".monaco-editor-background",
    '[class*="highlight"]',
    '[class*="hljs"]',
    '[class*="language-"]',
    '[class*="prism"]',
  ];

  const TEXT_SELECTORS = [
    "p",
    "li",
    "dd",
    "dt",
    "td",
    "th",
    "caption",
    "figcaption",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "a",
    "label",
    "small",
    "strong",
    "em",
    "b",
    "button",
    "input",
    "textarea",
    "select",
    "option",
    "legend",
    "summary",
    "time",
    "cite",
    "q",
    "mark",
  ];

  const ICON_RULE_GROUPS = [
    {
      selectors: [
        ".fa",
        ".fas",
        ".far",
        ".fal",
        ".fab",
        ".fad",
        ".fa-solid",
        ".fa-regular",
        ".fa-brands",
        '[class^="fa-"]',
        '[class*=" fa-"]',
      ],
      fontFamily: '"Font Awesome 6 Free", "Font Awesome 6 Brands", "FontAwesome"',
    },
    {
      selectors: [
        ".material-icons",
        ".material-icons-outlined",
        ".material-icons-round",
        ".material-icons-sharp",
        ".material-icons-two-tone",
      ],
      fontFamily: '"Material Icons"',
    },
    {
      selectors: [
        ".material-symbols-outlined",
        ".material-symbols-rounded",
        ".material-symbols-sharp",
      ],
      fontFamily: '"Material Symbols Outlined"',
    },
    { selectors: [".glyphicon"], fontFamily: '"Glyphicons Halflings"' },
    {
      selectors: [".bi", '[class^="bi-"]', '[class*=" bi-"]'],
      fontFamily: '"bootstrap-icons"',
    },
  ];

  const ICON_DIRECTION_ONLY_SELECTORS = [
    '[class^="icon-"]',
    '[class*=" icon-"]',
    '[class*="ion-"]',
    ".mdi",
    ".mdi::before",
    "svg",
    "img",
    "video",
    "canvas",
    "i[class]",
  ];

  function ensureFontLoaded() {
    if (!document.getElementById(FONT_LINK_ID)) {
      const fontLink = document.createElement("link");
      fontLink.id = FONT_LINK_ID;
      fontLink.rel = "stylesheet";
      fontLink.href = FONT_CSS_URL;
      document.head.appendChild(fontLink);
    }
  }

  function buildCodeCss(prefix) {
    const withSelf = CODE_SELECTORS.map((s) => `${prefix}${s}`).join(", ");
    const withDescendants = CODE_SELECTORS.map((s) => `${prefix}${s} *`).join(
      ", "
    );
    return `
      ${withSelf}, ${withDescendants} {
        direction: ltr !important;
        unicode-bidi: embed !important;
        text-align: left !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
          "Courier New", monospace !important;
      }
    `;
  }

  function buildIconCss(prefix) {
    let css = "";
    ICON_RULE_GROUPS.forEach((group) => {
      const sels = group.selectors.map((s) => `${prefix}${s}`).join(", ");
      css += `
        ${sels} {
          font-family: ${group.fontFamily} !important;
          direction: ltr !important;
        }
      `;
    });
    const dirOnly = ICON_DIRECTION_ONLY_SELECTORS.map(
      (s) => `${prefix}${s}`
    ).join(", ");
    css += `
      ${dirOnly} {
        direction: ltr !important;
      }
    `;
    return css;
  }

  function buildTextCss(prefix) {
    const sels = TEXT_SELECTORS.map((s) => `${prefix}${s}`).join(", ");
    return `
      ${sels} {
        direction: rtl !important;
        text-align: right;
      }
    `;
  }

  // ---------- حالت «کل صفحه» ----------
  function rtlVazirToggle() {
    const existingStyle = document.getElementById(STYLE_ID);

    if (existingStyle) {
      existingStyle.remove();
      return { enabled: false };
    }

    ensureFontLoaded();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      *, *::before, *::after {
        font-family: 'Vazirmatn', Tahoma, 'Segoe UI', sans-serif !important;
      }
      ${buildTextCss("")}
      ${buildIconCss("")}
      ${buildCodeCss("")}
    `;
    document.head.appendChild(style);

    return { enabled: true };
  }

  function rtlVazirGetState() {
    return { enabled: !!document.getElementById(STYLE_ID) };
  }

  // ---------- حالت «انتخاب بخشی از صفحه» ----------
  let pickModeActive = false;
  let currentHoverEl = null;

  function ensureSelectStyleInjected() {
    if (document.getElementById(SELECT_STYLE_ID)) return;
    const prefix = `.${SELECTED_CLASS} `;
    const style = document.createElement("style");
    style.id = SELECT_STYLE_ID;
    style.textContent = `
      .${HOVER_CLASS} {
        outline: 2px dashed #146EA0 !important;
        outline-offset: 2px !important;
        cursor: crosshair !important;
      }
      .${SELECTED_CLASS},
      .${SELECTED_CLASS} *,
      .${SELECTED_CLASS} *::before,
      .${SELECTED_CLASS} *::after {
        font-family: 'Vazirmatn', Tahoma, 'Segoe UI', sans-serif !important;
      }
      .${SELECTED_CLASS} {
        direction: rtl !important;
        text-align: right !important;
      }
      ${buildTextCss(prefix)}
      ${buildIconCss(prefix)}
      ${buildCodeCss(prefix)}
    `;
    document.head.appendChild(style);
  }

  function isInsideBadge(el) {
    return !!(el && el.closest && el.closest(`#${PICK_BADGE_ID}`));
  }

  function handleMouseOver(e) {
    const el = e.target;
    if (isInsideBadge(el)) return;
    if (el === currentHoverEl) return;
    if (currentHoverEl) currentHoverEl.classList.remove(HOVER_CLASS);
    currentHoverEl = el;
    el.classList.add(HOVER_CLASS);
  }

  function handleMouseOut(e) {
    const el = e.target;
    if (isInsideBadge(el)) return;
    el.classList.remove(HOVER_CLASS);
    if (currentHoverEl === el) currentHoverEl = null;
  }

  function handleClick(e) {
    const el = e.target;
    if (isInsideBadge(el)) return; // اجازه بده دکمه‌ی «پایان» کار خودش را بکند
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove(HOVER_CLASS);
    el.classList.toggle(SELECTED_CLASS);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      rtlVazirExitPickMode();
    }
  }

  function showPickBadge() {
    if (document.getElementById(PICK_BADGE_ID)) return;
    const badge = document.createElement("div");
    badge.id = PICK_BADGE_ID;
    badge.style.cssText = `
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      background: #146EA0; color: #fff; padding: 8px 14px; border-radius: 20px;
      font-family: Tahoma, sans-serif; font-size: 13px; z-index: 2147483647;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25); direction: rtl; display: flex;
      align-items: center; gap: 10px; cursor: default;
    `;
    const label = document.createElement("span");
    label.textContent = "روی بخش موردنظر کلیک کنید (Esc برای لغو)";
    const doneBtn = document.createElement("button");
    doneBtn.id = PICK_DONE_BTN_ID;
    doneBtn.textContent = "پایان";
    doneBtn.style.cssText = `
      background:#fff; color:#146EA0; border:none; border-radius:12px;
      padding:4px 10px; font-size:12px; cursor:pointer; font-family:inherit;
    `;
    doneBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      rtlVazirExitPickMode();
    });
    badge.appendChild(label);
    badge.appendChild(doneBtn);
    document.body.appendChild(badge);
  }

  function hidePickBadge() {
    const badge = document.getElementById(PICK_BADGE_ID);
    if (badge) badge.remove();
  }

  function rtlVazirEnterPickMode() {
    if (pickModeActive) return { active: true };
    pickModeActive = true;
    ensureFontLoaded();
    ensureSelectStyleInjected();
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    showPickBadge();
    return { active: true };
  }

  function rtlVazirExitPickMode() {
    if (!pickModeActive) return { active: false };
    pickModeActive = false;
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    if (currentHoverEl) {
      currentHoverEl.classList.remove(HOVER_CLASS);
      currentHoverEl = null;
    }
    hidePickBadge();
    return { active: false };
  }

  function rtlVazirIsPicking() {
    return { active: pickModeActive };
  }

  function rtlVazirClearSelections() {
    document
      .querySelectorAll(`.${SELECTED_CLASS}`)
      .forEach((el) => el.classList.remove(SELECTED_CLASS));
    return { cleared: true };
  }

  function rtlVazirHasSelections() {
    return { has: document.querySelectorAll(`.${SELECTED_CLASS}`).length > 0 };
  }

  window.rtlVazirToggle = rtlVazirToggle;
  window.rtlVazirGetState = rtlVazirGetState;
  window.rtlVazirEnterPickMode = rtlVazirEnterPickMode;
  window.rtlVazirExitPickMode = rtlVazirExitPickMode;
  window.rtlVazirIsPicking = rtlVazirIsPicking;
  window.rtlVazirClearSelections = rtlVazirClearSelections;
  window.rtlVazirHasSelections = rtlVazirHasSelections;
})();
