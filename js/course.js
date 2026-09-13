const params = new URLSearchParams(window.location.search);
const courseCode = params.get("code");
const course = COURSES.find(c => c.code === courseCode);

const container = document.getElementById("lab-container");
const labNav = document.getElementById("lab-nav");
let courseLabs = [];
let selectedLabIndex = 0;

if (!course) {
  document.getElementById("course-title").textContent = "Course not found";
  document.getElementById("course-code").textContent = "";
  container.innerHTML = "<p>Go back and pick a course from the home page.</p>";
} else {
  document.getElementById("course-title").textContent = course.title;
  document.getElementById("course-code").textContent = course.code;
  courseLabs = LABS.map(lab => ({ ...lab, title: "" }));
  selectedLabIndex = Math.max(activeLabIndex(), 0);
  renderNav();
  render();
  loadCourseSettings();
}

async function loadCourseSettings() {
  try {
    const { data, error } = await supabaseClient
      .from("lab_settings")
      .select("lab_id, title")
      .eq("course_code", courseCode);
    if (error) throw error;
    (data || []).forEach(setting => {
      const lab = courseLabs.find(item => item.id === setting.lab_id);
      if (lab && setting.title) lab.title = setting.title;
    });
    renderNav();
    render();
  } catch (err) {
    console.warn("Could not load course settings", err);
  }
}

// Returns the index (into LABS / LAB_SCHEDULE) of the currently active
// lab, or -1 if no lab's date has arrived yet.
function activeLabIndex() {
  const today = new Date().toISOString().slice(0, 10);
  let idx = -1;
  LAB_SCHEDULE.forEach((date, i) => {
    if (date <= today) idx = i;
  });
  return idx;
}

function render() {
  container.innerHTML = "";
  container.appendChild(buildLabPanel(courseLabs[selectedLabIndex]));
}

function renderNav() {
  labNav.innerHTML = "";
  courseLabs.forEach((lab, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lab-nav-item" + (i === selectedLabIndex ? " is-selected" : "");
    button.setAttribute("aria-pressed", i === selectedLabIndex ? "true" : "false");
    button.innerHTML = `<span>${lab.name}</span><span class="nav-arrow" aria-hidden="true">&rarr;</span>`;
    button.addEventListener("click", () => {
      selectedLabIndex = i;
      renderNav();
      render();
    });
    labNav.appendChild(button);
  });
}

function buildLabPanel(lab) {
  const panel = document.createElement("section");
  panel.className = "experiment-card" + (lab.isOpenEnded ? " open-card open-ended-section" : "");

  panel.innerHTML = `
    <div class="exp-top">
      <div>
        <div class="exp-meta">
          <span class="exp-number">${lab.name}</span>
          <span class="weightage-badge${lab.isOpenEnded ? " weightage-open" : ""}">${lab.isOpenEnded ? OPEN_ENDED_WEIGHTAGE : REGULAR_LAB_WEIGHTAGE}% weightage</span>
        </div>
        <h3>${lab.title || ""}</h3>
      </div>
      <div class="download-slot"></div>
    </div>
    <form class="upload-panel" novalidate>
      <label>
        Registration Number
        <input type="text" class="reg-no-input" placeholder="e.g. 2024123">
      </label>
      <label>
        File
        <input type="file" class="file-input" multiple>
      </label>
      <button type="submit" class="btn btn-primary">Submit</button>
      <p class="message" role="status"></p>
      <p class="message upload-state" role="status"></p>
    </form>
  `;

  setupDownload(panel, lab);
  setupUpload(panel, lab);
  return panel;
}

// ---- Download: render the button only if the lab folder has files, and
// always show a clear message if the check itself fails (e.g. Supabase
// isn't configured yet) instead of just showing nothing.
async function setupDownload(panel, lab) {
  const slot = panel.querySelector(".download-slot");
  const path = `${courseCode}/${lab.id}`;

  if (!SUPABASE_URL || SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
    slot.innerHTML = `<span class="message error">Supabase not configured yet — see README.md</span>`;
    return;
  }

  try {
    const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).list(path);
    if (error) throw error;

    // Exclude the "submission" folder and any nested-folder entries —
    // only actual distributable files count.
    const files = (data || []).filter(entry => entry.name !== "submission" && entry.id !== null);

    if (files.length === 0) {
      slot.innerHTML = `<span class="message small">No file uploaded yet</span>`;
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary";
    btn.textContent = "Download";
    btn.addEventListener("click", () => downloadLabZip(path, files, lab, btn));
    slot.appendChild(btn);
  } catch (err) {
    console.error("Could not check files for", lab.id, err);
    slot.innerHTML = `<span class="message error">Could not reach storage — check Supabase setup/connection</span>`;
  }
}

async function downloadLabZip(path, files, lab, btn) {
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Preparing…";

  try {
    const zip = new JSZip();
    for (const file of files) {
      const { data, error } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .download(`${path}/${file.name}`);
      if (error) throw error;
      zip.file(file.name, data);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseCode}-${lab.id}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Could not build the zip file. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ---- Upload: reg-no required, submission folder auto-created on upload -
function setupUpload(panel, lab) {
  const form = panel.querySelector(".upload-panel");
  const regInput = panel.querySelector(".reg-no-input");
  const fileInput = panel.querySelector(".file-input");
  const submitButton = form.querySelector("button[type=submit]");
  const message = panel.querySelector(".message");
  const stateMessage = panel.querySelector(".upload-state");

  loadUploadState(courseCode, lab.id, regInput, fileInput, submitButton, stateMessage);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "";
    message.className = "message";

    const regNo = regInput.value.trim();
    if (!regNo) {
      message.textContent = "Please enter your registration number before submitting.";
      message.classList.add("error");
      return;
    }
    const files = [...fileInput.files];
    if (!files.length) {
      message.textContent = "Please choose one or more files to submit.";
      message.classList.add("error");
      return;
    }

    // Folder is created automatically the first time this reg. no. uploads —
    // nothing needs to be pre-created in Supabase.
    const folderPath = `${courseCode}/${lab.id}/submission/${regNo}`;

    try {
      const failedFiles = [];
      for (const file of files) {
        const { error } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .upload(`${folderPath}/${file.name}`, file);
        if (error) failedFiles.push(`${file.name}: ${error.message}`);
      }

      if (failedFiles.length) {
        message.textContent = `Some files failed: ${failedFiles.join(" | ")}`;
        message.classList.add("error");
        return;
      }

      message.textContent = `${files.length} file${files.length === 1 ? "" : "s"} submitted successfully.`;
      message.classList.add("success");
      form.reset();
    } catch (err) {
      console.error(err);
      message.textContent = "Upload failed. Please try again.";
      message.classList.add("error");
    }
  });
}

async function loadUploadState(courseCode, labId, regInput, fileInput, submitButton, stateMessage) {
  try {
    const { data, error } = await supabaseClient
      .from("lab_settings")
      .select("uploads_enabled")
      .eq("course_code", courseCode)
      .eq("lab_id", labId)
      .maybeSingle();
    if (error) throw error;
    if (data && !data.uploads_enabled) {
      regInput.disabled = true;
      fileInput.disabled = true;
      submitButton.disabled = true;
      stateMessage.textContent = "Submissions are closed for this lab.";
      stateMessage.classList.add("error");
    }
  } catch (err) {
    console.warn("Could not load upload state", err);
  }
}
