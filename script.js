const selectors = {
  score: document.getElementById("score"),
  bestScore: document.getElementById("best-score"),
  energy: document.getElementById("energy"),
  time: document.getElementById("time"),
  stage: document.getElementById("stage"),
  start: document.getElementById("start-btn"),
  pause: document.getElementById("pause-btn"),
  boost: document.getElementById("boost-btn"),
  handbook: document.getElementById("handbook-btn"),
  handbookDialog: document.getElementById("handbook-dialog"),
  onboardingDialog: document.getElementById("onboarding-dialog"),
  onboardingForm: document.getElementById("onboarding-form"),
  playerName: document.getElementById("player-name"),
  haptics: document.getElementById("haptics"),
  gameArea: document.getElementById("game-area"),
  changelog: document.getElementById("changelog"),
  share: document.getElementById("share-btn"),
  install: document.getElementById("install-btn"),
  campaignBanner: document.getElementById("campaign-banner"),
  campaignTitle: document.getElementById("campaign-title"),
  campaignCountdown: document.getElementById("campaign-countdown"),
  reviewTimeline: document.getElementById("review-timeline"),
  reviewDetail: document.getElementById("review-detail"),
  qaChecklist: document.getElementById("qa-checklist"),
  qaProgress: document.getElementById("qa-progress"),
  qaProgressLabel: document.getElementById("qa-progress-label"),
  qaReset: document.getElementById("qa-reset"),
  qaSimulate: document.getElementById("qa-simulate"),
  qaExport: document.getElementById("qa-export"),
  themeSelect: document.getElementById("theme-select"),
  localeSelect: document.getElementById("locale-select"),
  analyticsKPIs: document.getElementById("analytics-kpis"),
  analyticsFunnel: document.getElementById("analytics-funnel"),
  analyticsExport: document.getElementById("analytics-export"),
  analyticsUpdated: document.getElementById("analytics-updated"),
  experimentList: document.getElementById("experiment-list"),
  ltvTableBody: document.getElementById("ltv-table-body"),
  validationList: document.getElementById("validation-list"),
  validationSummary: document.getElementById("validation-summary"),
  validationRefresh: document.getElementById("validation-refresh"),
};

const supportsDialog = typeof HTMLDialogElement !== "undefined";
const supportsVibration = "vibrate" in navigator;
const reduceMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

const STORAGE_KEY = "nebula-expedition-profile";
const QA_STORAGE_KEY = "nebula-expedition-qa";
const PREFERENCES_KEY = "nebula-expedition-preferences";
const I18N_FALLBACK = "zh-CN";
const defaultProfile = {
  name: "指挥官",
  bestScore: 0,
  sessions: 0,
  haptics: "auto",
  lastSessionAt: null,
};
const defaultPreferences = {
  theme: "nebula-dark",
  locale: "zh-CN",
};

const THEME_META_COLORS = {
  "nebula-dark": "#091426",
  "aurora-light": "#eff6ff",
  "solstice-festival": "#3b0764",
};

const QA_SCENARIOS = [
  {
    id: "first-load",
    title: "首屏加载",
    role: "玩家",
    description: "确认在 3G 网络下 5 秒内完成首次加载并可互动。",
  },
  {
    id: "onboarding",
    title: "档案设置",
    role: "产品经理",
    description: "创建昵称、震动配置后可正常保存并记录历史最佳成绩。",
  },
  {
    id: "boost-cycle",
    title: "能量加速循环",
    role: "老板",
    description: "体验加速器 3 次，观察收益提示与能量恢复是否符合数值预期。",
  },
  {
    id: "campaign",
    title: "活动切换",
    role: "运营团队",
    description: "修改 config/campaigns.json 后刷新，倒计时与文案实时更新。",
  },
  {
    id: "pause-resume",
    title: "暂停恢复",
    role: "技术专家",
    description: "切后台触发自动暂停，回到前台后可继续无异常。",
  },
  {
    id: "pwa-install",
    title: "添加到主屏",
    role: "H5 设计师",
    description: "在支持的浏览器调用安装提示，并确认图标、启动画面正常。",
  },
];

const REVIEW_STATUS = {
  approved: { label: "通过", className: "status-badge status-badge--approved" },
  pending: { label: "待确认", className: "status-badge status-badge--pending" },
  in_progress: { label: "进行中", className: "status-badge status-badge--pending" },
  changes_requested: {
    label: "需改进",
    className: "status-badge status-badge--changes",
  },
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultProfile };
    const parsed = JSON.parse(raw);
    return { ...defaultProfile, ...parsed };
  } catch (error) {
    console.warn("profile load failed", error);
    return { ...defaultProfile };
  }
}

function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profile));
  } catch (error) {
    console.warn("profile save failed", error);
  }
}

function loadQAState() {
  try {
    const raw = localStorage.getItem(QA_STORAGE_KEY);
    if (!raw) {
      return {
        completed: new Set(),
        lastSmokeAt: null,
      };
    }
    const parsed = JSON.parse(raw);
    const completed = new Set(Array.isArray(parsed.completed) ? parsed.completed : []);
    const lastSmokeAt = parsed.lastSmokeAt || null;
    return { completed, lastSmokeAt };
  } catch (error) {
    console.warn("qa state load failed", error);
    return { completed: new Set(), lastSmokeAt: null };
  }
}

function saveQAState() {
  try {
    const payload = {
      completed: Array.from(state.qa.completed.values()),
      lastSmokeAt: state.qa.lastSmokeAt,
    };
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("qa state save failed", error);
  }
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return { ...defaultPreferences };
    const parsed = JSON.parse(raw);
    return { ...defaultPreferences, ...parsed };
  } catch (error) {
    console.warn("preferences load failed", error);
    return { ...defaultPreferences };
  }
}

function savePreferences() {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(state.preferences));
  } catch (error) {
    console.warn("preferences save failed", error);
  }
}

const spawnConfig = {
  baseInterval: 1200,
  resourceChance: 0.72,
  hazardChance: 0.28,
  fallDuration: [4500, 6500],
  maxEntities: 14,
};

const state = {
  score: 0,
  energy: 100,
  timeLeft: 60,
  stage: 1,
  running: false,
  paused: false,
  spawnTimer: null,
  countdownTimer: null,
  campaignTimer: null,
  entities: new Map(),
  boostCooldown: false,
  deferredPrompt: null,
  profile: loadProfile(),
  reduceMotion: reduceMotionQuery?.matches ?? false,
  campaignContext: null,
  reviewIterations: [],
  reviewSelection: null,
  qa: loadQAState(),
  preferences: loadPreferences(),
  localeCatalog: {},
  analyticsDataset: null,
  experiments: [],
  ltvSegments: [],
  validationResults: [],
};

let audioCtx;

const analytics = {
  history: [],
  track(event, payload = {}) {
    const entry = {
      event,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.history.push(entry);
    console.info("[analytics]", event, payload);
  },
};

function formatTemplate(template, context = {}) {
  if (typeof template !== "string") return template;
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, token) => {
    return token in context ? context[token] : match;
  });
}

function t(key, fallback = "") {
  const locale = state.preferences.locale || I18N_FALLBACK;
  const catalog = state.localeCatalog?.[locale] || {};
  const fallbackCatalog = state.localeCatalog?.[I18N_FALLBACK] || {};
  return catalog[key] ?? fallbackCatalog[key] ?? fallback ?? key;
}

function applyTheme(theme, { track = true } = {}) {
  state.preferences.theme = theme;
  document.documentElement.dataset.theme = theme;
  const themeColor = THEME_META_COLORS[theme] || THEME_META_COLORS[defaultPreferences.theme];
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", themeColor);
  }
  if (selectors.themeSelect) {
    selectors.themeSelect.value = theme;
  }
  savePreferences();
  if (track) {
    analytics.track("preference_theme", { theme });
  }
}

function applyLocale(locale, { track = true } = {}) {
  state.preferences.locale = locale;
  if (selectors.localeSelect) {
    selectors.localeSelect.value = locale;
  }
  savePreferences();
  applyTranslations();
  renderAnalyticsBoard();
  if (state.validationResults.length) {
    renderValidationResults(state.validationResults);
  }
  if (track) {
    analytics.track("preference_locale", { locale });
  }
}

function applyTranslations() {
  const context = { player: state.profile.name };
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) return;
    const translation = formatTemplate(t(key, element.textContent?.trim()), context);
    if (translation) {
      element.textContent = translation;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    const key = element.dataset.i18nPlaceholder;
    if (!key) return;
    const translation = formatTemplate(t(key, element.getAttribute("placeholder") || ""), context);
    if (translation && "placeholder" in element) {
      element.setAttribute("placeholder", translation);
    }
  });

  if (selectors.pause) {
    selectors.pause.textContent = state.paused ? t("actions.resume", "继续") : t("actions.pause", "暂停");
  }
  if (selectors.start) {
    selectors.start.textContent = t("actions.start", selectors.start.textContent);
  }
  if (selectors.boost) {
    selectors.boost.textContent = t("actions.boost", selectors.boost.textContent);
  }
  if (selectors.handbook) {
    selectors.handbook.textContent = t("actions.handbook", selectors.handbook.textContent);
  }
  const titleTemplate = t("meta.title", `星云探险队｜${state.profile.name}的指挥平台`);
  document.title = formatTemplate(titleTemplate, context);
}

function resolveLocaleString(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const locale = state.preferences.locale || I18N_FALLBACK;
    return value[locale] ?? value[I18N_FALLBACK] ?? Object.values(value)[0] ?? "";
  }
  if (value === null || value === undefined) return "";
  return String(value);
}

function resolveCampaignField(campaign, field) {
  const base = campaign[field];
  const locales = campaign.locales;
  if (locales && typeof locales === "object") {
    const map = { [I18N_FALLBACK]: base };
    Object.entries(locales).forEach(([locale, values]) => {
      if (values && typeof values === "object" && values[field]) {
        map[locale] = values[field];
      }
    });
    return resolveLocaleString(map);
  }
  return base;
}

function formatNumber(value, options = {}) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) return "0";
  const formatter = new Intl.NumberFormat(state.preferences.locale || I18N_FALLBACK, options);
  return formatter.format(numeric);
}

function formatPercent(value, precision = 1) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) return "0%";
  return `${(numeric * 100).toFixed(precision)}%`;
}

function formatDelta(delta, type) {
  if (delta === null || delta === undefined) return null;
  const numeric = Number(delta);
  if (Number.isNaN(numeric)) return null;
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "±";
  const absolute = Math.abs(numeric);
  if (type === "percentage") {
    return `${sign}${(absolute * 100).toFixed(1)}%`;
  }
  return `${sign}${formatNumber(absolute, { maximumFractionDigits: 2 })}`;
}

if (reduceMotionQuery) {
  reduceMotionQuery.addEventListener("change", (event) => {
    state.reduceMotion = event.matches;
  });
}

function updateProfileUI() {
  if (selectors.bestScore) {
    selectors.bestScore.textContent = state.profile.bestScore.toString();
  }
  if (selectors.playerName && document.activeElement !== selectors.playerName) {
    selectors.playerName.value = state.profile.name;
  }
  if (selectors.haptics) {
    selectors.haptics.value = state.profile.haptics;
  }
  applyTranslations();
}

function applyProfileUpdate(partial) {
  state.profile = { ...state.profile, ...partial };
  saveProfile();
  updateProfileUI();
}

function shouldVibrate() {
  if (!supportsVibration) return false;
  if (state.profile.haptics === "off") return false;
  if (state.profile.haptics === "on") return true;
  return window.matchMedia?.("(any-pointer: coarse)").matches ?? false;
}

function vibrate(pattern) {
  if (shouldVibrate()) {
    navigator.vibrate(pattern);
  }
}

function ensureOnboarding() {
  if (state.profile.sessions > 0) return;
  if (supportsDialog && selectors.onboardingDialog?.showModal) {
    selectors.playerName.value = state.profile.name ?? "";
    selectors.haptics.value = state.profile.haptics;
    window.setTimeout(() => selectors.onboardingDialog.showModal(), 200);
  } else if (!state.profile.name) {
    const fallbackName = window.prompt("欢迎来到星云探险队，请输入您的昵称", "");
    const trimmed = fallbackName?.trim();
    applyProfileUpdate({ name: trimmed || defaultProfile.name });
  }
}

function collectOnboardingForm() {
  const name = selectors.playerName?.value.trim() || defaultProfile.name;
  const haptics = selectors.haptics?.value || "auto";
  applyProfileUpdate({ name, haptics });
  analytics.track("profile_update", { name, haptics });
}

async function loadI18nCatalog() {
  try {
    const response = await fetch("config/i18n.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.localeCatalog = data?.locales || {};
  } catch (error) {
    console.warn("i18n load failed", error);
    state.localeCatalog = { [I18N_FALLBACK]: {} };
  }
}

function openDialog(dialog) {
  if (!dialog) return;
  if (supportsDialog && dialog.showModal) {
    dialog.showModal();
  } else {
    alert(dialog.textContent?.trim() ?? "");
  }
}

function closeDialog(dialog) {
  if (supportsDialog && dialog?.close) {
    dialog.close();
  }
}

function formatSeconds(seconds) {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function adjustScore(value) {
  state.score = Math.max(0, state.score + value);
  selectors.score.textContent = state.score.toString();
}

function adjustEnergy(value) {
  state.energy = Math.min(150, Math.max(0, state.energy + value));
  selectors.energy.textContent = state.energy.toString();
  if (state.energy <= 0) {
    endGame(t("messages.energyEmpty", "能量耗尽，探险终止。"));
  }
}

function setStage(stage) {
  state.stage = stage;
  selectors.stage.textContent = stage.toString();
  analytics.track("stage_change", { stage, player: state.profile.name });
}

function playCollectSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (error) {
    console.warn("audio error", error);
  }
}

const utils = {
  random(min, max) {
    return Math.random() * (max - min) + min;
  },
  entityId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  },
};

function removeEntity(id, element) {
  state.entities.delete(id);
  element?.remove();
}

function createEntity(type) {
  if (!selectors.gameArea || state.entities.size >= spawnConfig.maxEntities) return;
  const el = document.createElement("button");
  el.className = `entity entity--${type}`;
  el.type = "button";
  el.setAttribute("aria-label", type === "resource" ? "收集星能" : "躲避危险");
  el.style.left = `${utils.random(10, 90)}%`;
  el.style.top = "-12%";
  const value = type === "resource" ? Math.floor(utils.random(4, 12)) : -15;
  el.textContent = type === "resource" ? `+${value}` : "!";
  const duration = utils.random(...spawnConfig.fallDuration);
  const id = utils.entityId();
  el.dataset.id = id;

  const cleanup = () => {
    removeEntity(id, el);
    if (type === "resource") {
      adjustEnergy(-8);
    }
  };

  if (state.reduceMotion) {
    el.style.transform = "translate(-50%, -60%)";
    el.style.transition = `transform ${duration}ms linear`;
    requestAnimationFrame(() => {
      el.style.transform = "translate(-50%, 520px)";
    });
    el.addEventListener(
      "transitionend",
      () => {
        if (!state.entities.has(id)) return;
        cleanup();
      },
      { once: true }
    );
  } else {
    const animation = el.animate(
      [
        { transform: "translate(-50%, -60%)", offset: 0 },
        { transform: "translate(-50%, 520px)", offset: 1 },
      ],
      {
        duration,
        easing: "linear",
      }
    );
    animation.onfinish = () => {
      if (!state.entities.has(id)) return;
      cleanup();
    };
  }

  el.addEventListener("pointerdown", () => handleEntityTap(el));

  state.entities.set(id, {
    type,
    value,
  });
  selectors.gameArea.appendChild(el);
}

function spawnLoop() {
  if (!state.running || state.paused) return;
  const spawnType = Math.random() < spawnConfig.resourceChance ? "resource" : "hazard";
  createEntity(spawnType);
  const nextInterval = Math.max(320, spawnConfig.baseInterval - state.stage * 80);
  state.spawnTimer = window.setTimeout(() => {
    spawnLoop();
  }, utils.random(nextInterval * 0.75, nextInterval * 1.25));
}

function handleEntityTap(el) {
  if (!state.running || state.paused) return;
  const entity = state.entities.get(el.dataset.id);
  if (!entity) return;

  if (entity.type === "resource") {
    adjustScore(entity.value);
    adjustEnergy(4);
    vibrate(20);
    playCollectSound();
  } else {
    adjustEnergy(entity.value);
    flashDanger();
  }

  removeEntity(el.dataset.id, el);
}

function flashDanger() {
  selectors.gameArea.classList.add("shake");
  vibrate([16, 80, 24]);
  window.setTimeout(() => selectors.gameArea.classList.remove("shake"), 300);
}

function updateTimeLabel() {
  selectors.time.textContent = `${formatSeconds(state.timeLeft)}`;
}

function countdown() {
  updateTimeLabel();
  state.countdownTimer = window.setInterval(() => {
    if (!state.running || state.paused) return;
    state.timeLeft -= 1;
    updateTimeLabel();

    if (state.timeLeft % 15 === 0 && state.timeLeft > 0) {
      setStage(state.stage + 1);
      spawnConfig.resourceChance = Math.max(0.55, spawnConfig.resourceChance - 0.02);
      spawnConfig.hazardChance = 1 - spawnConfig.resourceChance;
    }

    if (state.timeLeft <= 0) {
      endGame(t("messages.stageComplete", "恭喜完成阶段探险！"));
    }
  }, 1000);
}

function resetGameState() {
  clearTimeout(state.spawnTimer);
  clearInterval(state.countdownTimer);
  state.spawnTimer = null;
  state.countdownTimer = null;
  state.entities.forEach((_, id) => {
    removeEntity(id, selectors.gameArea.querySelector(`[data-id="${id}"]`));
  });
  state.entities.clear();
  selectors.gameArea.innerHTML = "";
}

function startGame() {
  if (state.running) return;
  analytics.track("session_start", {
    player: state.profile.name,
    session: state.profile.sessions + 1,
  });
  resetGameState();
  state.running = true;
  state.paused = false;
  state.score = 0;
  state.energy = 100;
  state.timeLeft = 60;
  state.stage = 1;
  spawnConfig.resourceChance = 0.72;
  spawnConfig.hazardChance = 0.28;
  selectors.score.textContent = "0";
  selectors.energy.textContent = "100";
  updateTimeLabel();
  selectors.stage.textContent = "1";
  selectors.start.disabled = true;
  selectors.pause.disabled = false;
  selectors.boost.disabled = false;
  state.profile.sessions += 1;
  state.profile.lastSessionAt = new Date().toISOString();
  saveProfile();
  updateProfileUI();
  spawnLoop();
  countdown();
}

function pauseGame() {
  if (!state.running) return;
  state.paused = !state.paused;
  selectors.pause.textContent = state.paused ? t("actions.resume", "继续") : t("actions.pause", "暂停");
  selectors.gameArea.classList.toggle("paused", state.paused);
  analytics.track(state.paused ? "session_pause" : "session_resume", {
    player: state.profile.name,
  });
}

function updateChangelog(message, badge) {
  if (!selectors.changelog) return;
  const li = document.createElement("li");
  const time = document.createElement("time");
  const span = document.createElement("span");
  const version = `v1.${String(Date.now()).slice(-3)}`;
  time.textContent = version;
  span.textContent = message;
  if (badge) {
    const mark = document.createElement("small");
    mark.textContent = badge;
    mark.className = "changelog-badge";
    span.appendChild(document.createTextNode(" "));
    span.appendChild(mark);
  }
  li.append(time, span);
  selectors.changelog.prepend(li);
}

function endGame(message) {
  analytics.track("session_end", {
    score: state.score,
    stage: state.stage,
    player: state.profile.name,
  });
  state.running = false;
  state.paused = false;
  clearTimeout(state.spawnTimer);
  clearInterval(state.countdownTimer);
  selectors.pause.disabled = true;
  selectors.boost.disabled = true;
  selectors.start.disabled = false;
  selectors.pause.textContent = t("actions.pause", "暂停");
  selectors.gameArea.classList.remove("paused");
  let badge;
  if (state.score > state.profile.bestScore) {
    badge = t("messages.newRecordBadge", "刷新最佳");
    applyProfileUpdate({ bestScore: state.score });
  }
  const context = { player: state.profile.name, score: state.score, message };
  const changelogTemplate = t("messages.sessionSummary", "{{player}}：{{message}} 最终得分 {{score}}");
  updateChangelog(formatTemplate(changelogTemplate, context), badge);
  const alertTemplate = t("messages.sessionAlert", "{{message}} 最终得分：{{score}}");
  alert(formatTemplate(alertTemplate, context));
}

function boostEnergy() {
  if (!state.running || state.boostCooldown) return;
  adjustEnergy(25);
  vibrate([12, 40, 12]);
  analytics.track("boost_used", {
    at: 60 - state.timeLeft,
    stage: state.stage,
    player: state.profile.name,
  });
  selectors.boost.disabled = true;
  state.boostCooldown = true;
  window.setTimeout(() => {
    state.boostCooldown = false;
    if (state.running) {
      selectors.boost.disabled = false;
    }
  }, 12000);
}

selectors.start.addEventListener("click", startGame);
selectors.pause.addEventListener("click", pauseGame);
selectors.boost.addEventListener("click", boostEnergy);

selectors.share.addEventListener("click", async (event) => {
  event.preventDefault();
  const shareData = {
    title: "星云探险队",
    text: `${state.profile.name} 邀请你加入星云探险队，夺取宇宙能源！`,
    url: window.location.href,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      analytics.track("share_native", { player: state.profile.name });
    } else {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      } else {
        const input = document.createElement("textarea");
        input.value = `${shareData.text} ${shareData.url}`;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      analytics.track("share_copy", { player: state.profile.name });
      alert("已复制邀请链接，快去分享给好友吧！");
    }
  } catch (error) {
    console.warn("share failed", error);
  }
});

if (selectors.handbook) {
  selectors.handbook.addEventListener("click", () => openDialog(selectors.handbookDialog));
}

if (supportsDialog && selectors.onboardingDialog) {
  selectors.onboardingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    collectOnboardingForm();
    closeDialog(selectors.onboardingDialog);
  });
  selectors.onboardingDialog.addEventListener("close", () => {
    if (!state.profile.name) {
      applyProfileUpdate({ name: defaultProfile.name });
    }
  });
} else {
  selectors.onboardingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    collectOnboardingForm();
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.deferredPrompt = event;
  selectors.install.hidden = false;
});

selectors.install.addEventListener("click", async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  const { outcome } = await state.deferredPrompt.userChoice;
  analytics.track("install_prompt", { outcome, player: state.profile.name });
  state.deferredPrompt = null;
  selectors.install.hidden = true;
});

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => console.info("Service worker registered"))
      .catch((error) => console.warn("Service worker failed", error));
  }
}

function initDebugging() {
  window.__nebula = {
    debug() {
      return {
        state,
        entities: Array.from(state.entities.values()),
        profile: state.profile,
        campaigns: fetch("config/campaigns.json").then((r) => r.json()),
        reviews: fetch("config/reviews.json").then((r) => r.json()),
        qa: {
          completed: Array.from(state.qa.completed.values()),
          lastSmokeAt: state.qa.lastSmokeAt,
          scenarios: QA_SCENARIOS,
        },
        analytics: {
          history: analytics.history.slice(-50),
          dataset: state.analyticsDataset,
        },
        preferences: state.preferences,
        validations: state.validationResults,
        localeCatalog: state.localeCatalog,
      };
    },
  };
}

function formatDateLabel(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(state.preferences.locale || I18N_FALLBACK, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTimeLabel(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(state.preferences.locale || I18N_FALLBACK, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createStatusBadge(statusKey) {
  const status = REVIEW_STATUS[statusKey] || REVIEW_STATUS.pending;
  const badge = document.createElement("span");
  badge.className = status.className;
  badge.textContent = status.label;
  return badge;
}

function renderReviewTimeline() {
  if (!selectors.reviewTimeline) return;
  selectors.reviewTimeline.innerHTML = "";
  if (!state.reviewIterations.length) {
    const empty = document.createElement("p");
    empty.textContent = "暂无评审记录";
    selectors.reviewTimeline.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  state.reviewIterations.forEach((iteration, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "review-tile";
    button.setAttribute("data-review-index", String(index));
    button.setAttribute("role", "listitem");
    if (index === state.reviewSelection) {
      button.classList.add("review-tile--active");
      button.setAttribute("aria-current", "true");
    }
    const version = document.createElement("strong");
    version.className = "review-tile__version";
    version.textContent = iteration.version || `v${index + 1}`;
    const label = document.createElement("span");
    label.className = "review-tile__label";
    label.textContent = iteration.label || iteration.summary || "--";
    const meta = document.createElement("span");
    meta.className = "review-tile__meta";
    meta.textContent = formatDateLabel(iteration.date);
    const badge = createStatusBadge(iteration.status);
    badge.classList.add("review-tile__badge");
    button.append(version, label, meta, badge);
    fragment.append(button);
  });
  selectors.reviewTimeline.append(fragment);
}

function renderReviewDetail(index) {
  if (!selectors.reviewDetail) return;
  selectors.reviewDetail.innerHTML = "";
  const iteration = state.reviewIterations[index];
  if (!iteration) {
    const placeholder = document.createElement("p");
    placeholder.textContent = "暂无评审详情";
    selectors.reviewDetail.append(placeholder);
    return;
  }
  const header = document.createElement("header");
  header.className = "review-detail__header";
  const title = document.createElement("h3");
  title.textContent = `${iteration.version || "迭代"}｜${iteration.label || "更新"}`;
  const summary = document.createElement("p");
  summary.textContent = iteration.summary || "--";
  header.append(title, summary);

  const statusRow = document.createElement("div");
  statusRow.className = "review-detail__status";
  statusRow.append(createStatusBadge(iteration.status));
  const date = document.createElement("span");
  date.className = "review-detail__date";
  date.textContent = `评审日期：${formatDateLabel(iteration.date)}`;
  statusRow.append(date);

  const notesTitle = document.createElement("h4");
  notesTitle.textContent = "角色反馈";
  const notesList = document.createElement("ul");
  notesList.className = "review-detail__notes";
  (iteration.notes || []).forEach((note) => {
    const item = document.createElement("li");
    item.className = "review-detail__note";
    const role = document.createElement("strong");
    role.textContent = note.role || "角色";
    const comment = document.createElement("p");
    comment.textContent = note.comment || "暂无描述";
    const badge = createStatusBadge(note.outcome);
    badge.classList.add("review-detail__badge");
    item.append(role, badge, comment);
    notesList.append(item);
  });

  if (!notesList.childElementCount) {
    const empty = document.createElement("li");
    empty.className = "review-detail__note";
    empty.textContent = "暂无角色反馈";
    notesList.append(empty);
  }

  const actionTitle = document.createElement("h4");
  actionTitle.textContent = "后续行动";
  const actionList = document.createElement("ol");
  actionList.className = "review-detail__actions";
  (iteration.actionItems || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    actionList.append(li);
  });

  if (!actionList.childElementCount) {
    const li = document.createElement("li");
    li.textContent = "暂无待办";
    actionList.append(li);
  }

  selectors.reviewDetail.append(header, statusRow, notesTitle, notesList, actionTitle, actionList);
}

function selectReviewIteration(index) {
  if (index < 0 || index >= state.reviewIterations.length) return;
  state.reviewSelection = index;
  renderReviewTimeline();
  renderReviewDetail(index);
  const iteration = state.reviewIterations[index];
  analytics.track("review_select", {
    version: iteration.version,
    status: iteration.status,
  });
}

async function initReviewBoard() {
  if (!selectors.reviewTimeline || !selectors.reviewDetail) return;
  try {
    const response = await fetch("config/reviews.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const iterations = Array.isArray(data.iterations) ? data.iterations : [];
    state.reviewIterations = iterations;
    state.reviewSelection = iterations.length ? iterations.length - 1 : null;
    renderReviewTimeline();
    if (state.reviewSelection !== null) {
      renderReviewDetail(state.reviewSelection);
      const iteration = state.reviewIterations[state.reviewSelection];
      analytics.track("review_loaded", {
        version: iteration?.version,
        status: iteration?.status,
      });
    } else if (selectors.reviewDetail) {
      selectors.reviewDetail.innerHTML = "";
      const message = document.createElement("p");
      message.textContent = "暂无评审记录，请在 config/reviews.json 中补充数据。";
      selectors.reviewDetail.append(message);
    }
  } catch (error) {
    console.warn("review load failed", error);
    if (selectors.reviewDetail) {
      selectors.reviewDetail.innerHTML = "";
      const message = document.createElement("p");
      message.textContent = "无法加载评审数据，请检查网络或配置文件。";
      selectors.reviewDetail.append(message);
    }
  }

  if (selectors.reviewTimeline) {
    selectors.reviewTimeline.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest("[data-review-index]");
      if (!target) return;
      const index = Number.parseInt(target.getAttribute("data-review-index"), 10);
      if (Number.isNaN(index)) return;
      selectReviewIteration(index);
    });
  }
}

function updateQAProgress() {
  if (!selectors.qaProgress || !selectors.qaProgressLabel) return;
  const total = QA_SCENARIOS.length;
  const completed = state.qa.completed.size;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  selectors.qaProgress.value = percent;
  const parts = [`测试完成度 ${percent}%`];
  if (state.qa.lastSmokeAt) {
    parts.push(`最近冒烟 ${formatDateTimeLabel(state.qa.lastSmokeAt)}`);
  }
  selectors.qaProgressLabel.textContent = parts.join(" ｜ ");
}

function renderQAChecklist() {
  if (!selectors.qaChecklist) return;
  selectors.qaChecklist.innerHTML = "";
  const fragment = document.createDocumentFragment();
  QA_SCENARIOS.forEach((scenario) => {
    const item = document.createElement("li");
    item.className = "qa-checklist__item";
    item.setAttribute("data-role", scenario.role);

    const label = document.createElement("label");
    label.className = "qa-checklist__label";
    label.setAttribute("for", `qa-${scenario.id}`);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `qa-${scenario.id}`;
    checkbox.className = "qa-checklist__checkbox";
    checkbox.dataset.qaId = scenario.id;
    checkbox.checked = state.qa.completed.has(scenario.id);

    const title = document.createElement("span");
    title.className = "qa-checklist__title";
    title.textContent = `${scenario.title}｜${scenario.role}`;

    const description = document.createElement("span");
    description.className = "qa-checklist__description";
    description.textContent = scenario.description;

    label.append(checkbox, title, description);
    item.append(label);
    fragment.append(item);
  });
  selectors.qaChecklist.append(fragment);
  updateQAProgress();
}

function handleQAChecklistChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.dataset.qaId) return;
  const { qaId } = target.dataset;
  if (target.checked) {
    state.qa.completed.add(qaId);
  } else {
    state.qa.completed.delete(qaId);
  }
  saveQAState();
  analytics.track("qa_update", {
    qaId,
    checked: target.checked,
  });
  updateQAProgress();
}

function resetQAChecklist() {
  state.qa.completed = new Set();
  state.qa.lastSmokeAt = null;
  saveQAState();
  renderQAChecklist();
  analytics.track("qa_reset");
}

function simulateSmokeTest() {
  const essential = QA_SCENARIOS.slice(0, 3).map((scenario) => scenario.id);
  essential.forEach((id) => state.qa.completed.add(id));
  state.qa.lastSmokeAt = new Date().toISOString();
  saveQAState();
  renderQAChecklist();
  analytics.track("qa_smoke_test", { scenarios: essential });
}

function initQALab() {
  if (!selectors.qaChecklist) return;
  renderQAChecklist();
  selectors.qaChecklist.addEventListener("change", handleQAChecklistChange);
  if (selectors.qaReset) {
    selectors.qaReset.addEventListener("click", () => resetQAChecklist());
  }
  if (selectors.qaSimulate) {
    selectors.qaSimulate.addEventListener("click", () => simulateSmokeTest());
  }
  if (selectors.qaExport) {
    selectors.qaExport.addEventListener("click", () => exportQAReport());
  }
}

function exportQAReport() {
  const payload = {
    generatedAt: new Date().toISOString(),
    locale: state.preferences.locale,
    progress: {
      total: QA_SCENARIOS.length,
      completed: Array.from(state.qa.completed.values()),
      completionRate: QA_SCENARIOS.length
        ? Number((state.qa.completed.size / QA_SCENARIOS.length).toFixed(2))
        : 0,
      lastSmokeAt: state.qa.lastSmokeAt,
    },
    scenarios: QA_SCENARIOS.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      role: scenario.role,
      description: scenario.description,
      completed: state.qa.completed.has(scenario.id),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `nebula-qa-report-${Date.now()}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  analytics.track("qa_export", { scenarios: payload.progress.completed.length });
}

function formatCountdown(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}天 ${hours}小时 ${minutes}分`;
  if (hours > 0) return `${hours}小时 ${minutes}分`;
  return `${minutes}分 ${(totalSeconds % 60)}秒`;
}

function updateCampaignCountdown(targetDate, label) {
  if (!selectors.campaignCountdown) return;
  const now = Date.now();
  const target = targetDate.getTime();
  const remaining = target - now;
  if (remaining <= 0) {
    selectors.campaignCountdown.textContent = `${label}：进行中`;
    clearInterval(state.campaignTimer);
    state.campaignTimer = null;
    return;
  }
  selectors.campaignCountdown.textContent = `${label}：${formatCountdown(remaining)}`;
}

async function initCampaigns() {
  if (!selectors.campaignBanner) return;
  try {
    const response = await fetch("config/campaigns.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    const now = Date.now();
    const active = campaigns.find((campaign) => {
      const start = campaign.startAt ? new Date(campaign.startAt).getTime() : 0;
      const end = campaign.endAt ? new Date(campaign.endAt).getTime() : Number.POSITIVE_INFINITY;
      return now >= start && now <= end;
    });
    const upcoming = campaigns
      .filter((campaign) => {
        const start = campaign.startAt ? new Date(campaign.startAt).getTime() : 0;
        return start > now;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
    const fallback = data.fallback;
    const chosen = active || upcoming || fallback;
    if (!chosen) return;
    selectors.campaignBanner.hidden = false;
    const title = resolveCampaignField(chosen, "title") || chosen.name || "活动";
    const message = resolveCampaignField(chosen, "message") || chosen.bannerText || "敬请期待";
    selectors.campaignTitle.textContent = `${title}｜${message}`;
    if (state.campaignTimer) {
      clearInterval(state.campaignTimer);
      state.campaignTimer = null;
    }
    if (chosen.startAt || chosen.endAt) {
      const targetDate = active && chosen.endAt ? new Date(chosen.endAt) : chosen.startAt ? new Date(chosen.startAt) : null;
      const label = active ? "距结束" : "距开始";
      if (targetDate) {
        updateCampaignCountdown(targetDate, label);
        state.campaignTimer = window.setInterval(() => updateCampaignCountdown(targetDate, label), 1000);
        state.campaignContext = { id: chosen.id || title, label };
      }
    } else {
      selectors.campaignCountdown.textContent = resolveCampaignField(chosen, "cta") || "立即参与";
    }
  } catch (error) {
    console.warn("campaign load failed", error);
  }
}

function renderAnalyticsBoard() {
  if (!selectors.analyticsKPIs) return;
  selectors.analyticsKPIs.innerHTML = "";
  const dataset = state.analyticsDataset;
  if (!dataset || !Array.isArray(dataset.kpis) || !dataset.kpis.length) {
    const empty = document.createElement("p");
    empty.textContent = t("panel.analytics.empty", "尚无指标数据，等待埋点回传。");
    selectors.analyticsKPIs.append(empty);
  } else {
    const fragment = document.createDocumentFragment();
    dataset.kpis.forEach((kpi) => {
      const card = document.createElement("article");
      card.className = "analytics-card";
      const label = document.createElement("span");
      label.className = "analytics-card__label";
      label.textContent = resolveLocaleString(kpi.label);
      const value = document.createElement("span");
      value.className = "analytics-card__value";
      if (kpi.type === "percentage") {
        value.textContent = formatPercent(kpi.value, kpi.precision ?? 1);
      } else if (kpi.type === "currency") {
        value.textContent = formatNumber(kpi.value, {
          style: "currency",
          currency: kpi.currency || "CNY",
          maximumFractionDigits: 2,
        });
      } else {
        value.textContent = formatNumber(kpi.value, { maximumFractionDigits: 2 });
      }
      card.append(label, value);
      const delta = formatDelta(kpi.delta, kpi.type);
      if (delta) {
        const deltaEl = document.createElement("span");
        deltaEl.className = "analytics-card__delta";
        deltaEl.dataset.trend = kpi.delta > 0 ? "up" : kpi.delta < 0 ? "down" : "flat";
        deltaEl.textContent = delta;
        card.append(deltaEl);
      }
      if (kpi.note) {
        const note = document.createElement("small");
        note.textContent = resolveLocaleString(kpi.note);
        note.style.color = "var(--muted)";
        card.append(note);
      }
      fragment.append(card);
    });
    selectors.analyticsKPIs.append(fragment);
  }

  if (selectors.analyticsFunnel) {
    selectors.analyticsFunnel.innerHTML = "";
    if (!dataset || !Array.isArray(dataset.funnel) || !dataset.funnel.length) {
      const empty = document.createElement("li");
      empty.textContent = t("panel.analytics.funnelEmpty", "暂无漏斗数据");
      selectors.analyticsFunnel.append(empty);
    } else {
      const fragment = document.createDocumentFragment();
      dataset.funnel.forEach((stage) => {
        const item = document.createElement("li");
        item.className = "analytics-funnel__item";
        const label = document.createElement("span");
        label.textContent = resolveLocaleString(stage.label || stage.stage);
        const value = document.createElement("span");
        if (stage.type === "percentage") {
          value.textContent = formatPercent(stage.value, stage.precision ?? 1);
        } else {
          value.textContent = formatNumber(stage.value, { maximumFractionDigits: 2 });
        }
        item.append(label, value);
        fragment.append(item);
      });
      selectors.analyticsFunnel.append(fragment);
    }
  }

  if (selectors.analyticsUpdated) {
    if (dataset?.lastUpdated) {
      const formatted = formatDateTimeLabel(dataset.lastUpdated);
      const template = t("panel.analytics.updated", "更新于 {{time}}");
      selectors.analyticsUpdated.textContent = formatTemplate(template, { time: formatted });
    } else {
      selectors.analyticsUpdated.textContent = "";
    }
  }

  state.experiments = Array.isArray(dataset?.experiments) ? dataset.experiments : [];
  state.ltvSegments = Array.isArray(dataset?.ltv) ? dataset.ltv : [];
  renderExperimentList();
  renderLtvTable();
}

function renderExperimentList() {
  if (!selectors.experimentList) return;
  selectors.experimentList.innerHTML = "";
  if (!state.experiments.length) {
    const empty = document.createElement("li");
    empty.textContent = t("panel.experiments.empty", "暂无进行中的实验");
    selectors.experimentList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  state.experiments.forEach((experiment) => {
    const card = document.createElement("li");
    card.className = "experiment-card";
    const title = document.createElement("strong");
    title.textContent = resolveLocaleString(experiment.name);
    const goal = document.createElement("p");
    goal.textContent = `${t("panel.experiments.goal", "目标")}: ${resolveLocaleString(experiment.goal)}`;
    const meta = document.createElement("div");
    meta.className = "experiment-card__meta";
    const statusLabel = t(`experiments.status.${experiment.status}`, experiment.status);
    meta.append(
      document.createTextNode(`${statusLabel}`),
      document.createTextNode(` ｜ ${t("panel.experiments.traffic", "流量")}: ${formatPercent(experiment.traffic ?? 0, 0)}`)
    );
    if (typeof experiment.uplift === "number") {
      meta.append(document.createTextNode(` ｜ ${t("panel.experiments.uplift", "提升")}: ${formatPercent(experiment.uplift, 1)}`));
    }
    card.append(title, goal, meta);
    if (experiment.nextStep) {
      const next = document.createElement("small");
      next.textContent = `${t("panel.experiments.next", "下一步")}: ${resolveLocaleString(experiment.nextStep)}`;
      next.style.color = "var(--muted)";
      card.append(next);
    }
    fragment.append(card);
  });
  selectors.experimentList.append(fragment);
}

function renderLtvTable() {
  if (!selectors.ltvTableBody) return;
  selectors.ltvTableBody.innerHTML = "";
  if (!state.ltvSegments.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = t("panel.experiments.ltvEmpty", "暂无营收模型数据");
    row.append(cell);
    selectors.ltvTableBody.append(row);
    return;
  }
  const fragment = document.createDocumentFragment();
  state.ltvSegments.forEach((segment) => {
    const row = document.createElement("tr");
    const segmentCell = document.createElement("td");
    segmentCell.textContent = resolveLocaleString(segment.name || segment.segment);
    const arpuCell = document.createElement("td");
    arpuCell.textContent = formatNumber(segment.arpu, {
      style: "currency",
      currency: segment.currency || "CNY",
      maximumFractionDigits: 2,
    });
    const ltvCell = document.createElement("td");
    ltvCell.textContent = formatNumber(segment.ltv, {
      style: "currency",
      currency: segment.currency || "CNY",
      maximumFractionDigits: 2,
    });
    const confidenceCell = document.createElement("td");
    confidenceCell.textContent = formatPercent(segment.confidence ?? 0, 0);
    if (segment.trend) {
      confidenceCell.dataset.trend = segment.trend;
    }
    row.append(segmentCell, arpuCell, ltvCell, confidenceCell);
    fragment.append(row);
  });
  selectors.ltvTableBody.append(fragment);
}

async function loadAnalyticsDataset() {
  if (!selectors.analyticsKPIs) return;
  try {
    const response = await fetch("config/metrics.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.analyticsDataset = data;
    renderAnalyticsBoard();
  } catch (error) {
    console.warn("analytics load failed", error);
    state.analyticsDataset = null;
    if (selectors.analyticsKPIs) {
      selectors.analyticsKPIs.innerHTML = "";
      const message = document.createElement("p");
      message.textContent = t("panel.analytics.error", "无法加载指标数据，请稍后重试。");
      selectors.analyticsKPIs.append(message);
    }
  }
}

function exportAnalyticsReport() {
  if (!state.analyticsDataset) return;
  const dataset = state.analyticsDataset;
  const lines = [
    `# ${t("report.title", "星云探险队商业化周报")}`,
    `- ${t("report.generatedAt", "生成时间")}: ${new Date().toISOString()}`,
  ];
  if (dataset.lastUpdated) {
    lines.push(`- ${t("report.dataUpdated", "数据更新时间")}: ${dataset.lastUpdated}`);
  }
  lines.push("\n## KPI");
  (dataset.kpis || []).forEach((kpi) => {
    const label = resolveLocaleString(kpi.label);
    let value;
    if (kpi.type === "percentage") {
      value = formatPercent(kpi.value, kpi.precision ?? 1);
    } else if (kpi.type === "currency") {
      value = formatNumber(kpi.value, {
        style: "currency",
        currency: kpi.currency || "CNY",
        maximumFractionDigits: 2,
      });
    } else {
      value = formatNumber(kpi.value, { maximumFractionDigits: 2 });
    }
    const delta = formatDelta(kpi.delta, kpi.type);
    lines.push(`- ${label}: ${value}${delta ? ` (${delta})` : ""}`);
  });

  lines.push("\n## Funnel");
  (dataset.funnel || []).forEach((stage) => {
    const label = resolveLocaleString(stage.label || stage.stage);
    const value = stage.type === "percentage"
      ? formatPercent(stage.value, stage.precision ?? 1)
      : formatNumber(stage.value, { maximumFractionDigits: 2 });
    lines.push(`- ${label}: ${value}`);
  });

  lines.push("\n## Experiments");
  if (!state.experiments.length) {
    lines.push(`- ${t("panel.experiments.empty", "暂无进行中的实验")}`);
  } else {
    state.experiments.forEach((experiment) => {
      const name = resolveLocaleString(experiment.name);
      const status = t(`experiments.status.${experiment.status}`, experiment.status);
      const uplift = typeof experiment.uplift === "number" ? formatPercent(experiment.uplift, 1) : "--";
      lines.push(`- ${name} (${status}) → uplift ${uplift}`);
    });
  }

  lines.push("\n## LTV Segments");
  if (!state.ltvSegments.length) {
    lines.push(`- ${t("panel.experiments.ltvEmpty", "暂无营收模型数据")}`);
  } else {
    state.ltvSegments.forEach((segment) => {
      const name = resolveLocaleString(segment.name || segment.segment);
      const arpu = formatNumber(segment.arpu, {
        style: "currency",
        currency: segment.currency || "CNY",
        maximumFractionDigits: 2,
      });
      const ltv = formatNumber(segment.ltv, {
        style: "currency",
        currency: segment.currency || "CNY",
        maximumFractionDigits: 2,
      });
      lines.push(`- ${name}: ARPU ${arpu} / LTV ${ltv}`);
    });
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `nebula-analytics-report-${Date.now()}.md`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  analytics.track("analytics_export", { items: dataset.kpis?.length ?? 0 });
}

function renderValidationResults(results) {
  if (!selectors.validationList) return;
  selectors.validationList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  results.forEach((item) => {
    const li = document.createElement("li");
    li.className = "validation-item";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const status = document.createElement("span");
    status.className = "validation-item__status";
    status.dataset.status = item.status;
    const statusKey = `validation.status.${item.status}`;
    status.textContent = t(statusKey, item.status);
    const detail = document.createElement("p");
    detail.textContent = item.detail;
    li.append(title, status, detail);
    if (item.suggestion) {
      const suggestion = document.createElement("small");
      suggestion.style.color = "var(--muted)";
      suggestion.textContent = item.suggestion;
      li.append(suggestion);
    }
    fragment.append(li);
  });
  selectors.validationList.append(fragment);

  if (selectors.validationSummary) {
    const total = results.length;
    const warnings = results.filter((item) => item.status === "warning").length;
    const errors = results.filter((item) => item.status === "error").length;
    const template = t(
      "validation.summary",
      "共 {{total}} 项校验 ｜ 警告 {{warnings}} ｜ 阻断 {{errors}}"
    );
    selectors.validationSummary.textContent = formatTemplate(template, { total, warnings, errors });
  }
}

async function runValidationChecks() {
  if (!selectors.validationList) return;
  const results = [];
  try {
    const response = await fetch("config/campaigns.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
    const now = Date.now();
    campaigns.forEach((campaign) => {
      const title = resolveLocaleString(campaign.title || campaign.name || campaign.id || "Campaign");
      const start = campaign.startAt ? new Date(campaign.startAt).getTime() : null;
      const end = campaign.endAt ? new Date(campaign.endAt).getTime() : null;
      let status = "ok";
      const issues = [];
      if (end && end < now) {
        status = "warning";
        issues.push(t("validation.campaign.ended", "活动已过期，建议下架或更新。"));
      }
      if (start && start > now && start - now < 3 * 24 * 60 * 60 * 1000) {
        if (status !== "error") status = "warning";
        issues.push(t("validation.campaign.upcoming", "活动即将开始，请提前预热。"));
      }
      const message = resolveCampaignField(campaign, "message") || "";
      if (message.length > 60) {
        if (status !== "error") status = "warning";
        issues.push(t("validation.campaign.length", "文案超过 60 字，请精简以适配推送位。"));
      }
      const locales = campaign.locales;
      if (locales && typeof locales === "object") {
        const requiredLocale = state.preferences.locale;
        if (!locales[requiredLocale]) {
          status = "warning";
          issues.push(t("validation.campaign.locale", "缺少当前语言的文案，已回退到默认。"));
        }
      }
      results.push({
        title: `${t("validation.campaign.title", "活动")}: ${title}`,
        status,
        detail: issues.join(" ｜ ") || t("validation.campaign.ok", "配置正常"),
        suggestion: campaign.nextStep ? resolveLocaleString(campaign.nextStep) : undefined,
      });
    });
  } catch (error) {
    console.warn("campaign validation failed", error);
    results.push({
      title: t("validation.campaign.fetchTitle", "活动配置"),
      status: "error",
      detail: t("validation.campaign.fetchError", "无法读取活动配置，请检查网络或 JSON 格式。"),
    });
  }

  const locales = Object.keys(state.localeCatalog || {});
  if (locales.length) {
    const trackedKeys = new Set();
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      if (element.dataset.i18n) trackedKeys.add(element.dataset.i18n);
    });
    locales.forEach((locale) => {
      const missing = Array.from(trackedKeys).filter((key) => {
        const catalog = state.localeCatalog?.[locale] || {};
        return catalog[key] === undefined;
      });
      if (missing.length) {
        results.push({
          title: `${t("validation.locale.title", "语言包")}: ${locale}`,
          status: locale === I18N_FALLBACK ? "error" : "warning",
          detail: formatTemplate(t("validation.locale.missing", "缺少 {{count}} 条翻译"), { count: missing.length }),
          suggestion: `${t("validation.locale.suggestion", "补齐以下键值")}: ${missing
            .slice(0, 5)
            .join(", ")}${missing.length > 5 ? "…" : ""}`,
        });
      }
    });
  }

  state.validationResults = results;
  renderValidationResults(results);
  analytics.track("ops_validation", {
    total: results.length,
    warnings: results.filter((item) => item.status === "warning").length,
    errors: results.filter((item) => item.status === "error").length,
  });
}

function initPreferenceControls() {
  if (selectors.themeSelect) {
    selectors.themeSelect.addEventListener("change", (event) => {
      if (!(event.target instanceof HTMLSelectElement)) return;
      applyTheme(event.target.value);
    });
  }
  if (selectors.localeSelect) {
    selectors.localeSelect.addEventListener("change", (event) => {
      if (!(event.target instanceof HTMLSelectElement)) return;
      applyLocale(event.target.value);
    });
  }
  if (selectors.analyticsExport) {
    selectors.analyticsExport.addEventListener("click", () => exportAnalyticsReport());
  }
  if (selectors.validationRefresh) {
    selectors.validationRefresh.addEventListener("click", () => runValidationChecks());
  }
}

async function init() {
  applyTheme(state.preferences.theme, { track: false });
  await loadI18nCatalog();
  applyLocale(state.preferences.locale, { track: false });
  updateProfileUI();
  initPreferenceControls();
  ensureOnboarding();
  initServiceWorker();
  initDebugging();
  initCampaigns();
  initReviewBoard();
  initQALab();
  await loadAnalyticsDataset();
  await runValidationChecks();
  analytics.track("app_loaded", { player: state.profile.name });
}

window.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running && !state.paused) {
    pauseGame();
  }
});

init().catch((error) => {
  console.error("init failed", error);
});
