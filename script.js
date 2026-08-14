/* =========================================================
   UniNotes - Complete Supabase & Backblaze B2 Integration
   ========================================================= */

"use strict";

/* =========================================================
   CLOUDFLARE PDF STORAGE API CONFIGURATION
   ========================================================= */

const PDF_API_URL = "https://uninotes-pdf-api.rehanshaikh15288.workers.dev";

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

/* =========================================================
   APPLICATION STATE
   ========================================================= */

let currentRole = null;
let currentProfile = null;

let selectedBranch = "ME";
let selectedSemester = "3";

let toastTimer = null;

// Pagination State
let displayedResourceLimit = 5;
const RESOURCE_PAGE_SIZE = 5;

/* =========================================================
   DOM INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Learn-Engineering starting...");
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
    e.preventDefault();
    deferredPrompt = e;
    
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const installBtn = document.getElementById("installBtn");
    
    if (installBtn && !isStandalone) {
        installBtn.classList.remove("hidden");
    }
});

function bindInstallButton() {
    const installBtn = document.getElementById("installBtn");
    if (!installBtn) return;

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
        
        deferredPrompt.prompt();
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

window.addEventListener("DOMContentLoaded", () => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const installBtn = document.getElementById("installBtn");
    
    if (installBtn) {
        if (isStandalone) {
            installBtn.classList.add("hidden");
        } else {
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
    }

    if (uploadSemester) {
        uploadSemester.innerHTML = Array.from({ length: 8 }, (_, index) => `
            <option value="${index + 1}">Semester ${index + 1}</option>
        `).join("");
    }

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
    displayedResourceLimit = RESOURCE_PAGE_SIZE;
    updateSelectionButtons();
    renderResources();
}

function selectSemester(semester) {
    selectedSemester = String(semester);
    displayedResourceLimit = RESOURCE_PAGE_SIZE;
    updateSelectionButtons();
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
   RESOURCES & PAGINATION SUPPORT
   ========================================================= */

async function getResourcesFromDatabase() {
    try {
        const { data: branchData } = await supabaseClient.from("branches").select("id").eq("code", selectedBranch).maybeSingle();
        const { data: semData } = await supabaseClient.from("semesters").select("id").eq("semester_number", Number(selectedSemester)).maybeSingle();

        if (!branchData || !semData) return [];

        const { data: notesData, error } = await supabaseClient
            .from("notes")
            .select("*")
            .eq("branch_id", branchData.id)
            .eq("semester_id", semData.id)
            .eq("status", "published");

        if (error || !notesData) return [];

        return notesData.map(note => ({
            id: note.id,
            branch: selectedBranch,
            semester: selectedSemester,
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
        String(item.semester) === String(selectedSemester)
    );

    if (search) {
        resources = resources.filter(item => {
            const haystack = `${item.title} ${item.type} ${item.description || ""}`.toLowerCase();
            return haystack.includes(search);
        });
    }

    const branchName = getBranchName(selectedBranch);
    const summary = document.getElementById("selectionSummary");
    if (summary) summary.textContent = `${branchName} • Semester ${selectedSemester}`;

    const heading = document.getElementById("resourceHeading");
    if (heading) heading.textContent = search ? "Search results" : `Resources for ${branchName} - Semester ${selectedSemester}`;

    const count = document.getElementById("resourceCount");
    if (count) count.textContent = resources.length;

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
                <span>Faculty materials for this branch and semester will appear here after they are uploaded.</span>
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
   PDF DOWNLOAD THROUGH CLOUDFLARE WORKER (BACKBLAZE B2)
   ========================================================= */

async function downloadResourceFile(storagePath, fileName) {
    if (!storagePath) {
        showToast("File location is missing.");
        return;
    }

    try {
        showToast("Preparing download...");

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) {
            throw new Error("Please sign in again to download this file.");
        }

        const url = `${PDF_API_URL}/download?file=${encodeURIComponent(storagePath)}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) {
            let message = `Download failed (${response.status})`;
            try {
                const errorData = await response.json();
                message = errorData.error || errorData.message || message;
            } catch {}
            throw new Error(message);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = blobUrl;
        link.download = fileName || "document.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 5000);

        showToast("Download started.");

    } catch (error) {
        console.error("PDF download error:", error);
        showToast(error.message || "Unable to download PDF.");
    }
}

/* =========================================================
   CLOUDFLARE WORKER PDF UPLOAD (BACKBLAZE B2)
   ========================================================= */

async function uploadPDFToWorker(file, metadata) {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", metadata.title);
    formData.append("branch", metadata.branch);
    formData.append("semester", metadata.semester);

    const response = await fetch(`${PDF_API_URL}/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.access_token}`
        },
        body: formData
    });

    let result = {};
    const responseText = await response.text();
    
    try {
        result = JSON.parse(responseText);
    } catch {
        throw new Error(`Storage server error (HTTP ${response.status}): ${responseText.slice(0, 100)}`);
    }

    if (!response.ok) {
        throw new Error(result.error || result.message || `Upload failed with HTTP ${response.status}`);
    }

    return result;
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

    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
        showToast("Only PDF files are allowed.");
        return;
    }

    if (file.size <= 0) {
        showToast("The selected PDF is empty.");
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showToast("Please keep the PDF below 20 MB.");
        return;
    }

    const branchCode = document.getElementById("uploadBranch")?.value?.trim() || "";
    const semesterNumber = document.getElementById("uploadSemester")?.value?.trim() || "";
    const title = document.getElementById("uploadTitle")?.value?.trim() || "";

    if (!branchCode || !semesterNumber || !title) {
        showToast("Please fill all required fields.");
        return;
    }

    const progressContainer = document.getElementById("uploadProgressContainer");
    const progressBar = document.getElementById("uploadProgressBar");
    const progressPercent = document.getElementById("uploadProgressPercent");
    const uploadSubmitBtn = document.getElementById("uploadSubmitBtn");

    let progressInterval = null;

    try {
        if (progressContainer) progressContainer.classList.remove("hidden");
        if (uploadSubmitBtn) uploadSubmitBtn.disabled = true;

        let progress = 10;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressPercent) progressPercent.textContent = `${progress}%`;

        progressInterval = setInterval(() => {
            if (progress < 85) {
                progress += 5;
                if (progress > 85) progress = 85;
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressPercent) progressPercent.textContent = `${progress}%`;
            }
        }, 300);

        const { data: branchData, error: branchError } = await supabaseClient
            .from("branches")
            .select("id")
            .eq("code", branchCode)
            .single();

        if (branchError || !branchData) throw new Error("Selected branch was not found.");

        const { data: semData, error: semesterError } = await supabaseClient
            .from("semesters")
            .select("id")
            .eq("semester_number", Number(semesterNumber))
            .single();

        if (semesterError || !semData) throw new Error("Selected semester was not found.");

        console.log("📤 Uploading PDF to Backblaze B2 via Worker...");
        const uploadResult = await uploadPDFToWorker(file, {
            title,
            branch: branchCode,
            semester: semesterNumber
        });

        if (!uploadResult || uploadResult.success !== true) {
            throw new Error(uploadResult?.error || "PDF upload failed.");
        }

        const storagePath = uploadResult.storage_path;
        if (!storagePath) {
            throw new Error("Storage server did not return a storage path.");
        }

        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        if (progressBar) progressBar.style.width = "100%";
        if (progressPercent) progressPercent.textContent = "100%";

        const notePayload = {
            title: title,
            branch_id: branchData.id,
            semester_id: semData.id,
            teacher_id: currentProfile.id,
            file_name: file.name,
            storage_path: storagePath,
            file_size: file.size,
            status: "published"
        };

        const { error: noteError } = await supabaseClient
            .from("notes")
            .insert(notePayload);

        if (noteError) {
            throw new Error(`PDF uploaded, but note record could not be saved: ${noteError.message}`);
        }

        if (event.target) event.target.reset();
        const fileNameElement = document.getElementById("fileName");
        if (fileNameElement) fileNameElement.textContent = "PDF up to 20 MB";

        // Reset branch selection back to faculty's own department if applicable
        const uploadBranchSelect = document.getElementById("uploadBranch");
        if (uploadBranchSelect && currentProfile?.branch) {
            uploadBranchSelect.value = currentProfile.branch;
        }

        try {
            await updateTeacherUploadCount();
            await loadTeacherUploads();
        } catch (error) {
            console.warn("Could not refresh dashboard records:", error);
        }

        showToast("PDF uploaded and published successfully!");

    } catch (err) {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        console.error("❌ Upload failed:", err);
        showToast(err?.message || "File upload failed.");
    } finally {
        if (uploadSubmitBtn) uploadSubmitBtn.disabled = false;
        setTimeout(() => {
            if (progressContainer) progressContainer.classList.add("hidden");
            if (progressBar) progressBar.style.width = "0%";
            if (progressPercent) progressPercent.textContent = "0%";
        }, 1200);
    }
}

/* =========================================================
   LOAD & DELETE TEACHER UPLOADS (BACKBLAZE WORKER CLEANUP)
   ========================================================= */

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

window.deleteTeacherNote = async function(noteId, storagePath) {
    const confirmed = confirm("Are you sure you want to permanently delete this material?");
    if (!confirmed) return;

    try {
        showToast("Deleting resource...");

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) {
            throw new Error("Authentication session expired. Please sign in again.");
        }

        // 1. Delete file from Backblaze B2 via Cloudflare Worker delete route
        if (storagePath) {
            const deleteUrl = `${PDF_API_URL}/delete?file=${encodeURIComponent(storagePath)}`;
            const deleteResponse = await fetch(deleteUrl, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (!deleteResponse.ok) {
                console.warn("Worker deletion warning, proceeding with record removal.");
            }
        }

        // 2. Delete database entry from Supabase
        const { error } = await supabaseClient
            .from("notes")
            .delete()
            .eq("id", noteId);

        if (error) throw error;

        showToast("Resource deleted successfully.");
        
        loadTeacherUploads();
        updateTeacherUploadCount();

    } catch (err) {
        console.error("Delete failed:", err);
        showToast(err.message || "Failed to delete resource.");
    }
};

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
   NAVIGATION UTILITIES
   ========================================================= */

function getBranchName(code) {
    return BRANCHES.find(branch => branch.code === code)?.name || code;
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
