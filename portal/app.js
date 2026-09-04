/**
 * Robotics Lab Learning Portal - Client Application with 10-Level HUD, Sidebar Toggle, & Practice Challenges
 */

let lessons = (typeof PORTAL_DATA !== "undefined" && PORTAL_DATA.lessons) ? PORTAL_DATA.lessons : [];
let glossary = (typeof PORTAL_DATA !== "undefined" && PORTAL_DATA.glossary) ? PORTAL_DATA.glossary : [];
let dailyMissions = (typeof PORTAL_DATA !== "undefined" && PORTAL_DATA.daily_missions) ? PORTAL_DATA.daily_missions : [];
let practiceChallenges = (typeof PORTAL_DATA !== "undefined" && PORTAL_DATA.practice_challenges) ? PORTAL_DATA.practice_challenges : [];

let currentLessonId = "1.1";
let completedLessons = { "1.1": true, "1.2": true, "1.3": true, "1.4": true, "1.5": true };
let quizCompleted = {};
let dailyCompleted = {};
let practiceSolved = {};
let globalScratchpad = "";
let isSidebarCollapsed = false;
let saveTimeout = null;

// 10-Level Calibrated Progression Ladder
const RANKS = [
  { level: 1, name: "NOVICE", minXp: 0, maxXp: 150 },
  { level: 2, name: "APPRENTICE", minXp: 151, maxXp: 350 },
  { level: 3, name: "TINKERER", minXp: 351, maxXp: 650 },
  { level: 4, name: "KINEMATICIAN", minXp: 651, maxXp: 1050 },
  { level: 5, name: "DYNAMICS SPECIALIST", minXp: 1051, maxXp: 1550 },
  { level: 6, name: "CONTROLS ENGINEER", minXp: 1551, maxXp: 2150 },
  { level: 7, name: "VISION INTEGRATOR", minXp: 2151, maxXp: 2850 },
  { level: 8, name: "BIPEDAL STRATEGIST", minXp: 2851, maxXp: 3650 },
  { level: 9, name: "HUMANOID ARCHITECT", minXp: 3651, maxXp: 4550 },
  { level: 10, name: "UNIBOT GRANDMASTER", minXp: 4551, maxXp: 6000 }
];

// Initialize Application
async function initApp() {
  try {
    loadLocalState();
    updateDailyStreak();
    setupEventListeners();
    renderRoadmap();
    renderDailyMissions();
    renderPracticeChallenges();
    renderGlossary();
    selectLesson(currentLessonId, false);
    updateGamificationHUD();
    checkDiskSync();
    showOverviewView();
  } catch (err) {
    console.error("Critical error in initApp:", err);
  }
}

// Daily Streak Tracker & Login History
function updateDailyStreak() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    let history = [];
    const historyRaw = localStorage.getItem("robotics_login_history");
    if (historyRaw) {
      try { history = JSON.parse(historyRaw); } catch (e) { history = []; }
    }
    if (!history.includes(today)) {
      history.push(today);
      localStorage.setItem("robotics_login_history", JSON.stringify(history));
    }

    // Compute streak from chronological login history with a 5-day grace window
    // (allows taking weekends or short study breaks without losing your hard-earned streak)
    const sorted = [...new Set(history)].sort();
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 5) {
        streak += 1;
      } else if (diffDays > 5) {
        streak = 1;
      }
    }

    localStorage.setItem("robotics_last_login_date", today);
    localStorage.setItem("robotics_daily_streak", streak.toString());

    const el = document.getElementById("hudStreakCount");
    if (el) el.textContent = `${streak}`;
  } catch (err) {
    console.warn("Could not update streak:", err);
  }
}

// Render Duolingo / LeetCode style Streak Calendar
function renderStreakCalendar() {
  const grid = document.getElementById("calendarGrid");
  const monthTitle = document.getElementById("calendarMonthTitle");
  const bigNum = document.getElementById("streakBigNumber");
  const totalEl = document.getElementById("streakTotalDays");
  if (!grid) return;
  grid.innerHTML = "";

  const streak = parseInt(localStorage.getItem("robotics_daily_streak") || "1", 10);
  if (bigNum) bigNum.textContent = `${streak} ${streak === 1 ? "Day" : "Days"}`;

  let history = [];
  const historyRaw = localStorage.getItem("robotics_login_history");
  if (historyRaw) {
    try { history = JSON.parse(historyRaw); } catch (e) { history = []; }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (!history.includes(todayStr)) {
    history.push(todayStr);
    localStorage.setItem("robotics_login_history", JSON.stringify(history));
  }

  if (totalEl) {
    totalEl.textContent = `${history.length} ${history.length === 1 ? "day" : "days"} active`;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  if (monthTitle) monthTitle.textContent = `${monthNames[month]} ${year}`;

  // First day of current month (0 = Sunday, 1 = Monday, ...)
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset === -1) startOffset = 6; // Sunday becomes index 6 in M-T-W-T-F-S-S

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before 1st of month
  for (let i = 0; i < startOffset; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty";
    grid.appendChild(emptyCell);
  }

  // Days of month
  const todayDay = now.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.textContent = day;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (history.includes(dateStr)) {
      cell.classList.add("active-streak");
    }

    if (day === todayDay) {
      cell.classList.add("today");
    }

    grid.appendChild(cell);
  }
}

// Load saved user state from browser localStorage
function loadLocalState() {
  try {
    const savedProgress = localStorage.getItem("robotics_progress");
    if (savedProgress) completedLessons = JSON.parse(savedProgress);

    const savedQuizzes = localStorage.getItem("robotics_quiz_completed");
    if (savedQuizzes) quizCompleted = JSON.parse(savedQuizzes);

    const savedDaily = localStorage.getItem("robotics_daily_completed");
    if (savedDaily) dailyCompleted = JSON.parse(savedDaily);

    const savedPracticeSolved = localStorage.getItem("robotics_practice_solved");
    if (savedPracticeSolved) practiceSolved = JSON.parse(savedPracticeSolved);

    const savedScratchpad = localStorage.getItem("robotics_global_scratchpad");
    if (savedScratchpad) {
      globalScratchpad = savedScratchpad;
      const scratchpadEl = document.getElementById("globalScratchpadInput");
      if (scratchpadEl) scratchpadEl.value = globalScratchpad;
    }

    const savedSidebar = localStorage.getItem("robotics_sidebar_collapsed");
    if (savedSidebar === "true" || (savedSidebar === null && window.innerWidth <= 1050)) {
      isSidebarCollapsed = true;
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.add("collapsed");
    }

    const lastLesson = localStorage.getItem("robotics_last_lesson");
    if (lastLesson && lessons.some(l => l.id === lastLesson)) {
      currentLessonId = lastLesson;
    }
  } catch (e) {
    console.warn("Could not parse local storage state", e);
  }
}

// Gamification: Calculate XP and Level
function calculateTotalXP() {
  let total = 0;
  lessons.forEach(l => {
    if (completedLessons[l.id]) {
      total += (l.xp || 50);
    }
  });
  Object.keys(quizCompleted).forEach(qid => {
    if (quizCompleted[qid]) total += 25; // +25 XP per quiz
  });
  dailyMissions.forEach(m => {
    if (dailyCompleted[m.id]) total += (m.xp || 50);
  });
  practiceChallenges.forEach(p => {
    if (practiceSolved[p.id]) total += (p.xp || 40);
  });
  return total;
}

function updateGamificationHUD() {
  try {
    const currentXp = calculateTotalXP();
    let currentRank = RANKS[0];

    for (let i = 0; i < RANKS.length; i++) {
      if (currentXp >= RANKS[i].minXp) {
        currentRank = RANKS[i];
      }
    }

    const hudRankChip = document.getElementById("hudRankChip");
    const hudRankName = document.getElementById("hudRankName");
    const hudXpBar = document.getElementById("hudXpBar");
    const hudXpDigits = document.getElementById("hudXpDigits");

    if (hudRankChip) hudRankChip.textContent = `LVL ${currentRank.level}`;
    if (hudRankName) hudRankName.textContent = currentRank.name;

    const range = currentRank.maxXp - currentRank.minXp;
    const progressInLevel = Math.max(0, currentXp - currentRank.minXp);
    const pct = Math.min(100, Math.round((progressInLevel / range) * 100));

    if (hudXpBar) hudXpBar.style.width = `${pct}%`;
    if (hudXpDigits) hudXpDigits.textContent = `${currentXp} / ${currentRank.maxXp} XP`;
  } catch (e) {
    console.error("Error updating HUD:", e);
  }
}

// Show sleek toast notification
function showToast(message, type = "normal") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Toggle Sidebar Collapse
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  isSidebarCollapsed = !isSidebarCollapsed;
  sidebar.classList.toggle("collapsed", isSidebarCollapsed);
  localStorage.setItem("robotics_sidebar_collapsed", isSidebarCollapsed);
}

// Render Sidebar Navigation
function renderRoadmap() {
  const roadmapTree = document.getElementById("roadmapTree");
  if (!roadmapTree) return;
  roadmapTree.innerHTML = "";
  
  const phases = {};
  lessons.forEach(lesson => {
    if (!phases[lesson.phase]) phases[lesson.phase] = [];
    phases[lesson.phase].push(lesson);
  });

  for (const [phaseName, phaseLessons] of Object.entries(phases)) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "phase-group";

    const header = document.createElement("div");
    header.className = "phase-header";
    header.textContent = phaseName;
    groupDiv.appendChild(header);

    phaseLessons.forEach(l => {
      const item = document.createElement("div");
      item.className = `lesson-item ${l.id === currentLessonId ? "active" : ""}`;
      item.dataset.id = l.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "lesson-checkbox";
      checkbox.checked = !!completedLessons[l.id];
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasChecked = !!completedLessons[l.id];
        completedLessons[l.id] = checkbox.checked;
        localStorage.setItem("robotics_progress", JSON.stringify(completedLessons));
        
        if (!wasChecked && checkbox.checked) {
          showToast(`+${l.xp || 50} XP - Mission ${l.id} Completed!`, "xp");
        }
        updateGamificationHUD();
        saveNotesToDisk();
      });

      const label = document.createElement("span");
      label.className = "lesson-label";
      label.textContent = `${l.id} ${l.title}`;

      item.appendChild(checkbox);
      item.appendChild(label);

      item.addEventListener("click", () => {
        selectLesson(l.id);
      });

      groupDiv.appendChild(item);
    });

    roadmapTree.appendChild(groupDiv);
  }
}

// Render Daily Missions View
function renderDailyMissions() {
  const dailyGrid = document.getElementById("dailyGrid");
  if (!dailyGrid) return;
  dailyGrid.innerHTML = "";

  dailyMissions.forEach(m => {
    const card = document.createElement("div");
    card.className = `daily-card ${dailyCompleted[m.id] ? "done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!dailyCompleted[m.id];
    checkbox.addEventListener("click", () => {
      const wasDone = !!dailyCompleted[m.id];
      dailyCompleted[m.id] = checkbox.checked;
      localStorage.setItem("robotics_daily_completed", JSON.stringify(dailyCompleted));
      card.classList.toggle("done", checkbox.checked);

      if (!wasDone && checkbox.checked) {
        showToast(`+${m.xp || 50} XP - Daily Mission Completed!`, "xp");
      }
      updateGamificationHUD();
      saveNotesToDisk();
    });

    const contentDiv = document.createElement("div");
    contentDiv.className = "daily-content";

    const topRow = document.createElement("div");
    topRow.className = "daily-top-row";

    const title = document.createElement("span");
    title.className = "daily-title";
    title.textContent = `${m.id}: ${m.title}`;

    const xp = document.createElement("span");
    xp.className = "daily-xp";
    xp.textContent = `+${m.xp || 50} XP`;

    topRow.appendChild(title);
    topRow.appendChild(xp);

    const body = document.createElement("p");
    body.className = "daily-body";
    body.textContent = m.description;

    contentDiv.appendChild(topRow);
    contentDiv.appendChild(body);

    card.appendChild(checkbox);
    card.appendChild(contentDiv);

    dailyGrid.appendChild(card);
  });
}

// Render Interactive Verifiable Practice Challenges View
function renderPracticeChallenges() {
  const practiceGrid = document.getElementById("practiceGrid");
  if (!practiceGrid) return;
  practiceGrid.innerHTML = "";

  practiceChallenges.forEach(challenge => {
    const card = document.createElement("div");
    const isDone = !!practiceSolved[challenge.id];
    card.className = `practice-card ${isDone ? "done" : ""}`;

    // Top row: Type badge + XP
    const topRow = document.createElement("div");
    topRow.className = "practice-top-row";

    const typeTag = document.createElement("span");
    typeTag.className = `practice-type-tag ${challenge.type}`;
    typeTag.textContent = challenge.type === "quiz" ? "Quiz" : challenge.type === "fill_in" ? "Fill-in-the-gap" : "Physics Calc";

    const xp = document.createElement("span");
    xp.className = "practice-xp";
    xp.textContent = isDone ? "✓ Solved (+XP)" : `+${challenge.xp} XP`;

    topRow.appendChild(typeTag);
    topRow.appendChild(xp);
    card.appendChild(topRow);

    // Question Prompt (rendered with markdown)
    const prompt = document.createElement("div");
    prompt.className = "practice-prompt";
    prompt.innerHTML = (typeof marked !== "undefined") ? marked.parse(challenge.prompt || "") : challenge.prompt;
    card.appendChild(prompt);

    // Feedback element container
    const feedback = document.createElement("div");
    feedback.className = "practice-feedback";
    feedback.style.display = isDone ? "block" : "none";
    if (isDone) {
      feedback.className = "practice-feedback success";
      feedback.textContent = `✓ Solved! ${challenge.explanation || ""}`;
    }

    // Interactive input based on challenge type
    if (challenge.type === "quiz") {
      const optionsDiv = document.createElement("div");
      optionsDiv.className = "practice-options";

      challenge.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option-btn";
        btn.textContent = opt;
        if (isDone) {
          btn.disabled = true;
          if (idx === challenge.correct) btn.classList.add("correct");
        } else {
          btn.addEventListener("click", () => {
            if (idx === challenge.correct) {
              btn.classList.add("correct");
              feedback.className = "practice-feedback success";
              feedback.textContent = `✓ Correct! ${challenge.explanation}`;
              feedback.style.display = "block";
              practiceSolved[challenge.id] = true;
              localStorage.setItem("robotics_practice_solved", JSON.stringify(practiceSolved));
              card.classList.add("done");
              xp.textContent = "✓ Solved (+XP)";
              showToast(`+${challenge.xp} XP - Challenge Solved!`, "xp");
              updateGamificationHUD();
              optionsDiv.querySelectorAll("button").forEach(b => b.disabled = true);
            } else {
              btn.classList.add("incorrect");
              feedback.className = "practice-feedback error";
              feedback.textContent = "✗ Incorrect. Think carefully about the physics and try again.";
              feedback.style.display = "block";
            }
          });
        }
        optionsDiv.appendChild(btn);
      });
      card.appendChild(optionsDiv);
    } else {
      // fill_in or physics input row
      const inputRow = document.createElement("div");
      inputRow.className = "practice-input-row";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "practice-input";
      input.placeholder = challenge.placeholder || "Enter answer...";
      if (isDone) {
        input.value = challenge.answer;
        input.disabled = true;
      }

      const btn = document.createElement("button");
      btn.className = "practice-btn";
      btn.textContent = "Check Answer";
      if (isDone) btn.disabled = true;

      const verifyAnswer = () => {
        const raw = input.value.trim();
        if (!raw) return;

        let correct = false;
        if (challenge.type === "fill_in") {
          correct = raw.toLowerCase().replace(/['"]/g, "") === challenge.answer.toString().toLowerCase();
        } else if (challenge.type === "physics") {
          const val = parseFloat(raw.replace(/[^\d.-]/g, ""));
          if (!isNaN(val)) {
            const tol = challenge.tolerance || 0.02;
            correct = Math.abs(val - challenge.answer) <= tol;
          }
        }

        if (correct) {
          input.disabled = true;
          btn.disabled = true;
          feedback.className = "practice-feedback success";
          feedback.textContent = `✓ Correct! ${challenge.explanation}`;
          feedback.style.display = "block";
          practiceSolved[challenge.id] = true;
          localStorage.setItem("robotics_practice_solved", JSON.stringify(practiceSolved));
          card.classList.add("done");
          xp.textContent = "✓ Solved (+XP)";
          showToast(`+${challenge.xp} XP - Challenge Solved!`, "xp");
          updateGamificationHUD();
        } else {
          feedback.className = "practice-feedback error";
          feedback.textContent = "✗ Incorrect answer. Check your calculation and try again!";
          feedback.style.display = "block";
        }
      };

      btn.addEventListener("click", verifyAnswer);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") verifyAnswer();
      });

      inputRow.appendChild(input);
      inputRow.appendChild(btn);
      card.appendChild(inputRow);
    }

    card.appendChild(feedback);

    // Typeset KaTeX formulas in prompt if KaTeX is loaded
    if (typeof renderMathInElement === "function") {
      try {
        renderMathInElement(card, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn("KaTeX rendering error:", err);
      }
    }

    practiceGrid.appendChild(card);
  });
}

// Select and Display a Lesson
function selectLesson(id, shouldSwitchView = true) {
  currentLessonId = id;
  localStorage.setItem("robotics_last_lesson", id);

  document.querySelectorAll(".lesson-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
  });

  const lesson = lessons.find(l => l.id === id) || lessons[0];
  if (!lesson) return;

  const lessonPhase = document.getElementById("lessonPhase");
  const lessonId = document.getElementById("lessonId");
  const lessonXpTag = document.getElementById("lessonXpTag");
  const lessonTitle = document.getElementById("lessonTitle");
  const lessonStatusBadge = document.getElementById("lessonStatusBadge");
  const g1ConnectionBox = document.getElementById("g1ConnectionBox");
  const g1ConnectionBody = document.getElementById("g1ConnectionBody");
  const lessonContent = document.getElementById("lessonContent");

  if (lessonPhase) lessonPhase.textContent = lesson.phase;
  if (lessonId) lessonId.textContent = lesson.id;
  if (lessonXpTag) lessonXpTag.textContent = `+${lesson.xp || 50} XP`;
  if (lessonTitle) lessonTitle.textContent = lesson.title;

  // Status Badge
  const isDone = !!completedLessons[lesson.id];
  if (lessonStatusBadge) {
    lessonStatusBadge.className = `status-badge ${isDone ? "completed" : lesson.status || "pending"}`;
    lessonStatusBadge.textContent = isDone ? "COMPLETED" : (lesson.status || "PENDING").replace("_", " ").toUpperCase();
  }

  // The G1 Connection Box
  if (g1ConnectionBox && g1ConnectionBody) {
    if (lesson.g1_connection) {
      g1ConnectionBox.style.display = "block";
      g1ConnectionBody.textContent = lesson.g1_connection;
    } else {
      g1ConnectionBox.style.display = "none";
    }
  }

  // Render Markdown Content & KaTeX
  if (lessonContent) {
    lessonContent.innerHTML = (typeof marked !== "undefined" && marked.parse)
      ? marked.parse(lesson.content)
      : lesson.content;

    if (typeof renderMathInElement !== "undefined") {
      try {
        renderMathInElement(lessonContent, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      } catch (e) {
        console.warn("KaTeX error:", e);
      }
    }
  }

  // Render Quiz
  renderQuiz(lesson);

  if (shouldSwitchView) {
    showLessonsView();
  }
}

// Render Interactive Checkpoint Quiz
function renderQuiz(lesson) {
  const quizContainer = document.getElementById("quizContainer");
  if (!quizContainer) return;
  quizContainer.innerHTML = "";

  if (!lesson.quiz) {
    quizContainer.style.display = "none";
    return;
  }

  quizContainer.style.display = "block";
  const q = lesson.quiz;

  const header = document.createElement("div");
  header.className = "quiz-header";
  header.innerHTML = `<span class="quiz-tag">CHECKPOINT QUIZ (+25 XP)</span>`;

  const question = document.createElement("div");
  question.className = "quiz-question";
  question.textContent = q.question;

  const optionsContainer = document.createElement("div");
  optionsContainer.className = "quiz-options";

  const feedback = document.createElement("div");
  feedback.className = "quiz-feedback";
  feedback.style.display = quizCompleted[lesson.id] ? "block" : "none";
  feedback.textContent = q.explanation;

  q.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option-btn";
    btn.textContent = optText;

    if (quizCompleted[lesson.id]) {
      if (idx === q.correct) btn.classList.add("correct");
    }

    btn.addEventListener("click", () => {
      if (idx === q.correct) {
        btn.classList.add("correct");
        feedback.style.display = "block";
        if (!quizCompleted[lesson.id]) {
          quizCompleted[lesson.id] = true;
          localStorage.setItem("robotics_quiz_completed", JSON.stringify(quizCompleted));
          showToast("+25 XP - Quiz Passed!", "xp");
          updateGamificationHUD();
          saveNotesToDisk();
        }
      } else {
        btn.classList.add("incorrect");
        setTimeout(() => btn.classList.remove("incorrect"), 800);
      }
    });

    optionsContainer.appendChild(btn);
  });

  quizContainer.appendChild(header);
  quizContainer.appendChild(question);
  quizContainer.appendChild(optionsContainer);
  quizContainer.appendChild(feedback);
}

// Render Glossary Grid
function renderGlossary(filterText = "") {
  const glossaryGrid = document.getElementById("glossaryGrid");
  if (!glossaryGrid) return;
  glossaryGrid.innerHTML = "";
  const query = filterText.toLowerCase().trim();

  const filtered = glossary.filter(item => {
    return (
      item.term.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.details.toLowerCase().includes(query)
    );
  });

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "glossary-card";

    const header = document.createElement("div");
    header.className = "glossary-card-header";

    const term = document.createElement("div");
    term.className = "glossary-term";
    term.textContent = item.term;

    const cat = document.createElement("div");
    cat.className = "glossary-category";
    cat.textContent = item.category;

    header.appendChild(term);
    header.appendChild(cat);

    const summary = document.createElement("div");
    summary.className = "glossary-summary";
    summary.textContent = item.summary;

    const details = document.createElement("div");
    details.className = "glossary-details";
    details.textContent = item.details;

    card.appendChild(header);
    card.appendChild(summary);
    card.appendChild(details);

    glossaryGrid.appendChild(card);
  });
}

// 1-Word Tab View Switchers
function deactivateAllTabs() {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".view-section").forEach(v => v.classList.remove("active"));
  const contentPane = document.getElementById("contentPane");
  if (contentPane) contentPane.classList.remove("overview-active");
}

function showOverviewView() {
  deactivateAllTabs();
  const view = document.getElementById("overviewView");
  const contentPane = document.getElementById("contentPane");
  if (view) view.classList.add("active");
  if (contentPane) contentPane.classList.add("overview-active");
  if (typeof initScene3D === "function") {
    initScene3D();
  }
}

function showLessonsView() {
  deactivateAllTabs();
  const btn = document.getElementById("btnViewLessons");
  const view = document.getElementById("lessonView");
  if (btn) btn.classList.add("active");
  if (view) view.classList.add("active");
}

function showDailyView() {
  deactivateAllTabs();
  const btn = document.getElementById("btnViewDaily");
  const view = document.getElementById("dailyView");
  if (btn) btn.classList.add("active");
  if (view) view.classList.add("active");
}

function showPracticeView() {
  deactivateAllTabs();
  const btn = document.getElementById("btnViewPractice");
  const view = document.getElementById("practiceView");
  if (btn) btn.classList.add("active");
  if (view) view.classList.add("active");
}

function showScratchpadView() {
  deactivateAllTabs();
  const btn = document.getElementById("btnViewScratchpad");
  const view = document.getElementById("scratchpadView");
  if (btn) btn.classList.add("active");
  if (view) view.classList.add("active");
}

function showGlossaryView() {
  deactivateAllTabs();
  const btn = document.getElementById("btnViewGlossary");
  const view = document.getElementById("glossaryView");
  if (btn) btn.classList.add("active");
  if (view) view.classList.add("active");
}

// Setup Event Listeners
function setupEventListeners() {
  const btnToggle = document.getElementById("btnToggleSidebar");
  if (btnToggle) {
    btnToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  // Brand logo button returns to 3D Overview
  const brandTitleBtn = document.getElementById("brandTitleBtn");
  if (brandTitleBtn) {
    brandTitleBtn.addEventListener("click", () => {
      showOverviewView();
    });
  }

  // Keyboard shortcut: '[' toggles sidebar
  document.addEventListener("keydown", (e) => {
    if (e.key === "[" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Streak button toggle
  const btnStreak = document.getElementById("btnStreakDropdown");
  const streakDropdown = document.getElementById("streakDropdown");
  if (btnStreak && streakDropdown) {
    btnStreak.addEventListener("click", (e) => {
      e.stopPropagation();
      const isShowing = streakDropdown.classList.toggle("show");
      if (isShowing) {
        renderStreakCalendar();
      }
    });
  }

  // Click outside handlers: Close sidebar and streak dropdown
  document.addEventListener("click", (e) => {
    // 1. Click outside sidebar closes it
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("btnToggleSidebar");
    if (sidebar && !isSidebarCollapsed) {
      if (!sidebar.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        isSidebarCollapsed = true;
        sidebar.classList.add("collapsed");
        localStorage.setItem("robotics_sidebar_collapsed", "true");
      }
    }

    // 2. Click outside streak dropdown closes it
    if (streakDropdown && streakDropdown.classList.contains("show")) {
      if (!streakDropdown.contains(e.target) && (!btnStreak || !btnStreak.contains(e.target))) {
        streakDropdown.classList.remove("show");
      }
    }
  });

  const btnL = document.getElementById("btnViewLessons");
  const btnD = document.getElementById("btnViewDaily");
  const btnP = document.getElementById("btnViewPractice");
  const btnS = document.getElementById("btnViewScratchpad");
  const btnG = document.getElementById("btnViewGlossary");

  if (btnL) btnL.addEventListener("click", showLessonsView);
  if (btnD) btnD.addEventListener("click", showDailyView);
  if (btnP) btnP.addEventListener("click", showPracticeView);
  if (btnS) btnS.addEventListener("click", showScratchpadView);
  if (btnG) btnG.addEventListener("click", showGlossaryView);

  // Global Scratchpad Auto-Save
  const scratchpadEl = document.getElementById("globalScratchpadInput");
  const scratchpadStatus = document.getElementById("scratchpadSaveStatus");
  const btnSaveScratchpadDisk = document.getElementById("btnSaveScratchpadDisk");

  if (scratchpadEl) {
    scratchpadEl.addEventListener("input", () => {
      if (scratchpadStatus) scratchpadStatus.textContent = "Typing...";
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        globalScratchpad = scratchpadEl.value;
        localStorage.setItem("robotics_global_scratchpad", globalScratchpad);
        if (scratchpadStatus) scratchpadStatus.textContent = "Saved";
        saveNotesToDisk();
      }, 600);
    });
  }

  if (btnSaveScratchpadDisk && scratchpadEl) {
    btnSaveScratchpadDisk.addEventListener("click", () => {
      globalScratchpad = scratchpadEl.value;
      localStorage.setItem("robotics_global_scratchpad", globalScratchpad);
      saveNotesToDisk(true);
    });
  }

  // Search input in glossary
  const glossaryFilterInput = document.getElementById("glossaryFilterInput");
  if (glossaryFilterInput) {
    glossaryFilterInput.addEventListener("input", (e) => {
      renderGlossary(e.target.value);
    });
  }

  // Quick search in sidebar
  const quickSearchInput = document.getElementById("quickSearchInput");
  if (quickSearchInput) {
    quickSearchInput.addEventListener("input", (e) => {
      const val = e.target.value.toLowerCase().trim();
      if (!val) return;
      showGlossaryView();
      const gInput = document.getElementById("glossaryFilterInput");
      if (gInput) gInput.value = val;
      renderGlossary(val);
    });
  }
}

// Check connection to local Python disk server
async function checkDiskSync() {
  const syncIndicator = document.getElementById("syncIndicator");
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      if (syncIndicator) {
        syncIndicator.textContent = "Sync: Connected";
        syncIndicator.classList.add("synced");
      }
      const notesRes = await fetch("/api/get_notes");
      if (notesRes.ok) {
        const diskData = await notesRes.json();
        if (diskData.scratchpad) {
          globalScratchpad = diskData.scratchpad;
          const scratchpadEl = document.getElementById("globalScratchpadInput");
          if (scratchpadEl) scratchpadEl.value = globalScratchpad;
          localStorage.setItem("robotics_global_scratchpad", globalScratchpad);
        }
      }
    }
  } catch (e) {
    if (syncIndicator) syncIndicator.textContent = "Sync: Standalone";
  }
}

// Save notes and progress to disk via Python backend
async function saveNotesToDisk(showFeedback = false) {
  const scratchpadStatus = document.getElementById("scratchpadSaveStatus");
  const syncIndicator = document.getElementById("syncIndicator");
  try {
    const payload = {
      scratchpad: globalScratchpad,
      progress: completedLessons,
      quizzes: quizCompleted,
      practice: practiceSolved,
      timestamp: new Date().toISOString()
    };
    const res = await fetch("/api/save_notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      if (syncIndicator) {
        syncIndicator.textContent = "Sync: Connected";
        syncIndicator.classList.add("synced");
      }
      if (showFeedback && scratchpadStatus) scratchpadStatus.textContent = "Saved to Disk!";
    }
  } catch (e) {
    if (showFeedback && scratchpadStatus) scratchpadStatus.textContent = "Saved in Browser";
  }
}

// Execute immediately
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
