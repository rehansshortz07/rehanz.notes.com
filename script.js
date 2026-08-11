/* =========================================================
   UniNotes - Complete Supabase Integration & Enhancements
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "https://vxzsqdrcuwesorystkdn.supabase.co";
const SUPABASE_KEY = "sb_publishable_amVCeTz9-6L4rKdvJqIn_A_QJ7J3Tc3";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    }
});

/* =========================================================
   STATIC DATA FALLBACKS & REFERENCES
   ========================================================= */

const BRANCHES = [
    { code: "CSE", name: "Computer Science Engineering", short: "CSE" },
    { code: "ECE", name: "Electronics & Communication", short: "ECE" },
    { code: "ME", name: "Mechanical Engineering", short: "Mechanical" },
    { code: "CE", name: "Civil Engineering", short: "Civil" },
    { code: "AE", name: "Aeronautical Engineering", short: "Aeronautical" }
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

/* =========================================================
   APPLICATION STATE
   ========================================================= */

let currentRole = null;
let currentProfile = null;

let selectedBranch = "ME";
let selectedSemester = "3";
let selectedSubject = "";

let toastTimer = null;

// Pagination State
let displayedResourceLimit = 5;
const RESOURCE_PAGE_SIZE = 5;

/* =========================================================
   DOM INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("UniNotes starting...");
    initializeTheme();
    buildStaticControls();
    bindForms();
    bindFileInput();
    await initializeUniNotes();
});

/* =========================================================
   PWA INSTALL PROMPT MANAGEMENT
   ========================================================= */

let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    
    // Show the install button if the app is not running in standalone mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const installBtn = document.getElementById("installBtn");
    
    if (installBtn && !isStandalone) {
        installBtn.classList.remove("hidden");
    }
});

function bindInstallButton() {
    const installBtn = document.getElementById("installBtn");
    if (!installBtn) return;

    // Ensure state is correct on load
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) {
        installBtn.classList.add("hidden");
        return;
    }

    installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) {
            showToast("App installation is not available right now or already installed.");
            return;
        }
        
        // Show the installation prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            console.log("User accepted the install prompt");
        } else {
            console.log("User dismissed the install prompt");
        }
        
        deferredPrompt = null;
        installBtn.classList.add("hidden");
    });
}

// Check display mode on DOM content loaded across all pages
window.addEventListener("DOMContentLoaded", () => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const installBtn = document.getElementById("installBtn");
    
    if (installBtn) {
        if (isStandalone) {
            installBtn.classList.add("hidden");
        } else {
            // Keep visible if not installed so it shows on all views/pages
            installBtn.classList.remove("hidden");
            bindInstallButton();
        }
    }
});

window.addEventListener("appinstalled", () => {
    const installBtn = document.getElementById("installBtn");
    if (installBtn) {
        installBtn.classList.add("hidden");
    }
    deferredPrompt = null;
    showToast("UniNotes installed successfully!");
});

/* =========================================================
   INITIALIZE UNINOTES SESSION & PROFILES
   ========================================================= */

async function initializeUniNotes() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (!session) {
            console.log("No active Supabase session.");
            showView("roleView");
            return;
        }

        let restored = await restoreStudentProfile(session.user);
        if (restored) return;

        restored = await restoreTeacherProfile(session.user);
        if (restored) return;

        showView("roleView");

    } catch (error) {
        console.error("Initialization error:", error);
        showView("roleView");
    }
}

supabaseClient.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") {
        currentRole = null;
        currentProfile = null;
        localStorage.removeItem("uninotes_profile");
        localStorage.removeItem("uninotes_role");
        showView("roleView");
    }
});

/* =========================================================
   THEME MANAGEMENT
   ========================================================= */

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

function bindThemeButton() {
    const button = document.getElementById("themeToggle");
    if (!button) return;
    button.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "light";
        applyTheme(current === "dark" ? "light" : "dark");
    });
}

/* =========================================================
   CONTROLS & UI BUILDERS
   ========================================================= */

function buildStaticControls() {
    const branchGrid = document.getElementById("branchGrid");
    const semesterGrid = document.getElementById("semesterGrid");
    const uploadBranch = document.getElementById("uploadBranch");
    const uploadSemester = document.getElementById("uploadSemester");

    if (branchGrid) {
        branchGrid.innerHTML = BRANCHES.map(branch => `
            <button type="button" data-branch="${escapeHTML(branch.code)}">
                ${escapeHTML(branch.short)}
            </button>
        `).join("");

        branchGrid.querySelectorAll("button").forEach(button => {
            button.addEventListener("click", () => selectBranch(button.dataset.branch));
        });
    }

    if (semesterGrid) {
        semesterGrid.innerHTML = Array.from({ length: 8 }, (_, index) => `
            <button type="button" data-semester="${index + 1}">
                Sem ${index + 1}
            </button>
        `).join("");

        semesterGrid.querySelectorAll("button").forEach(button => {
            button.addEventListener("click", () => selectSemester(button.dataset.semester));
        });
    }

    if (uploadBranch) {
        uploadBranch.innerHTML = BRANCHES.map(branch => `
            <option value="${escapeHTML(branch.code)}">${escapeHTML(branch.name)}</option>
        `).join("");
        uploadBranch.addEventListener("change", updateTeacherSubjects);
    }

    if (uploadSemester) {
        uploadSemester.innerHTML = Array.from({ length: 8 }, (_, index) => `
            <option value="${index + 1}">Semester ${index + 1}</option>
        `).join("");
        uploadSemester.addEventListener("change", updateTeacherSubjects);
    }

    updateTeacherSubjects();
    updateSelectionButtons();
    bindThemeButton();
}

function bindForms() {
    const studentForm = document.getElementById("studentForm");
    const teacherForm = document.getElementById("teacherForm");
    const uploadForm = document.getElementById("uploadForm");

    if (studentForm) studentForm.addEventListener("submit", handleStudentSubmit);
    if (teacherForm) teacherForm.addEventListener("submit", handleTeacherSubmit);
    if (uploadForm) uploadForm.addEventListener("submit", handleTeacherUpload);
}

function bindFileInput() {
    const uploadFile = document.getElementById("uploadFile");
    if (!uploadFile) return;

    uploadFile.addEventListener("change", event => {
        const file = event.target.files[0];
        const fileName = document.getElementById("fileName");
        if (!fileName) return;

        fileName.textContent = file
            ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
            : "PDF up to 20 MB";
    });
}

function selectRole(role) {
    currentRole = role;
    if (role === "student") {
        showView("studentSetupView");
    } else {
        showView("teacherSetupView");
    }
}

/* =========================================================
   STUDENT AUTHENTICATION & PROFILE CREATION
   ========================================================= */

async function handleStudentSubmit(event) {
    event.preventDefault();

    const email = document.getElementById("studentEmail")?.value.trim();
    const password = document.getElementById("studentPassword")?.value;
    const name = document.getElementById("studentName")?.value.trim();
    const universityNumber = document.getElementById("studentId")?.value.trim();
    const branchCode = document.getElementById("studentBranch")?.value;
    const semesterNumber = document.getElementById("studentSemester")?.value;

    if (!email || !password || !name || !universityNumber || !branchCode || !semesterNumber) {
        showToast("Please fill all required fields.");
        return;
    }

    try {
        let { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });
        
        if (authError) {
            if (authError.message?.toLowerCase().includes("already registered")) {
                const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (loginError) throw loginError;
                authData = loginData;
            } else {
                throw authError;
            }
        }

        const user = authData?.user;
        if (!user) throw new Error("Authentication failed.");

        const { data: branchData } = await supabaseClient.from("branches").select("id, code, name").eq("code", branchCode).single();
        const { data: semesterData } = await supabaseClient.from("semesters").select("id, semester_number").eq("semester_number", Number(semesterNumber)).single();

        const profilePayload = {
            id: user.id,
            name: name,
            university_number: universityNumber,
            branch_id: branchData.id,
            current_semester_id: semesterData.id
        };

        await supabaseClient.from("student_profiles").upsert(profilePayload, { onConflict: "id" });

        currentRole = "student";
        currentProfile = {
            id: user.id,
            name,
            university_number: universityNumber,
            branch: branchCode,
            semester: String(semesterNumber),
            branch_id: branchData.id,
            current_semester_id: semesterData.id,
            email: user.email
        };

        saveLocalProfile();
        selectedBranch = branchCode;
        selectedSemester = String(semesterNumber);
        selectedSubject = getSubjects(selectedBranch, selectedSemester)[0] || "";

        openStudentDashboard();
        showToast("Student portal loaded successfully.");

    } catch (error) {
        console.error("Student setup error:", error);
        showToast(error.message || "Failed to authenticate or save profile.");
    }
}

async function restoreStudentProfile(user) {
    const { data: profile, error } = await supabaseClient
        .from("student_profiles")
        .select(`id, name, university_number, branch_id, current_semester_id, branches ( code, name ), semesters ( semester_number )`)
        .eq("id", user.id)
        .maybeSingle();

    if (error || !profile) return false;

    currentRole = "student";
    currentProfile = {
        id: profile.id,
        name: profile.name,
        university_number: profile.university_number,
        branch: profile.branches.code,
        semester: String(profile.semesters.semester_number),
        branch_id: profile.branch_id,
        current_semester_id: profile.current_semester_id,
        email: user.email
    };

    selectedBranch = currentProfile.branch;
    selectedSemester = currentProfile.semester;
    selectedSubject = getSubjects(selectedBranch, selectedSemester)[0] || "";

    saveLocalProfile();
    openStudentDashboard();
    return true;
}

/* =========================================================
   AUTHORIZED FACULTY VERIFICATION & PREVIEW UPDATES
   ========================================================= */

async function handleTeacherSubmit(event) {
    event.preventDefault();

    const email = document.getElementById("teacherEmail")?.value.trim();
    const password = document.getElementById("teacherPassword")?.value;
    const name = document.getElementById("teacherName")?.value.trim();
    const universityId = document.getElementById("teacherId")?.value.trim();
    const branchCode = document.getElementById("teacherBranch")?.value;

    if (!email || !password || !name || !universityId || !branchCode) {
        showToast("Please fill all faculty fields.");
        return;
    }

    try {
        const response = await fetch("authorized_faculty.json");
        if (!response.ok) throw new Error("Could not load authorization records.");
        
        const authorizedList = await response.json();
        const isAuthorized = authorizedList.some(teacher => 
            teacher.universityId.toLowerCase() === universityId.toLowerCase() &&
            teacher.branch === branchCode
        );

        if (!isAuthorized) {
            showToast("Access Denied: University ID or Branch does not match authorized faculty records.");
            return;
        }

        let user = null;
        let { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

        if (authError) {
            if (authError.message?.toLowerCase().includes("already registered") || authError.status === 422) {
                const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (loginError) throw loginError;
                user = loginData?.user;
            } else {
                throw authError;
            }
        } else {
            user = authData?.user;
        }

        if (!user) throw new Error("Faculty authentication failed.");

        const { data: branchData } = await supabaseClient.from("branches").select("id, code, name").eq("code", branchCode).single();

        const profilePayload = {
            auth_user_id: user.id,
            name: name,
            university_id: universityId,
            branch_id: branchData.id,
            approved: true
        };

        const { data: existingTeacher } = await supabaseClient.from("teacher_profiles").select("id").eq("auth_user_id", user.id).maybeSingle();

        let teacherId;
        if (existingTeacher) {
            const { data: updated } = await supabaseClient.from("teacher_profiles").update(profilePayload).eq("auth_user_id", user.id).select("id").single();
            teacherId = updated.id;
        } else {
            const { data: inserted } = await supabaseClient.from("teacher_profiles").insert(profilePayload).select("id").single();
            teacherId = inserted.id;
        }

        currentRole = "teacher";
        currentProfile = {
            id: teacherId,
            auth_user_id: user.id,
            name: name,
            university_id: universityId,
            branch: branchCode,
            branch_id: branchData.id,
            email: user.email
        };

        saveLocalProfile();
        openTeacherDashboard();
        showToast("Faculty portal unlocked successfully.");

    } catch (error) {
        console.error("Teacher setup error:", error);
        showToast(error.message || "Failed to verify or set up faculty account.");
    }
}

/* =========================================================
   WORKSPACE RETURN BANNER & PREVIEW TOGGLE
   ========================================================= */

window.toggleStudentPreview = function() {
    if (currentRole !== "teacher") return;
    
    const teacherView = document.getElementById("teacherDashboardView");
    const studentView = document.getElementById("studentDashboardView");
    const previewBanner = document.getElementById("previewBanner");
    
    if (!teacherView || !studentView) return;

    const isPreviewing = studentView.classList.contains("active");
    
    if (!isPreviewing) {
        teacherView.classList.remove("active");
        studentView.classList.add("active");
        if (previewBanner) previewBanner.classList.remove("hidden");
        renderSubjects();
        renderResources();
        showToast("Switched to Student View Preview.");
    } else {
        studentView.classList.remove("active");
        teacherView.classList.add("active");
        if (previewBanner) previewBanner.classList.add("hidden");
        showToast("Returned to Faculty Workspace.");
    }
};

async function restoreTeacherProfile(user) {
    const { data: profile, error } = await supabaseClient
        .from("teacher_profiles")
        .select(`id, auth_user_id, name, university_id, branch_id, approved, branches ( code, name )`)
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (error || !profile) return false;

    currentRole = "teacher";
    currentProfile = {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        name: profile.name,
        university_id: profile.university_id,
        branch: profile.branches.code,
        branch_id: profile.branch_id,
        email: user.email
    };

    saveLocalProfile();
    openTeacherDashboard();
    return true;
}

/* =========================================================
   SESSION & STORAGE HELPERS
   ========================================================= */

function saveLocalProfile() {
    if (!currentProfile) return;
    localStorage.setItem("uninotes_profile", JSON.stringify(currentProfile));
    localStorage.setItem("uninotes_role", currentRole);
}

async function logoutUser() {
    try {
        await supabaseClient.auth.signOut();
    } catch (err) {
        console.error("Logout error:", err);
    }

    currentRole = null;
    currentProfile = null;
    localStorage.removeItem("uninotes_profile");
    localStorage.removeItem("uninotes_role");
    
    // Hide preview banner on logout
    const banner = document.getElementById("previewBanner");
    if (banner) banner.classList.add("hidden");

    showView("roleView");
    showToast("Signed out successfully.");
}

/* =========================================================
   DASHBOARD VIEWS
   ========================================================= */

function openStudentDashboard() {
    if (!currentProfile) {
        showView("roleView");
        return;
    }
    const name = currentProfile.name || "Student";
    const welcome = document.getElementById("studentWelcome");
    if (welcome) welcome.textContent = `Welcome, ${name}`;

    setAvatar("dashboardAvatar", name);
    updateHeaderForRole("student");
    renderSubjects();
    renderResources();
    showView("studentDashboardView");
}

function openTeacherDashboard() {
    const name = currentProfile?.name || "Faculty";
    const welcome = document.getElementById("teacherWelcome");
    if (welcome) welcome.textContent = `Welcome, ${name}`;

    setAvatar("teacherAvatar", name);
    const uploadBranch = document.getElementById("uploadBranch");
    if (uploadBranch && currentProfile?.branch) {
        uploadBranch.value = currentProfile.branch;
    }

    updateTeacherSubjects();
    updateHeaderForRole("teacher");
    updateTeacherUploadCount();
    loadTeacherUploads();
    
    showView("teacherDashboardView");
}

function updateHeaderForRole(role) {
    const badge = document.getElementById("roleBadge");
    const profileButton = document.getElementById("profileBtn");

    if (badge) {
        badge.classList.remove("hidden");
        badge.textContent = role === "student" ? "Student" : "Faculty";
    }
    if (profileButton) profileButton.classList.remove("hidden");

    const profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = currentProfile?.name || "Profile";

    setAvatar("profileAvatar", currentProfile?.name || "U");
}

function setAvatar(elementId, name) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = (name || "U").trim().charAt(0).toUpperCase();
}

/* =========================================================
   BRANCH & SEMESTER SELECTION
   ========================================================= */

function selectBranch(branch) {
    selectedBranch = branch;
    selectedSubject = getSubjects(branch, selectedSemester)[0] || "";
    displayedResourceLimit = RESOURCE_PAGE_SIZE; // Reset pagination limit on selection change
    updateSelectionButtons();
    renderSubjects();
    renderResources();
}

function selectSemester(semester) {
    selectedSemester = String(semester);
    selectedSubject = getSubjects(selectedBranch, selectedSemester)[0] || "";
    displayedResourceLimit = RESOURCE_PAGE_SIZE; // Reset pagination limit on selection change
    updateSelectionButtons();
    renderSubjects();
    renderResources();
}

function updateSelectionButtons() {
    document.querySelectorAll("#branchGrid button").forEach(button => {
        button.classList.toggle("selected", button.dataset.branch === selectedBranch);
    });
    document.querySelectorAll("#semesterGrid button").forEach(button => {
        button.classList.toggle("selected", button.dataset.semester === String(selectedSemester));
    });
}

/* =========================================================
   SUBJECTS RENDERING
   ========================================================= */

function renderSubjects() {
    const grid = document.getElementById("subjectGrid");
    if (!grid) return;

    const subjects = getSubjects(selectedBranch, selectedSemester);
    const count = document.getElementById("subjectCount");
    if (count) count.textContent = subjects.length;

    if (!subjects.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <strong>No subjects found</strong>
                <span>Select a valid branch and semester combination.</span>
            </div>
        `;
        return;
    }

    grid.innerHTML = subjects.map((subject, index) => `
        <button type="button" class="subject-card ${subject === selectedSubject ? "selected" : ""}" data-subject="${escapeHTML(subject)}">
            <span class="subject-icon">${index % 2 === 0 ? "▣" : "◈"}</span>
            <strong>${escapeHTML(subject)}</strong>
            <small>View materials</small>
        </button>
    `).join("");

    grid.querySelectorAll(".subject-card").forEach(button => {
        button.addEventListener("click", () => selectSubject(button.dataset.subject));
    });
}

function selectSubject(subject) {
    selectedSubject = subject;
    displayedResourceLimit = RESOURCE_PAGE_SIZE; // Reset pagination limit on subject change
    renderSubjects();
    renderResources();
    document.querySelector(".resources-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================================================
   RESOURCES & PAGINATION SUPPORT
   ========================================================= */

async function getResourcesFromDatabase() {
    try {
        const { data: branchData } = await supabaseClient.from("branches").select("id").eq("code", selectedBranch).maybeSingle();
        const { data: semData } = await supabaseClient.from("semesters").select("id").eq("semester_number", Number(selectedSemester)).maybeSingle();

        if (!branchData || !semData) return [];

        const { data: subjectData } = await supabaseClient
            .from("subjects")
            .select("id, name")
            .eq("branch_id", branchData.id)
            .eq("semester_id", semData.id);

        if (!subjectData || subjectData.length === 0) return [];

        const subjectMap = {};
        subjectData.forEach(sub => { subjectMap[sub.id] = sub.name; });
        const subjectIds = subjectData.map(sub => sub.id);

        const { data: notesData, error } = await supabaseClient
            .from("notes")
            .select("*")
            .in("subject_id", subjectIds)
            .eq("status", "published");

        if (error || !notesData) return [];

        return notesData.map(note => ({
            id: note.id,
            branch: selectedBranch,
            semester: selectedSemester,
            subject: subjectMap[note.subject_id] || "General",
            type: "Lecture Notes",
            title: note.title,
            description: note.description || "",
            file: note.file_name,
            storage_path: note.storage_path,
            date: note.created_at ? note.created_at.slice(0, 10) : "2026-08-10"
        }));

    } catch (err) {
        console.error("Database fetch exception:", err);
        return [];
    }
}

async function renderResources() {
    const list = document.getElementById("resourceList");
    if (!list) return;

    const searchInput = document.getElementById("resourceSearch");
    const search = searchInput?.value.trim().toLowerCase() || "";

    const allResources = await getResourcesFromDatabase();

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
    const summary = document.getElementById("selectionSummary");
    if (summary) summary.textContent = `${branchName} • Semester ${selectedSemester}`;

    const heading = document.getElementById("resourceHeading");
    if (heading) heading.textContent = search ? "Search results" : (selectedSubject || "Resources");

    const count = document.getElementById("resourceCount");
    if (count) count.textContent = resources.length;

    // Apply pagination constraint limit
    const paginatedResources = resources.slice(0, displayedResourceLimit);
    const loadMoreContainer = document.getElementById("loadMoreContainer");
    if (loadMoreContainer) {
        if (resources.length > displayedResourceLimit) {
            loadMoreContainer.classList.remove("hidden");
        } else {
            loadMoreContainer.classList.add("hidden");
        }
    }

    if (!paginatedResources.length) {
        list.innerHTML = `
            <div class="empty-state">
                <strong>No resources found</strong>
                <span>Faculty materials will appear here after they are uploaded.</span>
            </div>
        `;
        return;
    }

    list.innerHTML = paginatedResources.map(resource => `
        <div class="resource-item">
            <div class="file-icon">PDF</div>
            <div class="resource-info">
                <strong title="${escapeHTML(resource.title)}">${escapeHTML(resource.title)}</strong>
                <div class="resource-meta">
                    ${escapeHTML(resource.type)} • ${escapeHTML(resource.date)}
                    ${resource.description ? ` • ${escapeHTML(resource.description)}` : ""}
                </div>
            </div>
            <button type="button" class="download-btn" data-storage="${escapeHTML(resource.storage_path || '')}" data-file="${escapeHTML(resource.file)}">
                Download
            </button>
        </div>
    `).join("");

    list.querySelectorAll(".download-btn").forEach(button => {
        button.addEventListener("click", () => {
            downloadResourceFile(button.dataset.storage, button.dataset.file);
        });
    });
}

function loadMoreResources() {
    displayedResourceLimit += RESOURCE_PAGE_SIZE;
    renderResources();
}

/* =========================================================
   PDF DOWNLOAD FROM SUPABASE STORAGE
   ========================================================= */

async function downloadResourceFile(storagePath, fileName) {
    if (!storagePath) {
        showToast(`Demo mode: Downloading "${fileName}"`);
        return;
    }

    try {
        showToast("Generating download link...");
        const { data, error } = await supabaseClient.storage
            .from("notes-bucket")
            .createSignedUrl(storagePath, 60);

        if (error || !data?.signedUrl) throw error || new Error("Could not create signed download URL.");

        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();

        showToast("Download started successfully.");
    } catch (err) {
        console.error("Download error:", err);
        showToast("Unable to download file. Please try again.");
    }
}

/* =========================================================
   TEACHER PDF UPLOAD & PROGRESS BAR FEEDBACK
   ========================================================= */

async function handleTeacherUpload(event) {
    event.preventDefault();

    if (!currentProfile || currentRole !== "teacher") {
        showToast("Unauthorized: Faculty login required.");
        return;
    }

    const fileInput = document.getElementById("uploadFile");
    const file = fileInput?.files?.[0];

    if (!file) {
        showToast("Please choose a PDF file.");
        return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Only PDF files are allowed.");
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showToast("Please keep the PDF below 20 MB.");
        return;
    }

    const branchCode = document.getElementById("uploadBranch").value;
    const semesterNumber = document.getElementById("uploadSemester").value;
    const subjectName = document.getElementById("uploadSubject").value;
    const title = document.getElementById("uploadTitle").value.trim();
    const description = document.getElementById("uploadDescription").value.trim();

    // Elements for progress feedback
    const progressContainer = document.getElementById("uploadProgressContainer");
    const progressBar = document.getElementById("uploadProgressBar");
    const progressPercent = document.getElementById("uploadProgressPercent");
    const uploadSubmitBtn = document.getElementById("uploadSubmitBtn");

    try {
        if (progressContainer) progressContainer.classList.remove("hidden");
        if (uploadSubmitBtn) uploadSubmitBtn.disabled = true;

        // Simulate progress intervals for smoother UI feedback
        let progress = 10;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressPercent) progressPercent.textContent = `${progress}%`;

        const progressInterval = setInterval(() => {
            if (progress < 85) {
                progress += 15;
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressPercent) progressPercent.textContent = `${progress}%`;
            }
        }, 200);

        const { data: branchData } = await supabaseClient.from("branches").select("id").eq("code", branchCode).single();
        const { data: semData } = await supabaseClient.from("semesters").select("id").eq("semester_number", Number(semesterNumber)).single();

        let { data: subjectData } = await supabaseClient
            .from("subjects")
            .select("id")
            .eq("branch_id", branchData.id)
            .eq("semester_id", semData.id)
            .eq("name", subjectName)
            .maybeSingle();

        let subjectId = subjectData?.id;
        if (!subjectId) {
            const { data: newSub } = await supabaseClient
                .from("subjects")
                .insert({ branch_id: branchData.id, semester_id: semData.id, name: subjectName })
                .select("id")
                .single();
            subjectId = newSub.id;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const storagePath = `${branchCode}/${semesterNumber}/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from("notes-bucket")
            .upload(storagePath, file);

        clearInterval(progressInterval);
        if (progressBar) progressBar.style.width = `100%`;
        if (progressPercent) progressPercent.textContent = `100%`;

        if (uploadError) throw uploadError;

        const notePayload = {
            title: title,
            description: description || null,
            branch_id: branchData.id,
            semester_id: semData.id,
            subject_id: subjectId,
            teacher_id: currentProfile.id,
            file_name: file.name,
            storage_path: storagePath,
            file_size: file.size,
            status: "published"
        };

        const { error: noteError } = await supabaseClient.from("notes").insert(notePayload);
        if (noteError) throw noteError;

        event.target.reset();
        document.getElementById("fileName").textContent = "PDF up to 20 MB";
        
        updateTeacherUploadCount();
        loadTeacherUploads();
        showToast("PDF uploaded and published successfully!");

    } catch (err) {
        console.error("Upload failed:", err);
        showToast(err.message || "File upload failed.");
    } finally {
        if (uploadSubmitBtn) uploadSubmitBtn.disabled = false;
        setTimeout(() => {
            if (progressContainer) progressContainer.classList.add("hidden");
            if (progressBar) progressBar.style.width = `0%`;
        }, 1200);
    }
}

async function loadTeacherUploads() {
    const listContainer = document.getElementById("teacherUploadsList");
    if (!listContainer || !currentProfile || currentRole !== "teacher") return;

    try {
        const { data: notesData, error } = await supabaseClient
            .from("notes")
            .select("*")
            .eq("teacher_id", currentProfile.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!notesData || notesData.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <strong>No files uploaded yet</strong>
                    <span>Your uploaded study materials will appear here.</span>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = notesData.map(note => `
            <div class="resource-item">
                <div class="file-icon">PDF</div>
                <div class="resource-info">
                    <strong title="${escapeHTML(note.title)}">${escapeHTML(note.title)}</strong>
                    <div class="resource-meta">
                        ${escapeHTML(note.file_name)} • ${(note.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                </div>
                <button type="button" class="download-btn" style="background: var(--danger, #f04438);" onclick="deleteTeacherNote('${note.id}', '${escapeHTML(note.storage_path)}')">
                    Delete
                </button>
            </div>
        `).join("");

    } catch (err) {
        console.error("Error loading teacher uploads:", err);
    }
}

async function deleteTeacherNote(noteId, storagePath) {
    const confirmed = confirm("Are you sure you want to permanently delete this file? This cannot be undone.");
    if (!confirmed) return;

    try {
        showToast("Deleting file from storage and database...");

        if (storagePath) {
            await supabaseClient.storage.from("notes-bucket").remove([storagePath]);
        }

        const { error: dbError } = await supabaseClient.from("notes").delete().eq("id", noteId);
        if (dbError) throw dbError;

        showToast("File deleted successfully.");
        updateTeacherUploadCount();
        loadTeacherUploads();

    } catch (err) {
        console.error("Delete failed:", err);
        showToast(err.message || "Failed to delete resource.");
    }
}

async function updateTeacherUploadCount() {
    if (!currentProfile || currentRole !== "teacher") return;

    try {
        const { count, error } = await supabaseClient
            .from("notes")
            .select("*", { count: "exact", head: true })
            .eq("teacher_id", currentProfile.id);

        if (!error && count !== null) {
            const countEl = document.getElementById("teacherUploadUploadCount") || document.getElementById("teacherUploadCount");
            if (countEl) countEl.textContent = count;
        }
    } catch (err) {
        console.error("Count fetch error:", err);
    }
}

/* =========================================================
   SUBJECTS MAPPINGS & NAVIGATION UTILITIES
   ========================================================= */

function getSubjects(branch, semester) {
    return SUBJECTS?.[branch]?.[semester] || ["General Subject"];
}

function getBranchName(code) {
    return BRANCHES.find(branch => branch.code === code)?.name || code;
}

function updateTeacherSubjects() {
    const branch = document.getElementById("uploadBranch")?.value;
    const semester = document.getElementById("uploadSemester")?.value;
    const select = document.getElementById("uploadSubject");
    if (!select) return;

    const subjects = getSubjects(branch, semester);
    select.innerHTML = subjects.map(subject => `
        <option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>
    `).join("");
}

async function switchProfile() {
    const confirmed = confirm("Do you want to sign out?");
    if (!confirmed) return;
    await logoutUser();
}

function goHome(event) {
    if (event) event.preventDefault();
    if (currentRole === "student") {
        openStudentDashboard();
    } else if (currentRole === "teacher") {
        openTeacherDashboard();
    } else {
        showView("roleView");
    }
}

function showView(id) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) {
        console.log(message);
        return;
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
