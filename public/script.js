const gallery = document.getElementById("gallery");
const uploadForm = document.getElementById("uploadForm");

// Load gallery from server
async function loadGallery() {
  try {
    const res = await fetch("/images");
    const images = await res.json();
    gallery.innerHTML = "";

    images.forEach(img => {
      const div = document.createElement("div");
      div.classList.add("card");
      div.innerHTML = `
        <img src="/uploads/${img.filename}" alt="Image">
        <p>${img.description}</p>
        <button class="delete-btn" data-id="${img.id}">Delete</button>
        <button class="update-btn" data-id="${img.id}">Update</button>
        <div class="update-form" id="update-${img.id}" style="display:none;">
          <input type="file" name="image">
          <input type="text" name="description" placeholder="New description">
          <button class="submit-update" data-id="${img.id}">Submit</button>
        </div>
      `;
      gallery.appendChild(div);
    });

    attachEvents();
  } catch (err) {
    console.error("Error loading gallery:", err);
  }
}

// Upload new image
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(uploadForm);

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    if (res.ok) {
      uploadForm.reset();
      loadGallery();
    } else {
      alert("Upload failed");
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert("Upload error");
  }
});

// Attach delete/update event listeners dynamically
function attachEvents() {
  // Delete
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/delete/${id}`, { method: "POST" });
        if (res.ok) loadGallery();
      } catch (err) { console.error(err); }
    });
  });

  // Toggle update form
  document.querySelectorAll(".update-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const formDiv = document.getElementById(`update-${id}`);
      formDiv.style.display = formDiv.style.display === "none" ? "block" : "none";
    });
  });

  // Submit update
  document.querySelectorAll(".submit-update").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const formDiv = document.getElementById(`update-${id}`);
      const fileInput = formDiv.querySelector('input[name="image"]');
      const descInput = formDiv.querySelector('input[name="description"]');

      const formData = new FormData();
      if (fileInput.files[0]) formData.append("image", fileInput.files[0]);
      formData.append("description", descInput.value);

      try {
        const res = await fetch(`/update/${id}`, { method: "POST", body: formData });
        if (res.ok) loadGallery();
      } catch (err) { console.error(err); }
    });
  });
}

// Initial load
loadGallery();
