/* =========================================================
   UniNotes Frontend UI Demo
   This version uses localStorage + mock data.
   Supabase can replace these demo functions later.
   ========================================================= */

const SUPABASE_URL = "https://vxzsqdrcuwesorystkdn.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_amVCeTz9-6L4rKdvJqIn_A_QJ7J3Tc3";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const BRANCHES = [
  { code: "CSE", name: "Computer Science Engineering", short: "CSE" },
  { code: "ECE", name: "Electronics & Communication", short: "ECE" },
  { code: "ME",  name: "Mechanical Engineering", short: "Mechanical" },
  { code: "CE",  name: "Civil Engineering", short: "Civil" },
  { code: "AE",  name: "Aeronautical Engineering", short: "Aeronautical" }
];

const SUBJECTS = {
  CSE: {
    1: ["Programming for Problem Solving", "Engineering Mathematics I", "Engineering Physics", "Engineering Chemistry"],
    2: ["Data Structures", "Engineering Mathematics II", "Digital Logic", "Computer Organization"],
    3: ["Database Management Systems", "Object Oriented Programming", "Operating Systems", "Computer Networks"],
    4: ["Design & Analysis of Algorithms", "Software Engineering", "Microprocessors", "Web Technology"]
  },
  ECE: {
    1: ["Programming for Problem Solving", "Engineering Mathematics I", "Engineering Physics", "Basic Electronics"],
    2: ["Network Analysis", "Engineering Mathematics II", "Digital Electronics", "Signals & Systems"],
    3: ["Analog Electronics", "Electromagnetic Theory", "Electronic Devices", "Microcontrollers"],
    4: ["Communication Systems", "Digital Signal Processing", "VLSI Design", "Control Systems"]
  },
  ME: {
    1: ["Engineering Mathematics I", "Engineering Physics", "Engineering Chemistry", "Programming for Problem Solving"],
    2: ["Engineering Mathematics II", "Engineering Mechanics", "Manufacturing Processes", "Material Science"],
    3: ["Thermodynamics", "Automobile Engineering", "Fluid Mechanics", "Manufacturing Technology", "Machine Design"],
    4: ["Heat Transfer", "Dynamics of Machinery", "Metrology", "Design of Machine Elements"],
    5: ["Internal Combustion Engines", "Refrigeration & Air Conditioning", "CAD/CAM", "Industrial Engineering"],
    6: ["Finite Element Analysis", "Advanced Manufacturing", "Mechatronics", "Automobile Engineering II"]
  },
  CE: {
    1: ["Engineering Mathematics I", "Engineering Physics", "Engineering Chemistry", "Engineering Drawing"],
    2: ["Surveying", "Engineering Mathematics II", "Building Materials", "Strength of Materials"],
    3: ["Structural Analysis", "Fluid Mechanics", "Geotechnical Engineering", "Concrete Technology"],
    4: ["Design of RCC Structures", "Transportation Engineering", "Environmental Engineering", "Hydrology"]
  },
  AE: {
    1: ["Engineering Mathematics I", "Engineering Physics", "Engineering Chemistry", "Engineering Drawing"],
    2: ["Engineering Mathematics II", "Engineering Mechanics", "Thermodynamics", "Materials Science"],
    3: ["Aerodynamics I", "Aircraft Structures I", "Aircraft Propulsion", "Flight Mechanics"],
    4: ["Aerodynamics II", "Aircraft Structures II", "Avionics", "Aerospace Manufacturing"]
  }
};

const DEFAULT_RESOURCES = [
  { id: 1, branch: "ME", semester: "3", subject: "Thermodynamics", type: "Lecture Notes", title: "Thermodynamics — Unit 1 Notes", description: "First law, systems and properties", file: "thermodynamics-unit1.pdf", date: "2026-08-09" },
  { id: 2, branch: "ME", semester: "3", subject: "Thermodynamics", type: "Question Paper", title: "Thermodynamics — Important Questions", description: "Unit-wise preparation questions", file: "thermodynamics-important.pdf", date: "2026-08-08" },
  { id: 3, branch: "ME", semester: "3", subject: "Automobile Engineering", type: "Lecture Notes", title: "Automobile Engineering — Unit 1", description: "Introduction and vehicle systems", file: "automobile-unit1.pdf", date: "2026-08-09" },
  { id: 4, branch: "ME", semester: "3", subject: "Fluid Mechanics", type: "Lecture Notes", title: "Fluid Mechanics — Fundamentals", description: "Fluid properties and pressure", file: "fluid-fundamentals.pdf", date: "2026-08-07" },
  { id: 5, branch: "CSE", semester: "1", subject: "Programming for Problem Solving", type: "Lecture Notes", title: "C Programming — Unit 1", description: "Programming fundamentals", file: "c-unit1.pdf", date: "2026-08-06" },
  { id: 6, branch: "ECE", semester: "3", subject: "Analog Electronics", type: "Lecture Notes", title: "Analog Electronics — Diodes", description: "PN junction and diode applications", file: "diodes.pdf", date: "2026-08-05" }
];

let currentRole = null;
let currentProfile = null;
let selectedBranch = "ME";
let selectedSemester = "3";
let selectedSubject = "Thermodynamics";
let toastTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  buildStaticControls();
  bindForms();
  bindFileInput();
  restoreProfile();
});

function initializeTheme() {
  const savedTheme = localStorage.getItem("uninotes_theme");
  const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (systemDark ? "dark" : "light"));
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("uninotes_theme", theme);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

function buildStaticControls() {
  const branchGrid = document.getElementById("branchGrid");
  const semesterGrid = document.getElementById("semesterGrid");
  const uploadBranch = document.getElementById("uploadBranch");
  const uploadSemester = document.getElementById("uploadSemester");

  branchGrid.innerHTML = BRANCHES.map(branch => `
    <button type="button" data-branch="${branch.code}" onclick="selectBranch('${branch.code}')">
      ${escapeHTML(branch.short)}
    </button>
  `).join("");

  semesterGrid.innerHTML = Array.from({ length: 8 }, (_, i) => `
    <button type="button" data-semester="${i + 1}" onclick="selectSemester('${i + 1}')">
      Sem ${i + 1}
    </button>
  `).join("");

  uploadBranch.innerHTML = BRANCHES.map(b => `<option value="${b.code}">${escapeHTML(b.name)}</option>`).join("");
  uploadSemester.innerHTML = Array.from({ length: 8 }, (_, i) =>
    `<option value="${i + 1}">Semester ${i + 1}</option>`
  ).join("");

  uploadBranch.addEventListener("change", updateTeacherSubjects);
  uploadSemester.addEventListener("change", updateTeacherSubjects);

  updateTeacherSubjects();
  updateSelectionButtons();
}

function bindForms() {
  document.getElementById("studentForm").addEventListener("submit", handleStudentSubmit);
  document.getElementById("teacherForm").addEventListener("submit", handleTeacherSubmit);
  document.getElementById("uploadForm").addEventListener("submit", handleDemoUpload);
}

function bindFileInput() {
  document.getElementById("uploadFile").addEventListener("change", event => {
    const file = event.target.files[0];
    document.getElementById("fileName").textContent = file
      ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
      : "PDF up to 20 MB";
  });
}

function selectRole(role) {
  currentRole = role;
  showView(role === "student" ? "studentSetupView" : "teacherSetupView");
}

function handleStudentSubmit(event) {
  event.preventDefault();

  const profile = {
    name: document.getElementById("studentName").value.trim(),
    id: document.getElementById("studentId").value.trim(),
    branch: document.getElementById("studentBranch").value,
    semester: document.getElementById("studentSemester").value
  };

  if (!profile.name || !profile.id || !profile.branch || !profile.semester) return;

  currentRole = "student";
  currentProfile = profile;
  localStorage.setItem("uninotes_profile", JSON.stringify(profile));
  localStorage.setItem("uninotes_role", "student");

  selectedBranch = profile.branch;
  selectedSemester = profile.semester;
  selectedSubject = getSubjects(selectedBranch, selectedSemester)[0] || "";

  openStudentDashboard();
  showToast("Student profile saved.");
}

function handleTeacherSubmit(event) {
  event.preventDefault();

  const profile = {
    name: document.getElementById("teacherName").value.trim(),
    id: document.getElementById("teacherId").value.trim(),
    branch: document.getElementById("teacherBranch").value
  };

  if (!profile.name || !profile.id || !profile.branch) return;

  currentRole = "teacher";
  currentProfile = profile;
  localStorage.setItem("uninotes_profile", JSON.stringify(profile));
  localStorage.setItem("uninotes_role", "teacher");

  openTeacherDashboard();
  showToast("Faculty profile saved. Demo mode enabled.");
}

function restoreProfile() {
  const savedRole = localStorage.getItem("uninotes_role");
  const savedProfile = localStorage.getItem("uninotes_profile");

  if (!savedRole || !savedProfile) return;

  try {
    currentRole = savedRole;
    currentProfile = JSON.parse(savedProfile);

    if (savedRole === "student") {
      selectedBranch = currentProfile.branch || "ME";
      selectedSemester = currentProfile.semester || "3";
      selectedSubject = getSubjects(selectedBranch, selectedSemester)[0] || "";
      openStudentDashboard();
    } else if (savedRole === "teacher") {
      openTeacherDashboard();
    }
  } catch {
    localStorage.removeItem("uninotes_role");
    localStorage.removeItem("uninotes_profile");
  }
}

function openStudentDashboard() {
  const name = currentProfile?.name || "Student";
  document.getElementById("studentWelcome").textContent = `Welcome, ${name}`;
  setAvatar("dashboardAvatar", name);
  updateHeaderForRole("student");
  renderSubjects();
  renderResources();
  showView("studentDashboardView");
}

function openTeacherDashboard() {
  const name = currentProfile?.name || "Faculty";
  document.getElementById("teacherWelcome").textContent = `Welcome, ${name}`;
  setAvatar("teacherAvatar", name);
  document.getElementById("uploadBranch").value = currentProfile?.branch || "ME";
  updateTeacherSubjects();
  updateHeaderForRole("teacher");
  updateTeacherUploadCount();
  showView("teacherDashboardView");
}

function updateHeaderForRole(role) {
  const badge = document.getElementById("roleBadge");
  const profileBtn = document.getElementById("profileBtn");

  badge.classList.remove("hidden");
  profileBtn.classList.remove("hidden");
  badge.textContent = role === "student" ? "Student" : "Faculty";
  document.getElementById("profileName").textContent = currentProfile?.name || "Profile";
  setAvatar("profileAvatar", currentProfile?.name || "U");
}

function setAvatar(elementId, name) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = (name || "U").trim().charAt(0).toUpperCase();
}

function selectBranch(branch) {
  selectedBranch = branch;
  const subjects = getSubjects(branch, selectedSemester);
  selectedSubject = subjects[0] || "";
  updateSelectionButtons();
  renderSubjects();
  renderResources();
}

function selectSemester(semester) {
  selectedSemester = String(semester);
  const subjects = getSubjects(selectedBranch, selectedSemester);
  selectedSubject = subjects[0] || "";
  updateSelectionButtons();
  renderSubjects();
  renderResources();
}

function updateSelectionButtons() {
  document.querySelectorAll("#branchGrid button").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.branch === selectedBranch);
  });

  document.querySelectorAll("#semesterGrid button").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.semester === String(selectedSemester));
  });
}

function renderSubjects() {
  const grid = document.getElementById("subjectGrid");
  const subjects = getSubjects(selectedBranch, selectedSemester);

  document.getElementById("subjectCount").textContent = subjects.length;

  if (!subjects.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <strong>No subjects added yet</strong>
        <span>Subjects can be connected from Supabase later.</span>
      </div>`;
    return;
  }

  grid.innerHTML = subjects.map((subject, index) => `
    <button type="button" class="subject-card ${subject === selectedSubject ? "selected" : ""}"
      onclick="selectSubject(${JSON.stringify(subject)})">
      <span class="subject-icon">${index % 2 === 0 ? "▣" : "◈"}</span>
      <strong>${escapeHTML(subject)}</strong>
      <small>${getResourceCount(selectedBranch, selectedSemester, subject)} resources</small>
    </button>
  `).join("");
}

function selectSubject(subject) {
  selectedSubject = subject;
  renderSubjects();
  renderResources();
  document.querySelector(".resources-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderResources() {
  const list = document.getElementById("resourceList");
  const search = document.getElementById("resourceSearch").value.trim().toLowerCase();

  const allResources = getResources();
  let resources = allResources.filter(item =>
    item.branch === selectedBranch &&
    String(item.semester) === String(selectedSemester) &&
    item.subject === selectedSubject
  );

  if (search) {
    resources = allResources.filter(item => {
      const haystack = `${item.title} ${item.subject} ${item.type} ${item.description || ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  const branchName = getBranchName(selectedBranch);
  document.getElementById("selectionSummary").textContent =
    `${branchName} • Semester ${selectedSemester}`;

  document.getElementById("resourceHeading").textContent =
    search ? "Search results" : (selectedSubject || "Resources");

  document.getElementById("resourceSubheading").textContent =
    search ? `Results matching “${search}”` : "Study materials available for this subject.";

  document.getElementById("resourceCount").textContent = resources.length;

  if (!resources.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>No resources found</strong>
        <span>Faculty materials will appear here after they are uploaded.</span>
      </div>`;
    return;
  }

  list.innerHTML = resources.map(resource => `
    <div class="resource-item">
      <div class="file-icon">PDF</div>
      <div class="resource-info">
        <strong title="${escapeHTML(resource.title)}">${escapeHTML(resource.title)}</strong>
        <div class="resource-meta">
          ${escapeHTML(resource.type)} • ${escapeHTML(resource.date)}${resource.description ? ` • ${escapeHTML(resource.description)}` : ""}
        </div>
      </div>
      <button type="button" class="download-btn" onclick="demoDownload('${escapeJS(resource.file)}')">Download</button>
    </div>
  `).join("");
}

function updateTeacherSubjects() {
  const branch = document.getElementById("uploadBranch").value;
  const semester = document.getElementById("uploadSemester").value;
  const select = document.getElementById("uploadSubject");
  const subjects = getSubjects(branch, semester);

  select.innerHTML = subjects.length
    ? subjects.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("")
    : `<option value="">No subjects available</option>`;
}

function handleDemoUpload(event) {
  event.preventDefault();

  const fileInput = document.getElementById("uploadFile");
  const file = fileInput.files[0];

  if (!file) {
    showToast("Please choose a PDF file.");
    return;
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showToast("Only PDF files are allowed.");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showToast("Please keep the demo PDF below 20 MB.");
    return;
  }

  const resource = {
    id: Date.now(),
    branch: document.getElementById("uploadBranch").value,
    semester: document.getElementById("uploadSemester").value,
    subject: document.getElementById("uploadSubject").value,
    type: document.getElementById("uploadType").value,
    title: document.getElementById("uploadTitle").value.trim(),
    description: document.getElementById("uploadDescription").value.trim(),
    file: file.name,
    date: new Date().toISOString().slice(0, 10)
  };

  const uploaded = JSON.parse(localStorage.getItem("uninotes_uploaded") || "[]");
  uploaded.push(resource);
  localStorage.setItem("uninotes_uploaded", JSON.stringify(uploaded));

  event.target.reset();
  document.getElementById("uploadBranch").value = currentProfile?.branch || "ME";
  document.getElementById("uploadSemester").value = "1";
  updateTeacherSubjects();
  document.getElementById("fileName").textContent = "PDF up to 20 MB";

  updateTeacherUploadCount();
  showToast("Demo upload saved locally. Supabase will store the real PDF later.");
}

function getResources() {
  const uploaded = JSON.parse(localStorage.getItem("uninotes_uploaded") || "[]");
  return [...uploaded, ...DEFAULT_RESOURCES];
}

function getResourceCount(branch, semester, subject) {
  return getResources().filter(r =>
    r.branch === branch &&
    String(r.semester) === String(semester) &&
    r.subject === subject
  ).length;
}

function updateTeacherUploadCount() {
  const count = JSON.parse(localStorage.getItem("uninotes_uploaded") || "[]").length;
  document.getElementById("teacherUploadCount").textContent = count;
}

function getSubjects(branch, semester) {
  return (SUBJECTS[branch] && SUBJECTS[branch][semester]) || [];
}

function getBranchName(code) {
  return BRANCHES.find(b => b.code === code)?.name || code;
}

function demoDownload(fileName) {
  showToast(`Demo mode: "${fileName}" will download once Supabase Storage is connected.`);
}

function switchProfile() {
  localStorage.removeItem("uninotes_role");
  localStorage.removeItem("uninotes_profile");
  currentRole = null;
  currentProfile = null;

  document.getElementById("profileBtn").classList.add("hidden");
  document.getElementById("roleBadge").classList.add("hidden");
  showView("roleView");
  showToast("Profile switched.");
}

function goHome(event) {
  event.preventDefault();
  if (currentRole === "student") openStudentDashboard();
  else if (currentRole === "teacher") openTeacherDashboard();
  else showView("roleView");
}

function showView(id) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJS(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}
