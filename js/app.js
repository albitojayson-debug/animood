/* AniMood: client-side gallery, favorites, uploads, theme, and hash-based navigation. */
const KEYS = {saved:"animood-saved-v1",uploads:"animood-uploads-v1",theme:"animood-theme-v1"};
const $ = id => document.getElementById(id);
const gallery = $("gallery"), favoritesGallery = $("favoritesGallery"), searchInput = $("searchInput"), filters = $("categoryFilters"), fileInput = $("fileInput"), themeToggle = $("themeToggle");
let activeCategory = "All", toastTimer = null, currentDetailId = null, currentRoute = "home";
function readJSON(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { showToast("Browser storage is full. Try a smaller image."); return false; } }
let savedIds = new Set(readJSON(KEYS.saved, []));
let uploads = readJSON(KEYS.uploads, []);
let databaseWallpapers = [];


function allWallpapers() {
  return databaseWallpapers;
}


async function loadApprovedWallpapers() {
  const supabase = window.aniMoodSupabase;

  if (!supabase) {
    console.error("Supabase client is missing.");
    return;
  }

  const { data, error } = await supabase
    .from("wallpapers")
    .select("id, title, description, image_url, category, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Loading approved wallpapers failed:", error);
    showToast("Could not load online wallpapers.");
    return;
  }

  databaseWallpapers = data.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description || "",
    category: item.category || "Uploaded",
    mood: item.category || "Community wallpaper",
    image: item.image_url,
    uploaded: true
  }));

  renderHome();
  renderFavorites();
}
function getWallpaper(id) { return allWallpapers().find(item => item.id === id); }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
function showToast(message) { const toast = $("toastMessage"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600); }
function updateCounts() { $("savedCount").textContent = savedIds.size; $("navSavedCount").textContent = savedIds.size; }
function wallpaperCard(item) {
  const saved = savedIds.has(item.id);
  return `<article class="wallpaper-card" tabindex="0" role="link" aria-label="View details for ${escapeHTML(item.title)}" data-open-id="${escapeHTML(item.id)}">
    <div class="wallpaper-image-wrap"><img class="wallpaper-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=75';this.alt='Wallpaper image unavailable; showing a fallback image';">
      <div class="card-overlay"><button class="save-btn ${saved ? "is-saved" : ""}" type="button" data-save-id="${escapeHTML(item.id)}" aria-label="${saved ? "Remove from favorites" : "Add to favorites"}" aria-pressed="${saved}"><i class="bi ${saved ? "bi-heart-fill" : "bi-heart"}"></i></button></div>
    </div><div class="card-info"><div class="min-w-0"><p class="card-title">${escapeHTML(item.title)}</p><p class="card-subtitle">${escapeHTML(item.mood || item.category)}</p></div><i class="bi bi-arrow-up-right card-more" aria-hidden="true"></i></div></article>`;
}
function getSearchFiltered(items) {
  const query = searchInput.value.trim().toLowerCase();
  return items.filter(item => !query || `${item.title} ${item.category} ${item.mood || ""} ${item.description || ""}`.toLowerCase().includes(query));
}
function getHomeItems() {
  let items = allWallpapers();
  if (activeCategory === "Uploaded") items = items.filter(item => item.uploaded === true);
  else if (activeCategory !== "All") items = items.filter(item => item.category === activeCategory);
  return getSearchFiltered(items);
}
function renderHome() {
  const items = getHomeItems();
  gallery.innerHTML = items.map(wallpaperCard).join("");
  $("resultCount").textContent = `(${items.length})`;
  gallery.classList.toggle("d-none", items.length === 0);
  $("emptyState").classList.toggle("d-none", items.length !== 0);
  $("emptyMessage").textContent = searchInput.value.trim() ? "Try a different search term or reset your filters." : "Try another category, or upload your own image.";
  updateCounts();
}
function renderFavorites() {
  const items = getSearchFiltered(allWallpapers().filter(item => savedIds.has(item.id)));
  favoritesGallery.innerHTML = items.map(wallpaperCard).join("");
  $("favoritesResultCount").textContent = `(${items.length})`;
  favoritesGallery.classList.toggle("d-none", items.length === 0);
  $("favoritesEmpty").classList.toggle("d-none", items.length !== 0);
  updateCounts();
}
function toggleFavorite(id) {
  if (!getWallpaper(id)) return;
  if (savedIds.has(id)) savedIds.delete(id); else savedIds.add(id);
  if (!writeJSON(KEYS.saved, [...savedIds])) return;
  renderHome(); renderFavorites();
  if (currentDetailId === id && currentRoute === "detail") updateDetailSaveButton();
  showToast(savedIds.has(id) ? "Added to favorites." : "Removed from favorites.");
}
function updateDetailSaveButton() {
  const saved = savedIds.has(currentDetailId);
  $("detailSaveBtn").innerHTML = `<i class="bi ${saved ? "bi-heart-fill" : "bi-heart"}"></i> ${saved ? "Remove from favorites" : "Add to favorites"}`;
}
function openDetail(id, updateHistory = true) {
  const item = getWallpaper(id);
  if (!item) { showToast("That wallpaper could not be found."); navigate("home"); return; }
  currentDetailId = id;
  $("detailImage").src = item.image;
  $("detailImage").alt = item.title;
  $("detailImage").onerror = () => { $("detailImage").onerror = null; showToast("This image may no longer be available from its source."); };
  $("detailCategory").textContent = `${item.category} · ANIMOOD COLLECTION`;
  $("detailTitle").textContent = item.title;
  $("detailDescription").textContent = item.description || item.mood || "A wallpaper saved in your AniMood collection.";
  $("detailMood").textContent = item.mood || item.category;
  const download = $("detailDownloadBtn");
download.onclick = async (event) => {
  event.preventDefault();

  try {
    const response = await fetch(item.image);


    if (!response.ok) {
      throw new Error("Could not fetch image");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "animood-wallpaper"}.jpg`;

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    console.error("Wallpaper download failed:", error);
    showToast("Download failed. Check the image URL or internet connection.");
  }
};
  updateDetailSaveButton();
  if (updateHistory) history.pushState({route:"detail", id}, "", `#wallpaper/${encodeURIComponent(id)}`);
  showView("detail");
  window.scrollTo({top:0,behavior:"smooth"});
}

let hasAuthenticatedSession = false;

function updateLandingPage(isLoggedIn) {
  $("landingPage").classList.toggle("d-none", isLoggedIn);
  document.querySelector(".topbar").classList.toggle("d-none", !isLoggedIn);
  document.querySelector(".page-shell").classList.toggle("d-none", !isLoggedIn);
}


function showView(route) {
  if (!hasAuthenticatedSession) {
    updateLandingPage(false);
    currentRoute = "landing";

    ["homeView", "favoritesView", "detailView", "adminView"].forEach(id => {
      $(id).classList.add("d-none");
    });

    return;
  }

  updateLandingPage(true);
  currentRoute = route;

  $("homeView").classList.toggle("d-none", route !== "home");
  $("favoritesView").classList.toggle("d-none", route !== "favorites");
  $("detailView").classList.toggle("d-none", route !== "detail");
  $("adminView").classList.toggle("d-none", route !== "admin");

  document.querySelectorAll("[data-route]").forEach(link => {
    const target = link.dataset.route;
    link.classList.toggle(
      "active",
      (route === "home" && target === "home") ||
      (route === "favorites" && target === "favorites")
    );
  });

  searchInput.closest(".search-wrap").classList.toggle(
    "d-none",
    route === "detail" || route === "admin"
  );

  if (route === "home") renderHome();
  if (route === "favorites") renderFavorites();

  if (route === "admin") {
    loadPendingWallpapers();
    loadManagedWallpapers();
  }
}


function navigate(route, options = {}) {
  const { updateHistory = true } = options;

  if (route === "back") {
    if (history.state && history.state.route) {
      history.back();
    } else {
      history.replaceState({ route: "home" }, "", "#home");
      showView("home");
    }
    return;
  }

  if (route === "detail") return;

  if (!["home", "favorites", "admin"].includes(route)) {
    route = "home";
  }

  if (route === "admin" && !$("adminBtn").classList.contains("admin-ready")) {
    showToast("Admin access required.");
    return;
  }

  if (updateHistory) {
    history.pushState(
      { route },
      "",
      route === "home" ? "#home" : `#${route}`
    );
  }

  showView(route);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function routeFromHash() {
  const hash = decodeURIComponent(location.hash || "#home");
  if (hash.startsWith("#wallpaper/")) { openDetail(hash.slice("#wallpaper/".length), false); return; }
  if (hash === "#favorites") { showView("favorites"); return; }
  showView("home");
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.innerHTML = theme === "dark" ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
  themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  try { localStorage.setItem(KEYS.theme, theme); } catch {}
}

async function uploadFiles(files) {
  console.log("Upload function started.");

  const supabase = window.aniMoodSupabase;

  if (!supabase) {
    console.error("Supabase client is missing.");
    showToast("Supabase is not connected.");
    return;
  }

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    console.log("Logged-in user:", user?.id);
    console.log("Authentication error:", authError);

    if (authError || !user) {
      showToast("Please log in before uploading.");
      return;
    }

    console.log("Files received:", files);
console.log("Number of files:", files.length);
console.log("About to start file loop.");

    for (const file of [...files]) {
      console.log("Selected file:", file.name);
      console.log("File type:", file.type);
      console.log("File size:", file.size);
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file.");
        continue;
      }

      const extension = file.name.split(".").pop().toLowerCase();
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      showToast(`Uploading ${file.name}...`);
      console.log("Starting Storage upload for:", filePath);

      const { data: uploadedFile, error: uploadError } =
        await supabase.storage
          .from("wallpapers")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false
          });

                console.log("Storage response:", uploadedFile);
      console.log("Storage error:", uploadError);

      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        showToast("Image upload failed. Check Console.");
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("wallpapers")
        .getPublicUrl(uploadedFile.path);

      const title = file.name.replace(/\.[^.]+$/, "");

      const { error: insertError } = await supabase
        .from("wallpapers")
        .insert({
          title,
          description: "A wallpaper submitted to AniMood.",
          image_url: urlData.publicUrl,
          category: "Uploaded",
          submitted_by: user.id,
          status: "pending"
        });

      if (insertError) {
        console.error("Database insert failed:", insertError);

        await supabase.storage
          .from("wallpapers")
          .remove([uploadedFile.path]);

        showToast("Submission failed. Check Console.");
        continue;
      }

      showToast(`${file.name} submitted for approval!`);
    }

    activeCategory = "All";

    filters.querySelectorAll("[data-category]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === "All"
      );
    });

    navigate("home");
    renderHome();

  } catch (error) {
    console.error("Unexpected upload error:", error);
    showToast("Upload failed. Check Console.");
  }

}

filters.addEventListener("click", event => {
  const button = event.target.closest("[data-category]"); if (!button) return;
  activeCategory = button.dataset.category;
  filters.querySelectorAll(".category-chip").forEach(chip => chip.classList.toggle("active", chip === button));
  renderHome();
});
function handleGalleryClick(event) {
  const saveButton = event.target.closest("[data-save-id]");
  if (saveButton) { event.stopPropagation(); toggleFavorite(saveButton.dataset.saveId); return; }
  const card = event.target.closest("[data-open-id]"); if (card) openDetail(card.dataset.openId);
}
gallery.addEventListener("click", handleGalleryClick);
favoritesGallery.addEventListener("click", handleGalleryClick);
function handleCardKeydown(event) {
  if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
    const card = event.target.closest("[data-open-id]"); if (card) { event.preventDefault(); openDetail(card.dataset.openId); }
  }
}
gallery.addEventListener("keydown", handleCardKeydown);
favoritesGallery.addEventListener("keydown", handleCardKeydown);
searchInput.addEventListener("input", () => { renderHome(); if (currentRoute === "favorites") renderFavorites(); });
document.querySelectorAll('[data-route="home"]').forEach(link => link.addEventListener("click", event => { event.preventDefault(); navigate("home"); }));
document.querySelectorAll('[data-route="favorites"]').forEach(link => link.addEventListener("click", event => { event.preventDefault(); navigate("favorites"); }));
document.querySelectorAll('[data-route="back"]').forEach(link => link.addEventListener("click", event => { event.preventDefault(); navigate("back"); }));
$("detailSaveBtn").addEventListener("click", () => { if (currentDetailId) toggleFavorite(currentDetailId); });
$("resetFiltersBtn").addEventListener("click", () => { activeCategory = "All"; searchInput.value = ""; filters.querySelectorAll(".category-chip").forEach(chip => chip.classList.toggle("active", chip.dataset.category === "All")); renderHome(); });
themeToggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
$("uploadBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async event => {
  const files = Array.from(event.target.files);
  fileInput.value = "";
  await uploadFiles(files);
});
window.addEventListener("popstate", routeFromHash);
window.addEventListener("hashchange", () => { if (location.hash.startsWith("#wallpaper/")) routeFromHash(); });
$("currentYear").textContent = new Date().getFullYear();
let theme = "dark"; try { theme = localStorage.getItem(KEYS.theme) || "dark"; } catch {}
setTheme(theme); renderHome(); renderFavorites();
if (location.hash) routeFromHash(); else history.replaceState({route:"home"}, "", "#home");

const adminBtn = $("adminBtn");
const pendingWallpapers = $("pendingWallpapers");
const adminMessage = $("adminMessage");
const adminEmptyState = $("adminEmptyState");
const managedWallpapers = $("managedWallpapers");
const managedMessage = $("managedMessage");
const managedEmptyState = $("managedEmptyState");
const managedStatusFilters = $("managedStatusFilters");

let activeManagedStatus = "approved";

async function refreshAdminAccess() {
  adminBtn.classList.remove("admin-ready");
  adminBtn.classList.add("d-none");

  const isAdmin = await window.checkAniMoodAdmin();

  if (isAdmin) {
    adminBtn.classList.remove("d-none");
    adminBtn.classList.add("admin-ready");
  } else if (currentRoute === "admin") {
    navigate("home");
  }
}

adminBtn.addEventListener("click", () => {
  if (adminBtn.classList.contains("admin-ready")) {
    navigate("admin");
  }
});

window.aniMoodSupabase.auth.onAuthStateChange(() => {
  refreshAdminAccess();
});


async function initializeAniMoodSession() {
  const supabase = window.aniMoodSupabase;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  hasAuthenticatedSession = !!session;
  updateLandingPage(hasAuthenticatedSession);

  if (hasAuthenticatedSession) {
    routeFromHash();
    await loadApprovedWallpapers();
    await refreshAdminAccess();
  } else {
    history.replaceState({ route: "landing" }, "", "#welcome");
    showView("home");
  }
}

window.aniMoodSupabase.auth.onAuthStateChange((_event, session) => {
  hasAuthenticatedSession = !!session;
  updateLandingPage(hasAuthenticatedSession);

  if (hasAuthenticatedSession) {
    if (currentRoute === "landing") {
      history.replaceState({ route: "home" }, "", "#home");
      showView("home");
    }

    setTimeout(() => {
      loadApprovedWallpapers();
      refreshAdminAccess();
    }, 0);
  } else {
    history.replaceState({ route: "landing" }, "", "#welcome");
    showView("home");
  }
});

initializeAniMoodSession();


async function loadManagedWallpapers() {
  managedWallpapers.innerHTML = "";
  managedEmptyState.classList.add("d-none");
  managedMessage.textContent = "Loading wallpapers...";

  if (!(await window.checkAniMoodAdmin())) {
    managedMessage.textContent = "You don't have admin access.";
    return;
  }

  const { data, error } = await window.aniMoodSupabase
    .from("wallpapers")
    .select("id, title, description, image_url, category, status, created_at")
    .eq("status", activeManagedStatus)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Loading managed wallpapers failed:", error.message);
    managedMessage.textContent = "Could not load wallpapers. Check Console.";
    return;
  }

  const items = data || [];
  managedMessage.textContent =
    `${items.length} ${activeManagedStatus} wallpaper(s).`;

  if (items.length === 0) {
    managedEmptyState.classList.remove("d-none");
    return;
  }

  
managedWallpapers.innerHTML = items.map(item => `
  <article class="wallpaper-card">
    <div class="wallpaper-image-wrap">
      <img
        class="wallpaper-image"
        src="${escapeHTML(item.image_url)}"
        alt="${escapeHTML(item.title)}"
        loading="lazy"
      >
    </div>

    <div class="card-info">
      <div class="min-w-0">
        <p class="card-title">${escapeHTML(item.title)}</p>
        <p class="card-subtitle">
          ${escapeHTML(item.category || "Uploaded")} ·
          ${escapeHTML(item.status)}
        </p>
        <p>${escapeHTML(item.description || "")}</p>
        <p class="card-subtitle">
          Submitted: ${
            item.created_at
              ? new Date(item.created_at).toLocaleString()
              : "Unknown"
          }
        </p>
      </div>
    </div>

    <div class="p-3">
      <button
        type="button"
        class="btn btn-danger btn-sm"
        data-delete-wallpaper="${escapeHTML(item.id)}"
      >
        <i class="bi bi-trash me-1"></i> Delete
      </button>
    </div>
  </article>
`).join("");
}


$("refreshManagedBtn").addEventListener(
  "click",
  loadManagedWallpapers
);


managedWallpapers.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete-wallpaper]");
  if (!button) return;

  // Verify admin access
  if (!(await window.checkAniMoodAdmin())) {
    showToast("Admin access required.");
    return;
  }

  const id = button.dataset.deleteWallpaper;

  // Confirm permanent deletion
  if (!confirm(
    "Permanently delete this wallpaper? This cannot be undone."
  )) {
    return;
  }

  button.disabled = true;
  managedMessage.textContent = "Deleting wallpaper...";

  // Find the wallpaper record
  const { data: wallpaper, error: fetchError } =
    await window.aniMoodSupabase
      .from("wallpapers")
      .select("id, image_url")
      .eq("id", id)
      .maybeSingle();

  if (fetchError || !wallpaper) {
    console.error("Finding wallpaper failed:", fetchError?.message);
    showToast("Could not find wallpaper.");
    button.disabled = false;
    managedMessage.textContent = "Deletion failed.";
    return;
  }

  // Validate and extract the Supabase Storage file path
  
  // Check whether the image belongs to our Supabase Storage bucket.
  let filePath = null;

  try {
    const imageURL = new URL(wallpaper.image_url);
    const expectedHost = "tvxnctazkizhxmmlsxsk.supabase.co";
    const expectedPrefix =
      "/storage/v1/object/public/wallpapers/";

    if (imageURL.protocol !== "https:") {
      throw new Error("Image URL must use HTTPS.");
    }

    if (
      imageURL.hostname === expectedHost &&
      imageURL.pathname.startsWith(expectedPrefix)
    ) {
      filePath = decodeURIComponent(
        imageURL.pathname.slice(expectedPrefix.length)
      );

      if (!filePath) {
        throw new Error("Invalid Storage file path.");
      }
    }
  } catch (error) {
    console.error("Validating image URL failed:", error);
    showToast("Invalid image URL. Nothing was deleted.");
    button.disabled = false;
    managedMessage.textContent = "Deletion cancelled.";
    return;
  }


  // Delete the database record first
  const { data: deletedRows, error: deleteError } =
    await window.aniMoodSupabase
      .from("wallpapers")
      .delete()
      .eq("id", id)
      .select("id");

  if (deleteError || !deletedRows || deletedRows.length === 0) {
    console.error("Deleting wallpaper failed:", deleteError?.message);
    showToast("Could not delete wallpaper. Check Console.");
    button.disabled = false;
    managedMessage.textContent = "Deletion failed.";
    return;
  }

  // Remove the image from Supabase Storage
 
  // Remove the image only if it belongs to Supabase Storage.
  if (filePath) {
    const { error: storageError } =
      await window.aniMoodSupabase.storage
        .from("wallpapers")
        .remove([filePath]);

    if (storageError) {
      console.error(
        "Removing Storage image failed:",
        storageError.message
      );
      showToast(
        "Record deleted, but the image file could not be removed."
      );
    } else {
      showToast("Wallpaper deleted successfully!");
    }
  } else {
    showToast("Wallpaper deleted successfully!");
  }


  // Refresh dashboard and gallery
  await loadManagedWallpapers();
  await loadPendingWallpapers();
  await loadApprovedWallpapers();
});
  

managedStatusFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-managed-status]");
  if (!button) return;

  activeManagedStatus = button.dataset.managedStatus;

  managedStatusFilters
    .querySelectorAll("[data-managed-status]")
    .forEach(filter => {
      filter.classList.toggle("active", filter === button);
    });

  loadManagedWallpapers();
});



loadApprovedWallpapers();

window.aniMoodSupabase.auth.onAuthStateChange(() => {
  loadApprovedWallpapers();
});

$("refreshPendingBtn").addEventListener("click", loadPendingWallpapers);

async function loadPendingWallpapers() {
  pendingWallpapers.innerHTML = "";
  adminEmptyState.classList.add("d-none");
  adminMessage.textContent = "Loading submissions...";

  const isAdmin = await window.checkAniMoodAdmin();

  if (!isAdmin) {
    adminMessage.textContent = "You don't have admin access.";
    return;
  }
  
  // Load Admin Dashboard statistics
const { data: allWallpapers, error: statsError } =
  await window.aniMoodSupabase
    .from("wallpapers")
    .select("status");

if (statsError) {
  console.error("Loading admin statistics failed:", statsError.message);
} else {
  const wallpapers = allWallpapers || [];

  $("adminTotalCount").textContent = wallpapers.length;
  $("adminPendingCount").textContent =
    wallpapers.filter(item => item.status === "pending").length;
  $("adminApprovedCount").textContent =
    wallpapers.filter(item => item.status === "approved").length;
  $("adminRejectedCount").textContent =
    wallpapers.filter(item => item.status === "rejected").length;
}

  const { data, error } = await window.aniMoodSupabase
    .from("wallpapers")
    .select("id, title, description, image_url, category, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Loading submissions failed:", error.message);
    adminMessage.textContent = "Could not load submissions. Check Console.";
    return;
  }

  adminMessage.textContent = `${data.length} pending submission(s).`;

  if (data.length === 0) {
    adminEmptyState.classList.remove("d-none");
    return;
  }

  pendingWallpapers.innerHTML = data.map(item => `
    <article class="wallpaper-card">
      <div class="wallpaper-image-wrap">
        <img
          class="wallpaper-image"
          src="${escapeHTML(item.image_url)}"
          alt="${escapeHTML(item.title)}"
          loading="lazy"
        >
      </div>
      <div class="card-info">
        <div class="min-w-0">
          <p class="card-title">${escapeHTML(item.title)}</p>
          <p class="card-subtitle">${escapeHTML(item.category)}</p>
          <p class="card-subtitle">
  Submitted: ${item.created_at
    ? new Date(item.created_at).toLocaleString()
    : "Unknown"}
</p>  
          <p>${escapeHTML(item.description || "")}</p>
        </div>
      </div>
      <div class="d-flex gap-2 p-3">
        <button class="btn btn-success btn-sm"
          data-admin-action="approved"
          data-wallpaper-id="${escapeHTML(item.id)}">
          Approve
        </button>
        <button class="btn btn-danger btn-sm"
          data-admin-action="rejected"
          data-wallpaper-id="${escapeHTML(item.id)}">
          Reject
        </button>
      </div>
    </article>
  `).join("");
}

pendingWallpapers.addEventListener("click", async event => {
  const button = event.target.closest("[data-admin-action]");
  if (!button) return;

  if (!(await window.checkAniMoodAdmin())) {
    showToast("Admin access required.");
    return;
  }

  const id = button.dataset.wallpaperId;
  const status = button.dataset.adminAction;

  button.disabled = true;
  adminMessage.textContent = "Updating wallpaper...";

  const { error } = await window.aniMoodSupabase
    .from("wallpapers")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    console.error("Updating wallpaper failed:", error.message);
    showToast("Could not update wallpaper.");
    button.disabled = false;
    adminMessage.textContent = "Update failed. Check Console.";
    return;
  }

  showToast(status === "approved"
    ? "Wallpaper approved!"
    : "Wallpaper rejected.");

  await loadPendingWallpapers();
});

refreshAdminAccess();
