const PROFILE = {
  name: "Diksha Somwanshi",
  email: "dikshasomwanshi24@gmail.com",
  githubProfile: "https://github.com/dikshu2004",
  resumeFilename: "resume.pdf",
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EmailJS — production contact form (https://www.emailjs.com/)
 * Dashboard: https://dashboard.emailjs.com/admin
 *
 * Paste your values from the EmailJS dashboard into EMAILJS_CONFIG below:
 *
 * 1) SERVICE_ID (Email Services)
 *    → Left sidebar: “Email Services” → open your service → copy “Service ID”
 *    → Looks like: service_xxxxxxx
 *
 * 2) TEMPLATE_ID (Email Templates)
 *    → “Email Templates” → open your template → copy “Template ID”
 *    → Looks like: template_xxxxxxx
 *    → In the template, use: {{from_name}}, {{from_email}}, {{reply_to}}, {{message}}, {{to_name}}
 *      (optional: {{subject}} if you add it in buildEmailTemplateParams)
 *
 * 3) PUBLIC_KEY (Account)
 *    → “Account” → “General” → “Public Key”
 *    → Safe to use in frontend code (never paste a private key here)
 *
 * Replace YOUR_SERVICE_ID, YOUR_TEMPLATE_ID, YOUR_PUBLIC_KEY with real strings.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const EMAILJS_CONFIG = {
  SERVICE_ID: "service_0ok51bt", // Email Services → your service → Service ID
  TEMPLATE_ID: "template_qx9ggvg", // Email Templates → your template → Template ID
  PUBLIC_KEY: "Zsvl84NwJP6-vaT_v", // Account → General → Public Key (never use Private Key here)
};

/**
 * @returns {string | null} Why config is invalid (safe for console — no secrets). Null if OK.
 */
function getEmailJsConfigIssue() {
  const s = String(EMAILJS_CONFIG.SERVICE_ID ?? "").trim();
  const t = String(EMAILJS_CONFIG.TEMPLATE_ID ?? "").trim();
  const k = String(EMAILJS_CONFIG.PUBLIC_KEY ?? "").trim();
  if (!s) return "SERVICE_ID is empty.";
  if (!t) return "TEMPLATE_ID is empty.";
  if (!k) return "PUBLIC_KEY is empty.";
  const sl = s.toLowerCase();
  const tl = t.toLowerCase();
  const kl = k.toLowerCase();
  if (sl.startsWith("your_") || tl.startsWith("your_") || kl.startsWith("your_")) {
    return "A value still looks like a placeholder (starts with your_).";
  }
  if (s === "SERVICE_ID" || t === "TEMPLATE_ID" || k === "PUBLIC_KEY") {
    return "Replace literal SERVICE_ID / TEMPLATE_ID / PUBLIC_KEY with values from dashboard.emailjs.com.";
  }
  if (!/^service_[a-zA-Z0-9_.-]+$/.test(s)) {
    return "SERVICE_ID should look like service_xxxxxxxx.";
  }
  if (!/^template_[a-zA-Z0-9_.-]+$/.test(t)) {
    return "TEMPLATE_ID should look like template_xxxxxxxx.";
  }
  if (k.length < 8) {
    return "PUBLIC_KEY looks too short — copy the full key from Account → General.";
  }
  return null;
}

/** Validates shape only (no blocklists of real IDs). */
function isValidConfig() {
  return getEmailJsConfigIssue() === null;
}

/** Set true after a successful emailjs.init() (avoid re-init on every submit). */
let emailJsInitialized = false;

/**
 * Initializes EmailJS once when the CDN script is present and config is valid.
 * Uses: emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY })
 */
function initEmailJsIfValid() {
  if (typeof emailjs === "undefined") {
    return false;
  }
  if (!isValidConfig()) {
    return false;
  }
  if (emailJsInitialized) {
    return true;
  }
  try {
    const pk = EMAILJS_CONFIG.PUBLIC_KEY.trim();
    emailjs.init({ publicKey: pk });
    emailJsInitialized = true;
    return true;
  } catch (e) {
    try {
      emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY.trim());
      emailJsInitialized = true;
      return true;
    } catch (e2) {
      console.error("[EmailJS] init() failed:", e, e2);
      return false;
    }
  }
}

/**
 * Payload for emailjs.send(). Required fields for your EmailJS template.
 * reply_to defaults to from_email if not passed.
 * @param {{ name: string; email: string; message: string; replyTo?: string }} p
 */
function buildEmailTemplateParams(p) {
  const from_name = p.name.trim();
  const from_email = p.email.trim();
  const message = p.message.trim();
  const reply_to =
    p.replyTo != null && String(p.replyTo).trim() !== "" ? String(p.replyTo).trim() : from_email;

  return {
    from_name,
    from_email,
    reply_to,
    message,
    to_name: PROFILE.name,
    to_email: PROFILE.email,
    user_name: from_name,
    user_email: from_email,
    subject: `Portfolio: message from ${from_name}`,
  };
}

/** Short message for UI when placeholders or invalid shape in EMAILJS_CONFIG. */
const EMAILJS_CONFIG_USER_MESSAGE = "Email service is not configured properly.";

/** When init fails but IDs look structurally valid (wrong key, SDK error, etc.). */
const EMAILJS_INIT_USER_MESSAGE =
  "Email service couldn’t start. Check PUBLIC_KEY in app.js and the browser console (F12).";

/** Longer hint for toast / developers. */
const EMAILJS_CONFIG_HINT =
  "Open app.js → EMAILJS_CONFIG and set SERVICE_ID, TEMPLATE_ID, and PUBLIC_KEY from dashboard.emailjs.com. Hard refresh (Ctrl+Shift+R) if you already saved.";

/** Human-readable API error for the form (status + body; JSON body parsed when possible). */
function formatEmailJsError(err) {
  if (err == null) return "";
  let raw = "";
  const status = typeof err.status === "number" ? err.status : null;

  if (typeof err === "string") {
    raw = err;
  } else {
    raw = err.text ?? err.message ?? "";
    if (typeof raw === "string") {
      const t = raw.trim();
      if (t.startsWith("{") && t.endsWith("}")) {
        try {
          const j = JSON.parse(t);
          raw = j.message || j.error || j.text || raw;
        } catch {
          /* keep raw */
        }
      }
    }
  }

  raw = String(raw).trim();
  if (!raw && status != null) {
    raw = `Request failed (${status}). Check EmailJS dashboard: template fields, service, and allowed domains.`;
  } else if (status != null && !raw.includes(String(status))) {
    raw = `${raw} (${status})`;
  }

  return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
}

/**
 * Sends after init(). Uses 3-arg send when init already set the public key (avoids some SDK edge cases).
 * Falls back to 4-arg send with explicit publicKey if the first attempt throws.
 */
async function sendContactEmail(templateParams) {
  if (!isValidConfig()) {
    throw new Error("EmailJS configuration is invalid or still using placeholders.");
  }
  const serviceId = EMAILJS_CONFIG.SERVICE_ID.trim();
  const templateId = EMAILJS_CONFIG.TEMPLATE_ID.trim();
  const publicKey = EMAILJS_CONFIG.PUBLIC_KEY.trim();

  try {
    return await emailjs.send(serviceId, templateId, templateParams);
  } catch (firstErr) {
    console.warn("[EmailJS] send (3-arg) failed, retrying with explicit publicKey option:", firstErr);
    return await emailjs.send(serviceId, templateId, templateParams, { publicKey });
  }
}

const TYPED_PHRASES = [
  "accessible web products.",
  "full-stack features end-to-end.",
  "interfaces that feel effortless.",
  "data-informed experiences.",
];

const PROJECTS = [
  {
    id: "food",
    title: "Food Delivery Web Application",
    subtitle: "Production-style ordering flow · Java web stack · MySQL",
    period: "Academic & internship-aligned build",
    tech: ["HTML", "CSS", "JavaScript", "Bootstrap", "Java", "Servlets", "JSP", "MySQL", "Apache Tomcat"],
    bullets: [
      "Delivered a responsive, conversion-minded UI so users can browse and place orders without friction on any screen size.",
      "Engineered server-side request handling with Java, Servlets, and JSP—keeping business logic maintainable and testable.",
      "Modeled and integrated a MySQL persistence layer, then deployed the application on Tomcat for a realistic delivery path.",
    ],
    demoUrl: "",
    codeUrl: PROFILE.githubProfile,
  },
  {
    id: "sensiq",
    title: "SensiQ — Accessibility Platform",
    subtitle: "MERN · Voice & gesture UX · Inclusive communication (in progress)",
    period: "Ongoing",
    tech: [
      "MongoDB",
      "Express.js",
      "React",
      "Node.js",
      "Web Speech API",
      "Postman",
      "Git",
      "MongoDB Compass",
    ],
    bullets: [
      "Building an inclusive web platform that combines speech-to-text, text-to-speech, and gesture-oriented interaction patterns.",
      "Designing scalable REST APIs and real-time-friendly flows on the MERN stack for reliable client–server collaboration.",
      "Integrating Web Speech API and exploratory AI-assisted tooling to raise the bar on voice recognition and accessibility.",
    ],
    demoUrl: "",
    codeUrl: PROFILE.githubProfile,
  },
];

const SKILL_GROUPS = [
  {
    id: "languages",
    title: "Languages",
    blurb: "Core programming for systems, backends, and logic-heavy features.",
    items: [
      { name: "C", level: 64 },
      { name: "Java", level: 76 },
      { name: "JavaScript", level: 74 },
    ],
  },
  {
    id: "frontend",
    title: "Frontend",
    blurb: "Semantic markup, responsive layout, and polished component-level UI.",
    items: [
      { name: "HTML", level: 82 },
      { name: "CSS", level: 76 },
      { name: "Bootstrap", level: 78 },
      { name: "React", level: 68 },
    ],
  },
  {
    id: "backend",
    title: "Backend",
    blurb: "Server logic from Java web standards to Node/Express APIs.",
    items: [
      { name: "Java (Servlets/JSP)", level: 74 },
      { name: "Express.js", level: 66 },
      { name: "Node.js", level: 64 },
    ],
  },
  {
    id: "data",
    title: "Data & persistence",
    blurb: "Relational and document models with practical query and integration work.",
    items: [
      { name: "MySQL", level: 70 },
      { name: "MongoDB", level: 66 },
    ],
  },
  {
    id: "tools",
    title: "Tools & workflow",
    blurb: "Shipping safely: version control, API testing, and a sharp editor workflow.",
    items: [
      { name: "Git / GitHub", level: 76 },
      { name: "Postman", level: 72 },
      { name: "VS Code", level: 80 },
    ],
  },
  {
    id: "core",
    title: "Problem solving",
    blurb: "Structured thinking for algorithms, debugging, and scalable solutions.",
    items: [
      { name: "Data structures & algorithms", level: 74 },
      { name: "Problem solving", level: 78 },
    ],
  },
];

function $(id) {
  return document.getElementById(id);
}

/**
 * Toast notification (top-right). Use variant "error" for failures (longer visibility + styling).
 * @param {string} message
 * @param {{ duration?: number; variant?: "default" | "error" }} [opts]
 */
function toast(message, opts = {}) {
  const el = $("toast");
  if (!el) return;
  const variant = opts.variant === "error" ? "error" : "default";
  const duration =
    typeof opts.duration === "number"
      ? opts.duration
      : variant === "error"
        ? 4000
        : 3200;

  el.textContent = message;
  el.classList.remove("toast--error", "show");
  void el.offsetWidth;
  if (variant === "error") el.classList.add("toast--error");
  el.classList.add("show");

  window.clearTimeout(toast._t);
  window.clearTimeout(toast._hideT);
  toast._t = window.setTimeout(() => {
    el.classList.remove("show");
    toast._hideT = window.setTimeout(() => el.classList.remove("toast--error"), 320);
  }, duration);
}

function setTheme(theme) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  localStorage.setItem("theme", theme);
  const btn = $("themeBtn");
  if (btn) btn.setAttribute("aria-pressed", String(theme === "light"));
  renderThemeIcon(theme);
}

function getPreferredTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

function renderThemeIcon(theme) {
  const el = $("themeIcon");
  if (!el) return;
  el.innerHTML =
    theme === "light"
      ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M12 3v3M12 18v3M4.2 6.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M6.3 15.7 4.2 17.8M19.8 6.2l-2.1 2.1"/>
           <circle cx="12" cy="12" r="4"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M21 14.5A7.5 7.5 0 0 1 9.5 3 6.5 6.5 0 1 0 21 14.5Z"/>
         </svg>`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function setupScrollProgress() {
  const bar = $("scrollProgress");
  if (!bar) return;

  const update = () => {
    const el = document.documentElement;
    const scrollable = el.scrollHeight - el.clientHeight;
    const p = scrollable <= 0 ? 0 : (el.scrollTop / scrollable) * 100;
    bar.style.setProperty("--scroll-pct", `${p}%`);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function setupTypingAnimation() {
  const out = $("typedText");
  if (!out) return;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) {
    out.textContent = TYPED_PHRASES[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;
  const typeSpeed = 58;
  const deleteSpeed = 38;
  const pauseEnd = 1650;
  const pauseStart = 320;

  const tick = () => {
    const phrase = TYPED_PHRASES[phraseIndex % TYPED_PHRASES.length];

    if (!deleting) {
      out.textContent = phrase.slice(0, charIndex + 1);
      charIndex++;
      if (charIndex === phrase.length) {
        deleting = true;
        window.setTimeout(tick, pauseEnd);
        return;
      }
    } else {
      out.textContent = phrase.slice(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        deleting = false;
        phraseIndex++;
        window.setTimeout(tick, pauseStart);
        return;
      }
    }

    window.setTimeout(tick, deleting ? deleteSpeed : typeSpeed);
  };

  window.setTimeout(tick, 480);
}

function setupRevealAnimations() {
  const items = Array.from(document.querySelectorAll(".reveal"));
  if (items.length === 0) return;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

function setupMobileMenu() {
  const btn = $("menuBtn");
  const menu = $("mobileMenu");
  if (!btn || !menu) return;

  const setOpen = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    btn.classList.toggle("is-open", open);
  };

  setOpen(false);

  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    setOpen(!open);
  });

  menu.addEventListener("click", (e) => {
    const a = e.target.closest?.("a");
    if (a) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

function setupResumeButtons() {
  const buttons = [$("resumeBtn"), $("resumeBtnMobile")].filter(Boolean);
  if (buttons.length === 0) return;

  const openResume = async () => {
    const url = `./${PROFILE.resumeFilename}`;
    const opened = () => window.open(url, "_blank", "noopener,noreferrer");

    const isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
    if (!isHttp) {
      opened();
      return;
    }

    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
      if (!res.ok) throw new Error("missing");
      opened();
    } catch {
      toast(`Add ${PROFILE.resumeFilename} next to index.html to open your PDF.`);
    }
  };

  for (const b of buttons) {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      openResume();
    });
  }
}

function createProjectCard(p) {
  const el = document.createElement("article");
  el.className = "project-card reveal glass-panel";
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `Open project: ${p.title}`);
  el.dataset.projectId = p.id;

  const chips = p.tech.slice(0, 7).map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("");
  el.innerHTML = `
    <div class="project-top">
      <div>
        <h3 class="project-title">${escapeHtml(p.title)}</h3>
        <p class="project-meta">${escapeHtml(p.subtitle)}</p>
      </div>
      <span class="chip">${escapeHtml(p.period)}</span>
    </div>
    <div class="project-preview" aria-hidden="true">
      <div class="preview-line w85"></div>
      <div class="preview-line w70"></div>
      <div class="preview-line w55"></div>
    </div>
    <div class="chips" aria-label="Technologies used">${chips}</div>
    <div class="project-cta" aria-hidden="true">
      <span class="mini-link">View details</span>
    </div>
  `;

  const open = () => openProjectModal(p.id);
  el.addEventListener("click", open);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  return el;
}

function createSkillCategory(group) {
  const el = document.createElement("article");
  el.className = "skill-category reveal glass-panel";
  el.dataset.category = group.id;

  const bars = group.items
    .map(
      (it) => `
    <div class="skill-bar-row">
      <div class="skill-bar-top">
        <span class="skill-bar-name">${escapeHtml(it.name)}</span>
        <span class="skill-bar-val">${it.level}%</span>
      </div>
      <div class="skill-bar-track" role="presentation">
        <div class="skill-bar-fill" style="--lvl:${it.level}%"></div>
      </div>
    </div>`
    )
    .join("");

  el.innerHTML = `
    <header class="skill-category__head">
      <h3 class="skill-category__title">${escapeHtml(group.title)}</h3>
      <p class="skill-category__blurb muted">${escapeHtml(group.blurb)}</p>
    </header>
    <div class="skill-category__body">${bars}</div>
  `;

  return el;
}

function openProjectModal(projectId) {
  const modal = $("projectModal");
  const body = $("modalBody");
  if (!modal || !body) return;

  const p = PROJECTS.find((x) => x.id === projectId);
  if (!p) return;

  const tech = p.tech.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join("");
  const bullets = p.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");

  const demoBtn = p.demoUrl
    ? `<a class="btn" href="${escapeAttr(p.demoUrl)}" target="_blank" rel="noreferrer">Live demo</a>`
    : `<span class="btn btn-disabled" aria-disabled="true">Live demo — add URL in app.js</span>`;

  const codeBtn = p.codeUrl
    ? `<a class="btn ghost" href="${escapeAttr(p.codeUrl)}" target="_blank" rel="noreferrer">GitHub profile</a>`
    : `<span class="btn ghost btn-disabled" aria-disabled="true">Repository link TBD</span>`;

  body.innerHTML = `
    <h3>${escapeHtml(p.title)}</h3>
    <p>${escapeHtml(p.subtitle)}</p>
    <div class="modal-row">
      <span class="chip">${escapeHtml(p.period)}</span>
    </div>
    <div class="sep"></div>
    <h3>Impact &amp; ownership</h3>
    <ul class="bullets">${bullets}</ul>
    <div class="sep"></div>
    <h3>Tech stack</h3>
    <div class="chips">${tech}</div>
    <div class="modal-row" style="margin-top:14px">
      ${demoBtn}
      ${codeBtn}
      <button class="btn ghost" type="button" id="copyProjectBtn">Copy summary</button>
    </div>
  `;

  const copyBtn = document.getElementById("copyProjectBtn");
  copyBtn?.addEventListener("click", async () => {
    const summary = `${p.title} — ${p.subtitle}\nTech: ${p.tech.join(", ")}\nHighlights:\n- ${p.bullets.join("\n- ")}`;
    const ok = await copyToClipboard(summary);
    toast(ok ? "Project summary copied." : "Copy failed. Try again.");
  });

  if (typeof modal.showModal === "function") modal.showModal();
  else {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) w.document.write(`<pre>${escapeHtml(body.textContent || "")}</pre>`);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}

function setupParallax() {
  const card = document.querySelector('[data-parallax="card"]');
  const blobs = Array.from(document.querySelectorAll(".blob"));
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return;

  const apply = (el, x, y) => {
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  let mx = 0;
  let my = 0;

  window.addEventListener("pointermove", (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    mx = (e.clientX - cx) / cx;
    my = (e.clientY - cy) / cy;
  });

  const tick = () => {
    apply(card, mx * 5, my * 5);
    blobs.forEach((b, i) => apply(b, mx * (10 + i * 4), my * (8 + i * 3)));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupContactForm() {
  const form = $("contactForm");
  if (!form) return;

  const formHint = $("formHint");
  if (formHint && isValidConfig()) {
    formHint.textContent =
      " Your message is sent from this page. ";
  }

  const nameEl = $("msgName");
  const emailEl = $("msgEmail");
  const textEl = $("msgText");
  const errName = $("errName");
  const errEmail = $("errEmail");
  const errText = $("errText");
  const errSubmit = $("formSubmitError");
  const clearBtn = $("clearBtn");
  const submitBtn = $("contactSubmitBtn");
  const successDlg = $("contactSuccessModal");

  let successModalAutoCloseTimer = null;

  const setErr = (el, msg) => {
    if (!el) return;
    el.textContent = msg;
  };

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const triggerFormShake = () => {
    form.classList.remove("shake-error");
    void form.offsetWidth;
    form.classList.add("shake-error");
    window.setTimeout(() => form.classList.remove("shake-error"), 520);
  };

  const setSending = (on) => {
    form.classList.toggle("is-sending", on);
    if (submitBtn) {
      submitBtn.disabled = on;
      submitBtn.setAttribute("aria-busy", String(on));
    }
  };

  const validate = () => {
    const name = nameEl?.value?.trim() ?? "";
    const email = emailEl?.value?.trim() ?? "";
    const text = textEl?.value?.trim() ?? "";

    let ok = true;

    setErr(errName, "");
    setErr(errEmail, "");
    setErr(errText, "");
    setErr(errSubmit, "");

    if (name.length < 2) {
      setErr(errName, "Please enter your name (min 2 characters).");
      ok = false;
    }
    if (!isEmail(email)) {
      setErr(errEmail, "Please enter a valid email address.");
      ok = false;
    }
    if (text.length < 10) {
      setErr(errText, "Please write a message (min 10 characters).");
      ok = false;
    }

    if (!ok) {
      form.classList.remove("shake");
      void form.offsetWidth;
      form.classList.add("shake");
    }
    return ok;
  };

  const closeSuccessModal = () => {
    window.clearTimeout(successModalAutoCloseTimer);
    successModalAutoCloseTimer = null;
    successDlg?.close?.();
  };

  const showSuccessModal = () => {
    const dlg = successDlg;
    const icon = $("successModalIcon");
    if (!dlg) return;
    if (icon) {
      icon.classList.remove("anim", "anim-bounce");
      void icon.offsetWidth;
      icon.classList.add("anim");
      window.setTimeout(() => icon.classList.add("anim-bounce"), 1120);
    }
    if (typeof dlg.showModal === "function") {
      dlg.showModal();
      window.clearTimeout(successModalAutoCloseTimer);
      successModalAutoCloseTimer = window.setTimeout(() => {
        successModalAutoCloseTimer = null;
        dlg.close?.();
      }, 3500);
    } else {
      toast("Message sent successfully!");
    }
  };

  $("successModalClose")?.addEventListener("click", closeSuccessModal);
  $("successModalOk")?.addEventListener("click", closeSuccessModal);

  successDlg?.addEventListener("click", (e) => {
    if (e.target === successDlg) closeSuccessModal();
  });

  successDlg?.addEventListener("close", () => {
    window.clearTimeout(successModalAutoCloseTimer);
    successModalAutoCloseTimer = null;
    $("successModalIcon")?.classList.remove("anim", "anim-bounce");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (window.location.protocol === "file:") {
      const msg =
        "EmailJS needs http:// or https://. Use VS Code Live Server, or run: npx serve . then open the URL shown.";
      toast(msg, { variant: "error", duration: 6000 });
      setErr(errSubmit, msg);
      triggerFormShake();
      return;
    }

    if (typeof emailjs === "undefined") {
      const msg = "EmailJS failed to load. Check your network or the script URL.";
      toast(msg, { variant: "error" });
      setErr(errSubmit, msg);
      triggerFormShake();
      return;
    }

    if (!isValidConfig()) {
      const issue = getEmailJsConfigIssue();
      if (issue && typeof console !== "undefined" && console.warn) {
        console.warn("[EmailJS] " + issue);
      }
      toast(EMAILJS_CONFIG_HINT, { variant: "error", duration: 5000 });
      setErr(errSubmit, EMAILJS_CONFIG_USER_MESSAGE);
      triggerFormShake();
      return;
    }

    if (!initEmailJsIfValid()) {
      const msg = "Email service could not start. Check PUBLIC_KEY and the browser console.";
      toast(msg, { variant: "error" });
      setErr(errSubmit, EMAILJS_INIT_USER_MESSAGE);
      triggerFormShake();
      return;
    }

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const text = textEl.value.trim();

    const templateParams = buildEmailTemplateParams({
      name,
      email,
      message: text,
    });

    setSending(true);
    setErr(errSubmit, "");

    try {
      await sendContactEmail(templateParams);

      nameEl.value = "";
      emailEl.value = "";
      textEl.value = "";
      setErr(errName, "");
      setErr(errEmail, "");
      setErr(errText, "");
      showSuccessModal();
    } catch (err) {
      const detail = formatEmailJsError(err);
      if (typeof console !== "undefined" && console.error) {
        console.error("[EmailJS] send() failed — full error object:", err);
        if (detail) console.error("[EmailJS] API message (trimmed for UI):", detail);
      }
      const userMsg = detail
        ? `Couldn’t send your message. ${detail}`
        : "Couldn’t send your message. Please try again or use the email link above.";
      toast(
        detail && detail.length <= 72 ? userMsg : "Couldn’t send your message. Please try again.",
        { variant: "error" }
      );
      setErr(errSubmit, userMsg);
      triggerFormShake();
    } finally {
      setSending(false);
    }
  });

  clearBtn?.addEventListener("click", () => {
    if (nameEl) nameEl.value = "";
    if (emailEl) emailEl.value = "";
    if (textEl) textEl.value = "";
    setErr(errName, "");
    setErr(errEmail, "");
    setErr(errText, "");
    setErr(errSubmit, "");
    toast("Cleared.");
  });
}

const WELCOME_TITLE = "Diksha's Portfolio";
const WELCOME_SHOW_MS = 2800;
const WELCOME_EXIT_MS = 580;

function setupWelcomeSplash() {
  const root = document.getElementById("welcomeSplash");
  if (!root) return;

  const titleEl = $("welcomeSplashTitle");
  const cursorEl = $("welcomeSplashCursor");

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduced) {
    root.remove();
    document.documentElement.classList.remove("welcome-html-lock");
    document.body.classList.remove("welcome-splash-active");
    document.body.classList.add("welcome-splash-done");
    return;
  }

  document.body.classList.add("welcome-splash-active");

  const typeTitle = () => {
    if (!titleEl) return;
    let i = 0;
    const step = () => {
      if (i < WELCOME_TITLE.length) {
        titleEl.textContent = WELCOME_TITLE.slice(0, i + 1);
        i += 1;
        window.setTimeout(step, i === 1 ? 140 : 38 + Math.random() * 26);
      } else if (cursorEl) {
        cursorEl.classList.add("welcome-splash__cursor--hide");
      }
    };
    step();
  };

  window.requestAnimationFrame(typeTitle);

  window.setTimeout(() => {
    root.classList.add("welcome-splash--exit");
    window.setTimeout(() => {
      root.remove();
      document.documentElement.classList.remove("welcome-html-lock");
      document.body.classList.remove("welcome-splash-active");
      document.body.classList.add("welcome-splash-done");
    }, WELCOME_EXIT_MS);
  }, WELCOME_SHOW_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  setupWelcomeSplash();

  const yearEl = $("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (typeof emailjs !== "undefined" && isValidConfig() && !initEmailJsIfValid()) {
    console.error("[EmailJS] Could not initialize on load. The form will try again when you submit.");
  } else if (typeof emailjs === "undefined") {
    console.error("[EmailJS] Global `emailjs` missing — check that the CDN script loads before app.js.");
  }

  setTheme(getPreferredTheme());
  $("themeBtn")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    setTheme(current === "light" ? "dark" : "light");
  });

  $("copyEmailBtn")?.addEventListener("click", async () => {
    const ok = await copyToClipboard(PROFILE.email);
    toast(ok ? "Email copied." : `Copy this: ${PROFILE.email}`);
  });

  const grid = $("projectGrid");
  if (grid) {
    PROJECTS.forEach((p) => grid.appendChild(createProjectCard(p)));
  }

  const skillRoot = $("skillCategories");
  if (skillRoot) {
    SKILL_GROUPS.forEach((g) => skillRoot.appendChild(createSkillCategory(g)));
  }

  const modal = $("projectModal");
  modal?.addEventListener("click", (e) => {
    const rect = modal.getBoundingClientRect();
    const inDialog =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inDialog) modal.close();
  });

  setupScrollProgress();
  setupTypingAnimation();
  setupRevealAnimations();
  setupMobileMenu();
  setupResumeButtons();
  setupParallax();
  setupContactForm();
});

