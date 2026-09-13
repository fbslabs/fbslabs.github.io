// =====================================================================
// EDIT THIS FILE to set your course titles/codes, lab titles, and the
// release schedule. Everything else on the site is generated
// automatically from these values.
// =====================================================================

// ---- Courses ---------------------------------------------------------
// `code` MUST match the top-level folder name you use inside the
// Supabase Storage bucket for that course (see README.md).
const COURSES = [
  {
    code: "ES441L",
    title: "Engineering Optimization Lab",
    image: "assets/ES441L.png"
  },
  {
    code: "ES442L",
    title: "Machine Learning Lab",
    image: "assets/ES442L.png"
  },
  {
    code: "ES471L",
    title: "Model Engineering Lab",
    image: "assets/ES471L.png"
  }
];

// ---- Shared lab metadata --------------------------------------------------
// IDs, display names, and open-ended status are shared by every course.
// `id` MUST match the sub-folder name inside each course's Storage folder.
// Titles are stored in the Supabase `lab_settings` table.
const LABS = [
  { id: "lab-01", name: "Lab 1" },
  { id: "lab-02", name: "Lab 2" },
  { id: "lab-03", name: "Lab 3" },
  { id: "lab-04", name: "Lab 4" },
  { id: "lab-05", name: "Lab 5" },
  { id: "lab-06", name: "Lab 6" },
  { id: "lab-07", name: "Lab 7" },
  { id: "lab-08", name: "Lab 8" },
  { id: "lab-09", name: "Lab 9" },
  { id: "lab-10", name: "Lab 10" },
  { id: "lab-11", name: "Lab 11" },
  { id: "open-ended", name: "Open Ended Lab", isOpenEnded: true }
];

// ---- Shared release schedule --------------------------------------------
// One date per lab, in the SAME order as LABS above. Applies to all 3
// courses. A lab becomes visible on/after its date; the previously
// active lab hides itself automatically. Format: "YYYY-MM-DD".
const LAB_SCHEDULE = [
  "2026-09-07", // Lab 1
  "2026-09-14", // Lab 2
  "2026-09-21", // Lab 3
  "2026-09-28", // Lab 4
  "2026-10-05", // Lab 5
  "2026-10-12", // Lab 6
  "2026-11-09", // Lab 7
  "2026-11-16", // Lab 8
  "2026-11-23", // Lab 9
  "2026-11-30", // Lab 10
  "2026-12-07", // Lab 11
  "2026-12-14"  // Open Ended Lab
];

// ---- Weightage (instructor-only — no student-facing control) ------------
// All 11 regular labs share this ONE percentage automatically — change it
// here and every regular lab updates at once, so they can never drift out
// of being equal. The Open Ended Lab has its own, separate percentage.
// These are just numbers you set; the site does not enforce that they add
// up to 100 — that's on you when you edit them.
const REGULAR_LAB_WEIGHTAGE = 3.64;   // % — applies to Lab 1 through Lab 11
const OPEN_ENDED_WEIGHTAGE = 10;   // % — applies only to the Open Ended Lab

// ---- Supabase Storage bucket name ---------------------------------------
// Must match the bucket you create in Supabase (see README.md).
const STORAGE_BUCKET = "lab-portal";
