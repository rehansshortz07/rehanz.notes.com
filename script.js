/* =========================================================
   UniNotes Frontend
   Supabase connection + current demo functionality
========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    "https://vxzsqdrcuwesorystkdn.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_amVCeTz9-6L4rKdvJqIn_A_QJ7J3Tc3";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =========================================================
   STATIC BRANCH DATA
========================================================= */

const BRANCHES = [
    {
        code: "CSE",
        name: "Computer Science Engineering",
        short: "CSE"
    },
    {
        code: "ECE",
        name: "Electronics & Communication",
        short: "ECE"
    },
    {
        code: "ME",
        name: "Mechanical Engineering",
        short: "Mechanical"
    },
    {
        code: "CE",
        name: "Civil Engineering",
        short: "Civil"
    },
    {
        code: "AE",
        name: "Aeronautical Engineering",
        short: "Aeronautical"
    }
];


/* =========================================================
   SUBJECT DATA
========================================================= */

const SUBJECTS = {

    CSE: {
        1: [
            "Programming for Problem Solving",
            "Engineering Mathematics I",
            "Engineering Physics",
            "Engineering Chemistry"
        ],
        2: [
            "Data Structures",
            "Engineering Mathematics II",
            "Digital Logic",
            "Computer Organization"
        ],
        3: [
            "Database Management Systems",
            "Object Oriented Programming",
            "Operating Systems",
            "Computer Networks"
        ],
        4: [
            "Design & Analysis of Algorithms",
            "Software Engineering",
            "Microprocessors",
            "Web Technology"
        ]
    },

    ECE: {
        1: [
            "Programming for Problem Solving",
            "Engineering Mathematics I",
            "Engineering Physics",
            "Basic Electronics"
        ],
        2: [
            "Network Analysis",
            "Engineering Mathematics II",
            "Digital Electronics",
            "Signals & Systems"
        ],
        3: [
            "Analog Electronics",
            "Electromagnetic Theory",
            "Electronic Devices",
            "Microcontrollers"
        ],
        4: [
            "Communication Systems",
            "Digital Signal Processing",
            "VLSI Design",
            "Control Systems"
        ]
    },

    ME: {
        1: [
            "Engineering Mathematics I",
            "Engineering Physics",
            "Engineering Chemistry",
            "Programming for Problem Solving"
        ],
        2: [
            "Engineering Mathematics II",
            "Engineering Mechanics",
            "Manufacturing Processes",
            "Material Science"
        ],
        3: [
            "Thermodynamics",
            "Automobile Engineering",
            "Fluid Mechanics",
            "Manufacturing Technology",
            "Machine Design"
        ],
        4: [
            "Heat Transfer",
            "Dynamics of Machinery",
            "Metrology",
            "Design of Machine Elements"
        ],
        5: [
            "Internal Combustion Engines",
            "Refrigeration & Air Conditioning",
            "CAD/CAM",
            "Industrial Engineering"
        ],
        6: [
            "Finite Element Analysis",
            "Advanced Manufacturing",
            "Mechatronics",
            "Automobile Engineering II"
        ]
    },

    CE: {
        1: [
            "Engineering Mathematics I",
            "Engineering Physics",
            "Engineering Chemistry",
            "Engineering Drawing"
        ],
        2: [
            "Surveying",
            "Engineering Mathematics II",
            "Building Materials",
            "Strength of Materials"
        ],
        3: [
            "Structural Analysis",
            "Fluid Mechanics",
            "Geotechnical Engineering",
            "Concrete Technology"
        ],
        4: [
            "Design of RCC Structures",
            "Transportation Engineering",
            "Environmental Engineering",
            "Hydrology"
        ]
    },

    AE: {
        1: [
            "Engineering Mathematics I",
            "Engineering Physics",
            "Engineering Chemistry",
            "Engineering Drawing"
        ],
        2: [
            "Engineering Mathematics II",
            "Engineering Mechanics",
            "Thermodynamics",
            "Materials Science"
        ],
        3: [
            "Aerodynamics I",
            "Aircraft Structures I",
            "Aircraft Propulsion",
            "Flight Mechanics"
        ],
        4: [
            "Aerodynamics II",
            "Aircraft Structures II",
            "Avionics",
            "Aerospace Manufacturing"
        ]
    }
};


/* =========================================================
   DEFAULT DEMO RESOURCES
========================================================= */

const DEFAULT_RESOURCES = [

    {
        id: 1,
        branch: "ME",
        semester: "3",
        subject: "Thermodynamics",
        type: "Lecture Notes",
        title: "Thermodynamics — Unit 1 Notes",
        description: "First law, systems and properties",
        file: "thermodynamics-unit1.pdf",
        date: "2026-08-09"
    },

    {
        id: 2,
        branch: "ME",
        semester: "3",
        subject: "Thermodynamics",
        type: "Question Paper",
        title: "Thermodynamics — Important Questions",
        description: "Unit-wise preparation questions",
        file: "thermodynamics-important.pdf",
        date: "2026-08-08"
    },

    {
        id: 3,
        branch: "ME",
        semester: "3",
        subject: "Automobile Engineering",
        type: "Lecture Notes",
        title: "Automobile Engineering — Unit 1",
        description: "Introduction and vehicle systems",
        file: "automobile-unit1.pdf",
        date: "2026-08-09"
    },

    {
        id: 4,
        branch: "ME",
        semester: "3",
        subject: "Fluid Mechanics",
        type: "Lecture Notes",
        title: "Fluid Mechanics — Fundamentals",
        description: "Fluid properties and pressure",
        file: "fluid-fundamentals.pdf",
        date: "2026-08-07"
    },

    {
        id: 5,
        branch: "CSE",
        semester: "1",
        subject: "Programming for Problem Solving",
        type: "Lecture Notes",
        title: "C Programming — Unit 1",
        description: "Programming fundamentals",
        file: "c-unit1.pdf",
        date: "2026-08-06"
    },

    {
        id: 6,
        branch: "ECE",
        semester: "3",
        subject: "Analog Electronics",
        type: "Lecture Notes",
        title: "Analog Electronics — Diodes",
        description: "PN junction and diode applications",
        file: "diodes.pdf",
        date: "2026-08-05"
    }
];


/* =========================================================
   APPLICATION STATE
========================================================= */

let currentRole = null;
let currentProfile = null;

let selectedBranch = "ME";
let selectedSemester = "3";
let selectedSubject = "Thermodynamics";

let toastTimer = null;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeTheme();

    buildStaticControls();

    bindForms();

    bindFileInput();

    restoreProfile();

    testSupabaseConnection();

});


/* =========================================================
   SUPABASE CONNECTION TEST
========================================================= */

async function testSupabaseConnection() {

    try {

        const { data, error } = await supabaseClient
            .from("branches")
            .select("*");

        if (error) {

            console.error(
                "Supabase connection/database error:",
                error
            );

            return;
        }

        console.log("✅ UniNotes: Supabase connected");

        console.table(data);

    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );

    }
}


/* =========================================================
   THEME
========================================================= */

function initializeTheme() {

    const savedTheme =
        localStorage.getItem("uninotes_theme");

    const systemDark =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

    applyTheme(
        savedTheme ||
        (systemDark ? "dark" : "light")
    );
}


function applyTheme(theme) {

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    localStorage.setItem(
        "uninotes_theme",
        theme
    );

    const icon =
        document.getElementById("themeIcon");

    if (icon) {

        icon.textContent =
            theme === "dark" ? "☀" : "☾";
    }
}


/* =========================================================
   THEME BUTTON
========================================================= */

const themeToggle =
    document.getElementById("themeToggle");

if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        () => {

            const current =
                document.documentElement
                    .getAttribute("data-theme") ||
                "light";

            applyTheme(
                current === "dark"
                    ? "light"
                    : "dark"
            );

        }
    );

}


/* =========================================================
   BUILD BRANCH / SEMESTER CONTROLS
========================================================= */

function buildStaticControls() {

    const branchGrid =
        document.getElementById("branchGrid");

    const semesterGrid =
        document.getElementById("semesterGrid");

    const uploadBranch =
        document.getElementById("uploadBranch");

    const uploadSemester =
        document.getElementById("uploadSemester");


    if (!branchGrid ||
        !semesterGrid ||
        !uploadBranch ||
        !uploadSemester) {

        console.error(
            "UniNotes: Required UI elements are missing."
        );

        return;
    }


    branchGrid.innerHTML =
        BRANCHES.map(branch => `

            <button
                type="button"
                data-branch="${branch.code}"
                onclick="selectBranch('${branch.code}')">

                ${escapeHTML(branch.short)}

            </button>

        `).join("");


    semesterGrid.innerHTML =
        Array.from(
            { length: 8 },
            (_, i) => `

                <button
                    type="button"
                    data-semester="${i + 1}"
                    onclick="selectSemester('${i + 1}')">

                    Sem ${i + 1}

                </button>

            `
        ).join("");


    uploadBranch.innerHTML =
        BRANCHES.map(branch => `

            <option value="${branch.code}">
                ${escapeHTML(branch.name)}
            </option>

        `).join("");


    uploadSemester.innerHTML =
        Array.from(
            { length: 8 },
            (_, i) => `

                <option value="${i + 1}">
                    Semester ${i + 1}
                </option>

            `
        ).join("");


    uploadBranch.addEventListener(
        "change",
        updateTeacherSubjects
    );


    uploadSemester.addEventListener(
        "change",
        updateTeacherSubjects
    );


    updateTeacherSubjects();

    updateSelectionButtons();

}


/* =========================================================
   FORM EVENTS
========================================================= */

function bindForms() {

    const studentForm =
        document.getElementById("studentForm");

    const teacherForm =
        document.getElementById("teacherForm");

    const uploadForm =
        document.getElementById("uploadForm");


    if (studentForm) {

        studentForm.addEventListener(
            "submit",
            handleStudentSubmit
        );

    }


    if (teacherForm) {

        teacherForm.addEventListener(
            "submit",
            handleTeacherSubmit
        );

    }


    if (uploadForm) {

        uploadForm.addEventListener(
            "submit",
            handleDemoUpload
        );

    }

}


/* =========================================================
   FILE INPUT
========================================================= */

function bindFileInput() {

    const uploadFile =
        document.getElementById("uploadFile");

    if (!uploadFile) return;


    uploadFile.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];

            const fileName =
                document.getElementById("fileName");

            if (!fileName) return;


            fileName.textContent = file
                ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
                : "PDF up to 20 MB";

        }
    );

}


/* =========================================================
   ROLE SELECTION
========================================================= */

function selectRole(role) {

    currentRole = role;

    if (role === "student") {

        showView("studentSetupView");

    } else {

        showView("teacherSetupView");

    }

}


/* =========================================================
   STUDENT PROFILE
========================================================= */

function handleStudentSubmit(event) {

    event.preventDefault();


    const profile = {

        name:
            document.getElementById(
                "studentName"
            ).value.trim(),

        id:
            document.getElementById(
                "studentId"
            ).value.trim(),

        branch:
            document.getElementById(
                "studentBranch"
            ).value,

        semester:
            document.getElementById(
                "studentSemester"
            ).value

    };


    if (
        !profile.name ||
        !profile.id ||
        !profile.branch ||
        !profile.semester
    ) {

        return;

    }


    currentRole = "student";

    currentProfile = profile;


    localStorage.setItem(
        "uninotes_profile",
        JSON.stringify(profile)
    );

    localStorage.setItem(
        "uninotes_role",
        "student"
    );


    selectedBranch = profile.branch;

    selectedSemester = profile.semester;


    const subjects =
        getSubjects(
            selectedBranch,
            selectedSemester
        );

    selectedSubject =
        subjects[0] || "";


    openStudentDashboard();

    showToast(
        "Student profile saved."
    );

}


/* =========================================================
   TEACHER DEMO PROFILE
========================================================= */

function handleTeacherSubmit(event) {

    event.preventDefault();


    const profile = {

        name:
            document.getElementById(
                "teacherName"
            ).value.trim(),

        id:
            document.getElementById(
                "teacherId"
            ).value.trim(),

        branch:
            document.getElementById(
                "teacherBranch"
            ).value

    };


    if (
        !profile.name ||
        !profile.id ||
        !profile.branch
    ) {

        return;

    }


    currentRole = "teacher";

    currentProfile = profile;


    localStorage.setItem(
        "uninotes_profile",
        JSON.stringify(profile)
    );

    localStorage.setItem(
        "uninotes_role",
        "teacher"
    );


    openTeacherDashboard();

    showToast(
        "Faculty profile saved. Demo mode enabled."
    );

}


/* =========================================================
   RESTORE PROFILE
========================================================= */

function restoreProfile() {

    const savedRole =
        localStorage.getItem(
            "uninotes_role"
        );

    const savedProfile =
        localStorage.getItem(
            "uninotes_profile"
        );


    if (
        !savedRole ||
        !savedProfile
    ) {

        return;

    }


    try {

        currentRole = savedRole;

        currentProfile =
            JSON.parse(savedProfile);


        if (savedRole === "student") {

            selectedBranch =
                currentProfile.branch ||
                "ME";

            selectedSemester =
                currentProfile.semester ||
                "3";


            const subjects =
                getSubjects(
                    selectedBranch,
                    selectedSemester
                );


            selectedSubject =
                subjects[0] || "";


            openStudentDashboard();


        } else if (
            savedRole === "teacher"
        ) {

            openTeacherDashboard();

        }


    } catch (error) {

        console.error(
            "Profile restore error:",
            error
        );


        localStorage.removeItem(
            "uninotes_role"
        );

        localStorage.removeItem(
            "uninotes_profile"
        );

    }

}


/* =========================================================
   STUDENT DASHBOARD
========================================================= */

function openStudentDashboard() {

    const name =
        currentProfile?.name ||
        "Student";


    const welcome =
        document.getElementById(
            "studentWelcome"
        );


    if (welcome) {

        welcome.textContent =
            `Welcome, ${name}`;

    }


    setAvatar(
        "dashboardAvatar",
        name
    );


    updateHeaderForRole(
        "student"
    );


    renderSubjects();

    renderResources();

    showView(
        "studentDashboardView"
    );

}


/* =========================================================
   TEACHER DASHBOARD
========================================================= */

function openTeacherDashboard() {

    const name =
        currentProfile?.name ||
        "Faculty";


    const welcome =
        document.getElementById(
            "teacherWelcome"
        );


    if (welcome) {

        welcome.textContent =
            `Welcome, ${name}`;

    }


    setAvatar(
        "teacherAvatar",
        name
    );


    const uploadBranch =
        document.getElementById(
            "uploadBranch"
        );


    if (uploadBranch) {

        uploadBranch.value =
            currentProfile?.branch ||
            "ME";

    }


    updateTeacherSubjects();

    updateHeaderForRole(
        "teacher"
    );

    updateTeacherUploadCount();


    showView(
        "teacherDashboardView"
    );

}


/* =========================================================
   HEADER
========================================================= */

function updateHeaderForRole(role) {

    const badge =
        document.getElementById(
            "roleBadge"
        );

    const profileBtn =
        document.getElementById(
            "profileBtn"
        );


    if (badge) {

        badge.classList.remove(
            "hidden"
        );

        badge.textContent =
            role === "student"
                ? "Student"
                : "Faculty";

    }


    if (profileBtn) {

        profileBtn.classList.remove(
            "hidden"
        );

    }


    const profileName =
        document.getElementById(
            "profileName"
        );


    if (profileName) {

        profileName.textContent =
            currentProfile?.name ||
            "Profile";

    }


    setAvatar(
        "profileAvatar",
        currentProfile?.name || "U"
    );

}


/* =========================================================
   AVATAR
========================================================= */

function setAvatar(
    elementId,
    name
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            (name || "U")
                .trim()
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================================
   BRANCH SELECTION
========================================================= */

function selectBranch(branch) {

    selectedBranch = branch;


    const subjects =
        getSubjects(
            branch,
            selectedSemester
        );


    selectedSubject =
        subjects[0] || "";


    updateSelectionButtons();

    renderSubjects();

    renderResources();

}


/* =========================================================
   SEMESTER SELECTION
========================================================= */

function selectSemester(semester) {

    selectedSemester =
        String(semester);


    const subjects =
        getSubjects(
            selectedBranch,
            selectedSemester
        );


    selectedSubject =
        subjects[0] || "";


    updateSelectionButtons();

    renderSubjects();

    renderResources();

}


/* =========================================================
   SELECTED BUTTONS
========================================================= */

function updateSelectionButtons() {

    document
        .querySelectorAll(
            "#branchGrid button"
        )
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.branch ===
                selectedBranch
            );

        });


    document
        .querySelectorAll(
            "#semesterGrid button"
        )
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.semester ===
                String(selectedSemester)
            );

        });

}


/* =========================================================
   SUBJECTS
========================================================= */

function renderSubjects() {

    const grid =
        document.getElementById(
            "subjectGrid"
        );


    if (!grid) return;


    const subjects =
        getSubjects(
            selectedBranch,
            selectedSemester
        );


    const subjectCount =
        document.getElementById(
            "subjectCount"
        );


    if (subjectCount) {

        subjectCount.textContent =
            subjects.length;

    }


    if (!subjects.length) {

        grid.innerHTML = `

            <div
                class="empty-state"
                style="grid-column:1/-1">

                <strong>
                    No subjects added yet
                </strong>

                <span>
                    Subjects can be connected
                    from Supabase later.
                </span>

            </div>

        `;

        return;

    }


    grid.innerHTML =
        subjects.map(
            (subject, index) => `

                <button
                    type="button"
                    class="subject-card ${
                        subject === selectedSubject
                            ? "selected"
                            : ""
                    }"
                    onclick="selectSubject(${JSON.stringify(subject)})">

                    <span class="subject-icon">
                        ${index % 2 === 0
                            ? "▣"
                            : "◈"}
                    </span>

                    <strong>
                        ${escapeHTML(subject)}
                    </strong>

                    <small>
                        ${getResourceCount(
                            selectedBranch,
                            selectedSemester,
                            subject
                        )}
                        resources
                    </small>

                </button>

            `
        )
        .join("");

}


/* =========================================================
   SUBJECT SELECTION
========================================================= */

function selectSubject(subject) {

    selectedSubject = subject;

    renderSubjects();

    renderResources();


    document
        .querySelector(
            ".resources-section"
        )
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}


/* =========================================================
   RESOURCES
========================================================= */

function renderResources() {

    const list =
        document.getElementById(
            "resourceList"
        );


    if (!list) return;


    const searchElement =
        document.getElementById(
            "resourceSearch"
        );


    const search =
        searchElement
            ? searchElement.value
                .trim()
                .toLowerCase()
            : "";


    const allResources =
        getResources();


    let resources =
        allResources.filter(
            item =>
                item.branch ===
                    selectedBranch &&

                String(item.semester) ===
                    String(selectedSemester) &&

                item.subject ===
                    selectedSubject
        );


    if (search) {

        resources =
            allResources.filter(item => {

                const haystack =
                    `${item.title} ${
                        item.subject
                    } ${
                        item.type
                    } ${
                        item.description || ""
                    }`.toLowerCase();


                return haystack.includes(
                    search
                );

            });

    }


    const branchName =
        getBranchName(
            selectedBranch
        );


    const selectionSummary =
        document.getElementById(
            "selectionSummary"
        );


    if (selectionSummary) {

        selectionSummary.textContent =
            `${branchName} • Semester ${selectedSemester}`;

    }


    const resourceHeading =
        document.getElementById(
            "resourceHeading"
        );


    if (resourceHeading) {

        resourceHeading.textContent =
            search
                ? "Search results"
                : (
                    selectedSubject ||
                    "Resources"
                );

    }


    const resourceSubheading =
        document.getElementById(
            "resourceSubheading"
        );


    if (resourceSubheading) {

        resourceSubheading.textContent =
            search
                ? `Results matching "${search}"`
                : "Study materials available for this subject.";

    }


    const resourceCount =
        document.getElementById(
            "resourceCount"
        );


    if (resourceCount) {

        resourceCount.textContent =
            resources.length;

    }


    if (!resources.length) {

        list.innerHTML = `

            <div class="empty-state">

                <strong>
                    No resources found
                </strong>

                <span>
                    Faculty materials will appear
                    here after they are uploaded.
                </span>

            </div>

        `;

        return;

    }


    list.innerHTML =
        resources.map(
            resource => `

                <div class="resource-item">

                    <div class="file-icon">
                        PDF
                    </div>

                    <div class="resource-info">

                        <strong
                            title="${escapeHTML(
                                resource.title
                            )}">

                            ${escapeHTML(
                                resource.title
                            )}

                        </strong>

                        <div class="resource-meta">

                            ${escapeHTML(
                                resource.type
                            )}

                            • ${escapeHTML(
                                resource.date
                            )}

                            ${
                                resource.description
                                    ? ` • ${escapeHTML(
                                        resource.description
                                    )}`
                                    : ""
                            }

                        </div>

                    </div>

                    <button
                        type="button"
                        class="download-btn"
                        onclick="demoDownload('${escapeJS(
                            resource.file
                        )}')">

                        Download

                    </button>

                </div>

            `
        )
        .join("");

}


/* =========================================================
   TEACHER SUBJECTS
========================================================= */

function updateTeacherSubjects() {

    const branchElement =
        document.getElementById(
            "uploadBranch"
        );

    const semesterElement =
        document.getElementById(
            "uploadSemester"
        );

    const select =
        document.getElementById(
            "uploadSubject"
        );


    if (
        !branchElement ||
        !semesterElement ||
        !select
    ) {

        return;

    }


    const branch =
        branchElement.value;

    const semester =
        semesterElement.value;


    const subjects =
        getSubjects(
            branch,
            semester
        );


    select.innerHTML =
        subjects.length

            ? subjects.map(
                subject => `

                    <option value="${escapeHTML(
                        subject
                    )}">

                        ${escapeHTML(
                            subject
                        )}

                    </option>

                `
            ).join("")

            : `
                <option value="">
                    No subjects available
                </option>
            `;

}


/* =========================================================
   DEMO UPLOAD
========================================================= */

function handleDemoUpload(event) {

    event.preventDefault();


    const fileInput =
        document.getElementById(
            "uploadFile"
        );


    const file =
        fileInput?.files[0];


    if (!file) {

        showToast(
            "Please choose a PDF file."
        );

        return;

    }


    if (
        file.type !== "application/pdf" &&
        !file.name
            .toLowerCase()
            .endsWith(".pdf")
    ) {

        showToast(
            "Only PDF files are allowed."
        );

        return;

    }


    if (
        file.size >
        20 * 1024 * 1024
    ) {

        showToast(
            "Please keep the PDF below 20 MB."
        );

        return;

    }


    const resource = {

        id: Date.now(),

        branch:
            document.getElementById(
                "uploadBranch"
            ).value,

        semester:
            document.getElementById(
                "uploadSemester"
            ).value,

        subject:
            document.getElementById(
                "uploadSubject"
            ).value,

        type:
            document.getElementById(
                "uploadType"
            ).value,

        title:
            document.getElementById(
                "uploadTitle"
            ).value.trim(),

        description:
            document.getElementById(
                "uploadDescription"
            ).value.trim(),

        file:
            file.name,

        date:
            new Date()
                .toISOString()
                .slice(0, 10)

    };


    const uploaded =
        JSON.parse(
            localStorage.getItem(
                "uninotes_uploaded"
            ) || "[]"
        );


    uploaded.push(resource);


    localStorage.setItem(
        "uninotes_uploaded",
        JSON.stringify(uploaded)
    );


    event.target.reset();


    const uploadBranch =
        document.getElementById(
            "uploadBranch"
        );


    if (uploadBranch) {

        uploadBranch.value =
            currentProfile?.branch ||
            "ME";

    }


    const uploadSemester =
        document.getElementById(
            "uploadSemester"
        );


    if (uploadSemester) {

        uploadSemester.value = "1";

    }


    updateTeacherSubjects();


    const fileName =
        document.getElementById(
            "fileName"
        );


    if (fileName) {

        fileName.textContent =
            "PDF up to 20 MB";

    }


    updateTeacherUploadCount();


    showToast(
        "Demo upload saved locally. Supabase Storage will replace this later."
    );

}


/* =========================================================
   GET RESOURCES
========================================================= */

function getResources() {

    const uploaded =
        JSON.parse(
            localStorage.getItem(
                "uninotes_uploaded"
            ) || "[]"
        );


    return [
        ...uploaded,
        ...DEFAULT_RESOURCES
    ];

}


/* =========================================================
   RESOURCE COUNT
========================================================= */

function getResourceCount(
    branch,
    semester,
    subject
) {

    return getResources().filter(
        resource =>
            resource.branch === branch &&
            String(resource.semester) ===
                String(semester) &&
            resource.subject === subject
    ).length;

}


/* =========================================================
   TEACHER UPLOAD COUNT
========================================================= */

function updateTeacherUploadCount() {

    const count =
        JSON.parse(
            localStorage.getItem(
                "uninotes_uploaded"
            ) || "[]"
        ).length;


    const element =
        document.getElementById(
            "teacherUploadCount"
        );


    if (element) {

        element.textContent =
            count;

    }

}


/* =========================================================
   SUBJECT HELPER
========================================================= */

function getSubjects(
    branch,
    semester
) {

    return (
        SUBJECTS[branch] &&
        SUBJECTS[branch][semester]
    ) || [];

}


/* =========================================================
   BRANCH NAME
========================================================= */

function getBranchName(code) {

    const branch =
        BRANCHES.find(
            branch =>
                branch.code === code
        );


    return branch?.name || code;

}


/* =========================================================
   DEMO DOWNLOAD
========================================================= */

function demoDownload(fileName) {

    showToast(
        `Demo mode: "${fileName}" will download once Supabase Storage is connected.`
    );

}


/* =========================================================
   SWITCH PROFILE
========================================================= */

function switchProfile() {

    localStorage.removeItem(
        "uninotes_role"
    );

    localStorage.removeItem(
        "uninotes_profile"
    );


    currentRole = null;

    currentProfile = null;


    const profileBtn =
        document.getElementById(
            "profileBtn"
        );

    const roleBadge =
        document.getElementById(
            "roleBadge"
        );


    if (profileBtn) {

        profileBtn.classList.add(
            "hidden"
        );

    }


    if (roleBadge) {

        roleBadge.classList.add(
            "hidden"
        );

    }


    showView("roleView");


    showToast(
        "Profile switched."
    );

}


/* =========================================================
   HOME
========================================================= */

function goHome(event) {

    if (event) {

        event.preventDefault();

    }


    if (currentRole === "student") {

        openStudentDashboard();

    }

    else if (currentRole === "teacher") {

        openTeacherDashboard();

    }

    else {

        showView("roleView");

    }

}


/* =========================================================
   SHOW VIEW
========================================================= */

function showView(id) {

    document
        .querySelectorAll(".view")
        .forEach(view => {

            view.classList.remove(
                "active"
            );

        });


    const target =
        document.getElementById(id);


    if (target) {

        target.classList.add(
            "active"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        console.log(message);

        return;

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () =>
                toast.classList.remove(
                    "show"
                ),
            3200
        );

}


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   JAVASCRIPT STRING ESCAPING
========================================================= */

function escapeJS(value) {

    return String(value ?? "")
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        );

}
