document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("course-grid");

  COURSES.forEach((course, i) => {
    const a = document.createElement("a");
    a.className = "lab-card";
    a.href = `course.html?code=${encodeURIComponent(course.code)}`;
    a.innerHTML = `
      <div class="card-image-wrap course-image-${course.code.toLowerCase()}">
        <img src="${course.image || "assets/giki-logo.png"}" alt="" class="card-image">
      </div>
      <p class="course-code"></p>
      <h3></h3>
      <span class="card-link">Open course <span aria-hidden="true">&rarr;</span></span>
    `;
    a.querySelector("h3").textContent = course.title;
    a.querySelector("p").textContent = course.code;
    grid.appendChild(a);
  });
});
