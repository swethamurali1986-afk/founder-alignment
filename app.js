const founders = ["F1", "F2", "F3", "F4"];
const legacyKeys = ["founder-alignment-workshop-v3", "founder-alignment-canvas-v2", "founder-alignment-canvas-v1"];
const sharedApi = "/.netlify/functions/alignment";
const suppliedTeamId = new URL(window.location.href).searchParams.has("team");
const teamId = getTeamId();
const storageKey = `founder-alignment-workshop-v4:${teamId}`;
let saveTimer;
let pendingFounderIds = new Set();

const options = {
  registrationRules: [
    ["Company structure", ["Private Limited", "LLP", "Partnership first", "Not sure"]],
    ["Registered office", ["Founder address", "Rented office", "Virtual office", "Decide later"]],
    ["Company name readiness", ["Name finalized", "2-3 options ready", "Need trademark check", "Not decided"]],
    ["First directors", ["All 4 founders", "2 founders", "CEO plus one founder", "Decide later"]],
    ["Bank account signing", ["Any one founder", "Any two founders", "CEO + finance owner", "All founders"]],
  ],
  buildingRules: [
    ["Company type", ["SaaS Product", "AI Product Company", "Product Studio", "Consulting + Product", "Marketplace", "Other"]],
  ],
  primaryGoals: ["Wealth Creation", "Solving a Problem", "Building Something Together", "Innovation", "Legacy"],
  visionRules: [
    ["3-year goal", ["First Rs 1 Cr Revenue", "Rs 5 Cr Revenue", "Rs 10 Cr Revenue", "Sustainable Business", "Acquisition", "Other"]],
    ["10-year goal", ["Industry Leader", "Product Portfolio Company", "Large Enterprise", "Lifestyle Business", "Other"]],
  ],
  commitmentTiming: ["Full Time", "Within 6 Months", "Within 12 Months", "Part Time"],
  weeklyCommitment: ["<10 Hrs", "10-20 Hrs", "20-40 Hrs", "40+ Hrs"],
  roles: ["CEO", "Technology", "Product", "Sales", "Finance", "Compliance"],
  equalOwnershipRules: [
    ["Equity split", ["25% each confirmed", "Equal now, revisit later", "Need legal advice"]],
    ["Investment split", ["25% each confirmed", "Equal up to agreed cap", "Case by case", "Need legal advice"]],
    ["If someone cannot fund their share", ["Founder loan", "Temporary dilution", "Company loan", "Pause decision"]],
    ["Vesting on equal equity", ["4 years with 1 year cliff", "3 years with 1 year cliff", "No vesting", "Need legal advice"]],
    ["Founder leaving before vesting", ["Company buyback", "Founder buyback", "Keep vested shares only", "Not defined"]],
  ],
  fundingRules: [
    ["Funding strategy", ["Bootstrap", "Angel Funding", "Venture Capital", "Customer Funded", "Not Decided"]],
    ["Before revenue salary", ["No Salary", "Small Stipend", "Part Salary", "Full Salary"]],
    ["After revenue salary", ["Market Salary", "Below Market Salary", "Profit Sharing", "To Be Decided"]],
    ["Pre-incorporation expenses", ["Reimburse equally", "Convert to founder loan", "Treat as capital", "Case by case"]],
    ["Spending approval limit", ["Rs 50K", "Rs 1L", "Rs 5L", "Rs 10L"]],
  ],
  personalInvestment: ["Rs 0", "Rs 1L", "Rs 5L", "Rs 10L+"],
  decisionRules: [
    ["Hiring employees", ["CEO", "Majority Vote", "Unanimous"]],
    ["Raising funding", ["CEO", "Majority Vote", "Unanimous"]],
    ["Adding new founder", ["CEO", "Majority Vote", "Unanimous"]],
    ["Spending above Rs 5 lakhs", ["CEO", "Majority Vote", "Unanimous"]],
    ["Selling company", ["CEO", "Majority Vote", "Unanimous"]],
    ["2 vs 2 deadlock", ["CEO decides", "Independent advisor", "Independent board member", "Pause decision"]],
  ],
  scenarioRules: [
    ["Founder leaves within 12 months", ["Keeps All Shares", "Keeps Vested Shares Only", "Company Buyback", "Case-by-Case"]],
    ["Founder stops contributing", ["No Action", "Vesting Pause", "Equity Review", "Removal Discussion"]],
    ["Founder accepts another job", ["Allowed", "Allowed With Approval", "Not Allowed"]],
    ["Founder underperforms", ["Coaching", "Role Change", "Equity Adjustment", "Removal Process"]],
  ],
  productRules: [
    ["How many products?", ["One Product", "Multiple Products", "Product Studio"]],
    ["Who can propose new products?", ["Anyone", "Leadership Team", "CEO Only"]],
    ["Approval needed for new product?", ["CEO", "Majority Vote", "Unanimous"]],
  ],
  legalRules: [
    ["Founder agreement timing", ["Before registration", "Within 30 days", "After first funding", "Not sure"]],
    ["IP created before company", ["Assigned to company", "Licensed to company", "Founder retains", "Not sure"]],
    ["IP created after company", ["Company owns", "Creator licenses to company", "Case by case", "Not sure"]],
    ["Confidentiality agreement", ["Before registration", "At registration", "After registration", "Not needed"]],
    ["Side projects allowed?", ["No", "Yes with disclosure", "Yes if non-competing", "Case by case"]],
    ["Related-party transactions", ["Disclose and approve", "Avoid entirely", "CEO decides", "Not defined"]],
    ["Conflict resolution", ["Mediator", "Advisor", "Board vote", "Legal process"]],
    ["Expected exit horizon", ["Lifestyle business", "5-7 years", "7-10 years", "No fixed horizon"]],
  ],
};

let activeFounder = "F1";
let state = loadState();

function emptyFounder() {
  return {
    name: "",
    email: "",
    companyName: "",
    workshopDate: "",
    buildingNotes: "",
    registrationRules: mapFromRules(options.registrationRules),
    buildingRules: mapFromRules(options.buildingRules),
    primaryGoals: [],
    visionRules: mapFromRules(options.visionRules),
    commitmentTiming: "",
    weeklyCommitment: Object.fromEntries(founders.map((id) => [id, ""])),
    roles: Object.fromEntries(options.roles.map((role) => [role, []])),
    equalOwnershipRules: mapFromRules(options.equalOwnershipRules),
    fundingRules: mapFromRules(options.fundingRules),
    personalInvestment: Object.fromEntries(founders.map((id) => [id, ""])),
    decisionRules: mapFromRules(options.decisionRules),
    scenarioRules: mapFromRules(options.scenarioRules),
    productRules: mapFromRules(options.productRules),
    legalRules: mapFromRules(options.legalRules),
    notes: "",
  };
}

function mapFromRules(rules) {
  return Object.fromEntries(rules.map(([rule]) => [rule, ""]));
}

function loadState() {
  const fallback = { founders: Object.fromEntries(founders.map((id) => [id, emptyFounder()])) };
  try {
    const legacy = suppliedTeamId ? null : legacyKeys.map((key) => localStorage.getItem(key)).find(Boolean);
    const raw = localStorage.getItem(storageKey) || legacy;
    const saved = JSON.parse(raw);
    if (!saved || !saved.founders) return fallback;
    founders.forEach((id) => {
      saved.founders[id] = mergeFounder(saved.founders[id] || {});
    });
    return saved;
  } catch {
    return fallback;
  }
}

function mergeFounder(saved) {
  const base = emptyFounder();
  return {
    ...base,
    ...saved,
    registrationRules: { ...base.registrationRules, ...(saved.registrationRules || {}) },
    buildingRules: { ...base.buildingRules, ...(saved.buildingRules || {}) },
    primaryGoals: Array.isArray(saved.primaryGoals) ? saved.primaryGoals : [],
    visionRules: { ...base.visionRules, ...(saved.visionRules || {}) },
    commitmentTiming: mergeCommitmentTiming(saved.commitmentTiming),
    weeklyCommitment: { ...base.weeklyCommitment, ...(saved.weeklyCommitment || {}) },
    roles: mergeRoles(base.roles, saved.roles || saved.functions || {}),
    equalOwnershipRules: { ...base.equalOwnershipRules, ...(saved.equalOwnershipRules || {}) },
    fundingRules: { ...base.fundingRules, ...(saved.fundingRules || {}) },
    personalInvestment: { ...base.personalInvestment, ...(saved.personalInvestment || {}) },
    decisionRules: { ...base.decisionRules, ...(saved.decisionRules || {}) },
    scenarioRules: { ...base.scenarioRules, ...(saved.scenarioRules || {}) },
    productRules: { ...base.productRules, ...(saved.productRules || {}) },
    legalRules: { ...base.legalRules, ...(saved.legalRules || {}) },
  };
}

function mergeCommitmentTiming(saved) {
  if (typeof saved === "string") return saved;
  if (saved && typeof saved === "object") return Object.values(saved).find(Boolean) || "";
  return "";
}

function getTeamId() {
  const url = new URL(window.location.href);
  let id = url.searchParams.get("team");
  if (!id || !/^[a-z0-9-]{6,48}$/i.test(id)) {
    id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    url.searchParams.set("team", id);
    window.history.replaceState({}, "", url);
  }
  return id.toLowerCase();
}

function mergeRoles(baseRoles, savedRoles) {
  return Object.fromEntries(Object.keys(baseRoles).map((role) => {
    const saved = savedRoles[role] ?? "";
    return [role, Array.isArray(saved) ? saved : saved ? [saved] : []];
  }));
}

function founderData(id = activeFounder) {
  return state.founders[id];
}

function founderLabel(id) {
  const name = founderData(id).name.trim();
  return name ? `${id} - ${name}` : id;
}

function saveState(founderIds = [activeFounder]) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  founderIds.forEach((id) => pendingFounderIds.add(id));
  document.querySelector("#saveState").textContent = "Saving to shared workspace...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSharedState, 700);
}

async function saveSharedState() {
  const founderIds = [...pendingFounderIds];
  pendingFounderIds = new Set();
  if (!founderIds.length) return;
  try {
    const response = await fetch(sharedApi, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teamId,
        founders: Object.fromEntries(founderIds.map((id) => [id, founderData(id)])),
      }),
    });
    if (!response.ok) throw new Error(`Save failed (${response.status})`);
    document.querySelector("#saveState").textContent = `Shared save ${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch (error) {
    founderIds.forEach((id) => pendingFounderIds.add(id));
    document.querySelector("#saveState").textContent = "Cloud unavailable - saved on this device";
    console.error(error);
  }
}

async function loadSharedState() {
  document.querySelector("#saveState").textContent = "Loading shared workspace...";
  try {
    const response = await fetch(`${sharedApi}?team=${encodeURIComponent(teamId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Load failed (${response.status})`);
    const shared = await response.json();
    const sharedIds = founders.filter((id) => shared.founders?.[id]);
    founders.forEach((id) => {
      if (shared.founders?.[id]) state.founders[id] = mergeFounder(shared.founders[id]);
    });
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderFounder();
    if (!sharedIds.length && !suppliedTeamId && answeredFounders().length) {
      saveState(founders);
    } else {
      document.querySelector("#saveState").textContent = "Shared workspace loaded";
    }
  } catch (error) {
    document.querySelector("#saveState").textContent = "Offline - using this device's saved copy";
    console.error(error);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function makeSelect(choices) {
  return [`<option value="">Choose...</option>`, ...choices.map((choice) => (
    `<option value="${escapeHtml(choice)}">${escapeHtml(choice)}</option>`
  ))].join("");
}

function renderStaticControls() {
  document.querySelector("#teamNames").innerHTML = founders.map((id) => `
    <label class="field">
      <span>${id} name</span>
      <input data-team-name="${id}" type="text" placeholder="Founder name" />
    </label>
  `).join("");

  renderRuleSelects("registrationRules", options.registrationRules, "registrationRule");
  renderRuleSelects("buildingRules", options.buildingRules, "buildingRule");
  document.querySelector("#primaryGoals").innerHTML = options.primaryGoals.map((goal) => `
    <label><input type="checkbox" name="primaryGoals" value="${escapeHtml(goal)}" /> ${escapeHtml(goal)}</label>
  `).join("");
  renderRuleSelects("visionRules", options.visionRules, "visionRule");
  renderRuleSelects("equalOwnershipRules", options.equalOwnershipRules, "equalOwnershipRule");
  renderRuleSelects("fundingRules", options.fundingRules, "fundingRule");
  renderRuleSelects("decisionRules", options.decisionRules, "decisionRule");
  renderRuleSelects("scenarioRules", options.scenarioRules, "scenarioRule");
  renderRuleSelects("productRules", options.productRules, "productRule");
  renderRuleSelects("legalRules", options.legalRules, "legalRule");

  document.querySelector("#commitmentMatrix").innerHTML = `
    <label class="field">
      <span>Full-time timing</span>
      <select data-field="commitmentTiming">${makeSelect(options.commitmentTiming)}</select>
    </label>
    ${renderFounderMatrix("Weekly commitment", "weeklyCommitment", options.weeklyCommitment)}
  `;
  document.querySelector("#investmentMatrix").innerHTML = renderFounderMatrix(
    "Personal investment",
    "personalInvestment",
    options.personalInvestment,
  );
}

function renderRuleSelects(containerId, rules, datasetName) {
  document.querySelector(`#${containerId}`).innerHTML = rules.map(([rule, choices]) => `
    <label class="field">
      <span>${escapeHtml(rule)}</span>
      <select data-${kebab(datasetName)}="${escapeHtml(rule)}">${makeSelect(choices)}</select>
    </label>
  `).join("");
}

function renderFounderMatrix(title, group, choices) {
  return `
    <div class="matrix-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="matrix-rows">
        ${founders.map((id) => `
          <label class="field">
            <span>${escapeHtml(founderLabel(id))}</span>
            <select data-founder-map="${group}" data-founder-id="${id}">${makeSelect(choices)}</select>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function renderFounderOptions() {
  document.querySelectorAll("[data-founder-label]").forEach((label) => {
    label.textContent = founderLabel(label.dataset.founderLabel);
  });

  document.querySelector("#rolesList").innerHTML = options.roles.map((role) => `
    <fieldset class="role-card">
      <legend>${escapeHtml(role)}</legend>
      <div class="role-options">
        ${founders.map((id) => `
          <label>
            <input type="checkbox" data-role="${escapeHtml(role)}" value="${id}" />
            <span>${escapeHtml(founderLabel(id))}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `).join("");

  document.querySelectorAll("[data-founder-id]").forEach((select) => {
    const label = select.closest(".field").querySelector("span");
    label.textContent = founderLabel(select.dataset.founderId);
  });
}

function renderFounder() {
  const data = founderData();
  renderFounderOptions();

  document.querySelectorAll("[data-team-name]").forEach((input) => {
    input.value = founderData(input.dataset.teamName).name || "";
  });
  document.querySelector("#founderName").value = data.name || "";
  document.querySelector("#founderEmail").value = data.email || "";
  setField("companyName", data.companyName);
  setField("workshopDate", data.workshopDate);
  setField("buildingNotes", data.buildingNotes);
  setField("commitmentTiming", data.commitmentTiming);
  setField("notes", data.notes);

  setMappedValues("[data-registration-rule]", "registrationRule", data.registrationRules);
  setMappedValues("[data-building-rule]", "buildingRule", data.buildingRules);
  setMultiChecked("primaryGoals", data.primaryGoals);
  setMappedValues("[data-vision-rule]", "visionRule", data.visionRules);
  setMappedValues("[data-equal-ownership-rule]", "equalOwnershipRule", data.equalOwnershipRules);
  setMappedValues("[data-funding-rule]", "fundingRule", data.fundingRules);
  setMappedValues("[data-decision-rule]", "decisionRule", data.decisionRules);
  setMappedValues("[data-scenario-rule]", "scenarioRule", data.scenarioRules);
  setMappedValues("[data-product-rule]", "productRule", data.productRules);
  setMappedValues("[data-legal-rule]", "legalRule", data.legalRules);
  document.querySelectorAll("[data-role]").forEach((input) => {
    input.checked = (data.roles[input.dataset.role] || []).includes(input.value);
  });

  document.querySelectorAll("[data-founder-map]").forEach((select) => {
    select.value = data[select.dataset.founderMap][select.dataset.founderId] || "";
  });

  updateProgress();
  renderAlignmentScore();
}

function setField(field, value = "") {
  const el = document.querySelector(`[data-field="${field}"]`);
  if (el) el.value = value || "";
}

function setMappedValues(selector, key, values = {}) {
  document.querySelectorAll(selector).forEach((input) => {
    input.value = values[input.dataset[key]] ?? "";
  });
}

function setMultiChecked(name, values = []) {
  document.querySelectorAll(`[name="${name}"]`).forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function answeredFounders() {
  return founders.filter((id) => {
    const data = founderData(id);
    return [
      data.companyName,
      ...Object.values(data.registrationRules),
      ...Object.values(data.buildingRules),
      data.primaryGoals.length,
      ...Object.values(data.visionRules),
      data.commitmentTiming,
      ...Object.values(data.weeklyCommitment),
      ...Object.values(data.roles).flat(),
      ...Object.values(data.equalOwnershipRules),
      ...Object.values(data.fundingRules),
      ...Object.values(data.personalInvestment),
      ...Object.values(data.decisionRules),
      ...Object.values(data.scenarioRules),
      ...Object.values(data.productRules),
      ...Object.values(data.legalRules),
    ].some(Boolean);
  });
}

function renderAlignmentScore() {
  const ids = answeredFounders();
  const details = buildAlignmentDetails(ids);
  const score = details.length ? Math.round(details.reduce((sum, item) => sum + item.score, 0) / details.length) : 0;

  document.querySelector("#readinessTotal").textContent = `${score} / 100`;
  document.querySelector("#readinessLabel").textContent = readinessLabel(score, ids.length);
  document.querySelector(".score-hero").className = `score-hero ${score >= 85 ? "ready" : score >= 70 ? "warning" : "error"}`;
  document.querySelector("#alignmentDetails").innerHTML = details.map((item) => `
    <article class="alignment-item">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.note)}</span>
      </div>
      <b>${item.score}</b>
    </article>
  `).join("");
}

function buildAlignmentDetails(ids) {
  return [
    mapItem("What Are We Building", ids, (data) => data.buildingRules),
    overlapItem("Primary Goals", ids, (data) => data.primaryGoals),
    mapItem("Vision", ids, (data) => data.visionRules),
    alignmentItem("Full-time Timing", ids, (data) => data.commitmentTiming),
    mapItem("Weekly Commitment", ids, (data) => data.weeklyCommitment),
    mapOverlapItem("Roles", ids, (data) => data.roles),
    mapItem("Equal Equity & Investment", ids, (data) => data.equalOwnershipRules),
    mapItem("Funding & Salary", ids, (data) => data.fundingRules),
    mapItem("Personal Investment", ids, (data) => data.personalInvestment),
    mapItem("Decision Making", ids, (data) => data.decisionRules),
    mapItem("Difficult Scenarios", ids, (data) => data.scenarioRules),
    mapItem("Product Strategy", ids, (data) => data.productRules),
    mapItem("Legal & Exit Basics", ids, (data) => data.legalRules),
  ];
}

function alignmentItem(name, ids, getter) {
  const values = ids.map((id) => getter(founderData(id))).filter(Boolean);
  if (values.length < 2) return { name, score: 0, note: "Needs more answers" };
  return { name, score: scoreFromValues(values).score, note: "Agreement across founder responses" };
}

function readinessLabel(score, count) {
  if (count < 2) return "Waiting for at least two founder responses";
  if (score >= 85) return "High alignment";
  if (score >= 70) return "Some disagreements to resolve";
  return "Major alignment work needed";
}

function mapItem(name, ids, getter) {
  const template = getter(founderData(founders[0]));
  const scores = Object.keys(template).map((key) => {
    const values = ids.map((id) => getter(founderData(id))[key]).filter(Boolean);
    return scoreFromValues(values).score;
  });
  const validScores = scores.filter((score) => Number.isFinite(score));
  if (!validScores.length) return { name, score: 0, note: "Needs more answers" };
  return {
    name,
    score: Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length),
    note: "Average across forced-choice answers",
  };
}

function mapOverlapItem(name, ids, getter) {
  const template = getter(founderData(founders[0]));
  const scores = Object.keys(template).map((key) => {
    const values = ids.map((id) => getter(founderData(id))[key]).filter((value) => value.length);
    if (values.length < 2) return 0;
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) {
        const left = new Set(values[i]);
        const right = new Set(values[j]);
        const union = new Set([...left, ...right]);
        const intersection = [...left].filter((item) => right.has(item));
        total += union.size ? (intersection.length / union.size) * 100 : 0;
        pairs += 1;
      }
    }
    return Math.round(total / pairs);
  });
  const validScores = scores.filter((score) => Number.isFinite(score));
  if (!validScores.length) return { name, score: 0, note: "Needs more answers" };
  return {
    name,
    score: Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length),
    note: "Average overlap across responsibility owners",
  };
}

function overlapItem(name, ids, getter) {
  const sets = ids.map((id) => new Set(getter(founderData(id)))).filter((set) => set.size);
  if (sets.length < 2) return { name, score: 0, note: "Needs more answers" };
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const union = new Set([...sets[i], ...sets[j]]);
      const intersection = [...sets[i]].filter((item) => sets[j].has(item));
      total += union.size ? (intersection.length / union.size) * 100 : 0;
      pairs += 1;
    }
  }
  return { name, score: Math.round(total / pairs), note: "Overlap across selected goals" };
}

function scoreFromValues(values) {
  if (values.length < 2) return { score: 0 };
  const counts = values.reduce((map, value) => {
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});
  return { score: Math.round((Math.max(...Object.values(counts)) / values.length) * 100) };
}

function updateProgress() {
  const data = founderData();
  const checks = [
    data.name,
    data.email,
    data.companyName,
    data.workshopDate,
    Object.values(data.registrationRules).every(Boolean),
    Object.values(data.buildingRules).every(Boolean),
    data.primaryGoals.length > 0,
    Object.values(data.visionRules).every(Boolean),
    data.commitmentTiming,
    Object.values(data.weeklyCommitment).every(Boolean),
    Object.values(data.roles).filter((owners) => owners.length).length >= 4,
    Object.values(data.equalOwnershipRules).every(Boolean),
    Object.values(data.fundingRules).every(Boolean),
    Object.values(data.personalInvestment).every(Boolean),
    Object.values(data.decisionRules).every(Boolean),
    Object.values(data.scenarioRules).every(Boolean),
    Object.values(data.productRules).every(Boolean),
    Object.values(data.legalRules).every(Boolean),
  ];
  const percent = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  document.querySelector("#progressText").textContent = `${percent}%`;
  document.querySelector("#progressBar").style.width = `${percent}%`;
}

function bindEvents() {
  document.querySelectorAll('[name="founder"]').forEach((input) => {
    input.addEventListener("change", () => {
      activeFounder = input.value;
      renderFounder();
    });
  });

  document.querySelector("#teamNames").addEventListener("input", (event) => {
    if (!event.target.dataset.teamName) return;
    const id = event.target.dataset.teamName;
    founderData(id).name = event.target.value;
    if (id === activeFounder) document.querySelector("#founderName").value = event.target.value;
    renderFounder();
    afterChange([id]);
  });

  document.querySelector("#founderName").addEventListener("input", (event) => {
    founderData().name = event.target.value;
    document.querySelector(`[data-team-name="${activeFounder}"]`).value = event.target.value;
    renderFounder();
    afterChange();
  });
  document.querySelector("#founderEmail").addEventListener("input", (event) => updateSimple("email", event.target.value));

  const handleFormEdit = (event) => {
    const target = event.target;
    if (target.dataset.field) updateSimple(target.dataset.field, target.value);
    if (target.name === "primaryGoals") {
      const selected = [...document.querySelectorAll('[name="primaryGoals"]:checked')].map((input) => input.value);
      if (selected.length > 2) {
        target.checked = false;
        return;
      }
      founderData().primaryGoals = selected;
      afterChange();
    }
    if (target.dataset.role) {
      founderData().roles[target.dataset.role] = [...document.querySelectorAll(`[data-role="${target.dataset.role}"]:checked`)]
        .map((input) => input.value);
      afterChange();
      return;
    }
    updateRule(target, "registrationRule", "registrationRules");
    updateRule(target, "buildingRule", "buildingRules");
    updateRule(target, "visionRule", "visionRules");
    updateRule(target, "equalOwnershipRule", "equalOwnershipRules");
    updateRule(target, "fundingRule", "fundingRules");
    updateRule(target, "decisionRule", "decisionRules");
    updateRule(target, "scenarioRule", "scenarioRules");
    updateRule(target, "productRule", "productRules");
    updateRule(target, "legalRule", "legalRules");
    if (target.dataset.founderMap) {
      founderData()[target.dataset.founderMap][target.dataset.founderId] = target.value;
      afterChange();
    }
  };

  document.querySelector("#canvasForm").addEventListener("input", handleFormEdit);
  document.querySelector("#canvasForm").addEventListener("change", handleFormEdit);
  document.querySelector("#exportBtn").addEventListener("click", exportJson);
  document.querySelector("#importInput").addEventListener("change", importJson);
  document.querySelector("#printBtn").addEventListener("click", () => window.print());
  document.querySelector("#copyLinkBtn").addEventListener("click", copyTeamLink);
  document.querySelector("#refreshBtn").addEventListener("click", loadSharedState);
}

function updateRule(target, dataKey, group) {
  if (!target.dataset[dataKey]) return;
  founderData()[group][target.dataset[dataKey]] = target.value;
  afterChange();
}

function updateSimple(key, value) {
  founderData()[key] = value;
  afterChange();
}

function afterChange(founderIds = [activeFounder]) {
  updateProgress();
  renderAlignmentScore();
  saveState(founderIds);
}

async function copyTeamLink() {
  const button = document.querySelector("#copyLinkBtn");
  try {
    await navigator.clipboard.writeText(window.location.href);
    button.textContent = "Link copied";
  } catch {
    window.prompt("Copy this team link:", window.location.href);
  }
  setTimeout(() => { button.textContent = "Copy team link"; }, 1600);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `founder-alignment-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.founders) throw new Error("Missing founders data");
      founders.forEach((id) => {
        imported.founders[id] = mergeFounder(imported.founders[id] || {});
      });
      state = imported;
      saveState(founders);
      renderFounder();
    } catch (error) {
      alert(`Could not import this file: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

renderStaticControls();
bindEvents();
renderFounder();
loadSharedState();
