const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const adminMessage = document.getElementById("admin-message");
const signOutButton = document.getElementById("sign-out");
const courseSelect = document.getElementById("course-select");
const labsContainer = document.getElementById("admin-labs");
signOutButton.hidden = true;

COURSES.forEach(course => {
  const option = document.createElement("option");
  option.value = course.code;
  option.textContent = `${course.code} — ${course.title}`;
  courseSelect.appendChild(option);
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(loginMessage, "Signing in...", "");
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("admin-email").value.trim(),
    password: document.getElementById("admin-password").value
  });
  if (error) {
    setMessage(loginMessage, error.message, "error");
    return;
  }
  await showAdmin();
});

signOutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  loginPanel.hidden = false;
  adminPanel.hidden = true;
  signOutButton.hidden = true;
  labsContainer.innerHTML = "";
});

courseSelect.addEventListener("change", () => renderLabs(courseSelect.value));

supabaseClient.auth.onAuthStateChange(() => showAdmin());
showAdmin();

async function showAdmin() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) {
    setMessage(loginMessage, "This account is not an administrator.", "error");
    await supabaseClient.auth.signOut();
    signOutButton.hidden = true;
    return;
  }

  loginPanel.hidden = true;
  adminPanel.hidden = false;
  signOutButton.hidden = false;
  renderLabs(courseSelect.value);
}

async function renderLabs(courseCode) {
  labsContainer.innerHTML = "";
  const course = COURSES.find(item => item.code === courseCode);
  const { data: settings, error } = await supabaseClient
    .from("lab_settings")
    .select("lab_id, uploads_enabled, title")
    .eq("course_code", courseCode);
  if (error) {
    setMessage(adminMessage, error.message, "error");
    return;
  }

  const settingMap = new Map((settings || []).map(setting => [setting.lab_id, setting.uploads_enabled]));
  const titleMap = new Map((settings || []).map(setting => [setting.lab_id, setting.title]));
  courseLabs(course).forEach(lab => {
    const card = document.createElement("article");
    card.className = "admin-lab-card";
    card.innerHTML = `
      <div class="admin-lab-heading">
        <div class="admin-lab-title"><span class="course-code">${lab.name}</span><div class="admin-title-line"><h2>${titleMap.get(lab.id) || ""}</h2><button class="icon-btn edit-title" type="button" aria-label="Edit ${lab.name} title" title="Edit lab title">&#9998;</button></div></div>
        <strong class="upload-status"></strong>
      </div>
      <div class="admin-actions">
        <div class="title-editor" hidden>
          <label>Lab title<input class="lab-title" type="text" placeholder="Enter a lab title"></label>
          <div class="title-editor-actions"><button class="btn btn-primary save-title" type="button">Save title</button><button class="btn btn-secondary cancel-title" type="button">Cancel</button></div>
        </div>
        <label>Task files<input class="task-file" type="file" multiple></label>
        <button class="btn btn-primary upload-task" type="button">Upload task</button>
        <button class="btn btn-secondary download-submissions" type="button">Download submissions</button>
        <button class="btn toggle-uploads" type="button"></button>
      </div>
      <p class="message" role="status"></p>`;

    const enabled = settingMap.has(lab.id) ? settingMap.get(lab.id) : true;
    card.querySelector(".lab-title").value = titleMap.get(lab.id) || lab.title;
    updateToggle(card, enabled);
    card.querySelector(".edit-title").addEventListener("click", () => {
      card.querySelector(".title-editor").hidden = false;
      card.querySelector(".edit-title").hidden = true;
      card.querySelector(".lab-title").focus();
    });
    card.querySelector(".cancel-title").addEventListener("click", () => {
      card.querySelector(".lab-title").value = card.querySelector(".admin-title-line h2").textContent;
      card.querySelector(".title-editor").hidden = true;
      card.querySelector(".edit-title").hidden = false;
    });
    card.querySelector(".save-title").addEventListener("click", () => saveTitle(card, courseCode, lab));
    card.querySelector(".upload-task").addEventListener("click", () => uploadTask(card, courseCode, lab));
    card.querySelector(".download-submissions").addEventListener("click", event => downloadSubmissions(courseCode, lab, event.currentTarget));
    card.querySelector(".toggle-uploads").addEventListener("click", () => toggleUploads(card, courseCode, lab));
    labsContainer.appendChild(card);
  });
}

function courseLabs(course) {
  return LABS.map(lab => ({ ...lab, title: "" }));
}

async function saveTitle(card, courseCode, lab) {
  const title = card.querySelector(".lab-title").value.trim();
  if (!title) return setCardMessage(card, "Enter a lab title first.", "error");
  const { error } = await supabaseClient.from("lab_settings").upsert({
    course_code: courseCode,
    lab_id: lab.id,
    title,
    updated_at: new Date().toISOString()
  }, { onConflict: "course_code,lab_id" });
  if (error) return setCardMessage(card, error.message, "error");
  card.querySelector(".admin-lab-heading h2").textContent = title;
  card.querySelector(".title-editor").hidden = true;
  card.querySelector(".edit-title").hidden = false;
  setCardMessage(card, "Lab title saved.", "success");
}

async function uploadTask(card, courseCode, lab) {
  const fileInput = card.querySelector(".task-file");
  const files = [...fileInput.files];
  if (!files.length) return setCardMessage(card, "Choose one or more task files first.", "error");

  const failedFiles = [];
  for (const file of files) {
    const path = `${courseCode}/${lab.id}/${file.name}`;
    const { error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true });
    if (error) failedFiles.push(`${file.name}: ${error.message}`);
  }

  if (failedFiles.length) {
    setCardMessage(card, `Some files failed: ${failedFiles.join(" | ")}`, "error");
  } else {
    setCardMessage(card, `${files.length} task file${files.length === 1 ? "" : "s"} uploaded successfully.`, "success");
    fileInput.value = "";
  }
}

async function toggleUploads(card, courseCode, lab) {
  const button = card.querySelector(".toggle-uploads");
  const enabled = button.dataset.enabled !== "false";
  const { error } = await supabaseClient.from("lab_settings").upsert({
    course_code: courseCode,
    lab_id: lab.id,
    uploads_enabled: !enabled,
    updated_at: new Date().toISOString()
  }, { onConflict: "course_code,lab_id" });
  if (error) return setCardMessage(card, error.message, "error");
  updateToggle(card, !enabled);
  setCardMessage(card, `Student uploads ${!enabled ? "enabled" : "disabled"}.`, "success");
}

function updateToggle(card, enabled) {
  const button = card.querySelector(".toggle-uploads");
  button.dataset.enabled = enabled;
  button.textContent = enabled ? "Disable uploads" : "Enable uploads";
  card.querySelector(".upload-status").textContent = enabled ? "Open" : "Closed";
  card.querySelector(".upload-status").className = `upload-status ${enabled ? "is-open" : "is-closed"}`;
}

async function downloadSubmissions(courseCode, lab, button) {
  button.disabled = true;
  button.textContent = "Preparing...";
  try {
    const root = `${courseCode}/${lab.id}/submission`;
    const folders = await listFolders(root);
    const zip = new JSZip();
    for (const folder of folders) {
      const files = await listFiles(`${root}/${folder}`);
      for (const file of files) {
        const path = `${root}/${folder}/${file.name}`;
        const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).download(path);
        if (error) throw error;
        zip.file(`${folder}/${file.name}`, data);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${courseCode}-${lab.id}-submissions.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    setMessage(adminMessage, error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Download submissions";
  }
}

async function listFolders(path) {
  const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).list(path, { limit: 1000 });
  if (error) throw error;
  return (data || []).filter(item => item.id === null).map(item => item.name);
}

async function listFiles(path) {
  const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).list(path, { limit: 1000 });
  if (error) throw error;
  return (data || []).filter(item => item.id !== null);
}

function setCardMessage(card, text, type) { setMessage(card.querySelector(".message"), text, type); }
function setMessage(element, text, type) { element.textContent = text; element.className = `message ${type || ""}`; }
