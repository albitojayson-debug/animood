
const SUPABASE_URL = "https://tvxnctazkizhxmmlsxsk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UgWKw1WbNY8hPKVqoHE2_g_tOXqzKb7";

window.aniMoodSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log("AniMood Supabase connected!");

let authMode = "login";

const authModal = new bootstrap.Modal(
  document.getElementById("authModal")
);

const authBtn = document.getElementById("authBtn");
const landingSignIn = document.getElementById("landingSignIn");
const landingSignUp = document.getElementById("landingSignUp");
const landingExploreSignIn = document.getElementById("landingExploreSignIn");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authSwitch = document.getElementById("authSwitch");
const authSwitchText = document.getElementById("authSwitchText");
const authError = document.getElementById("authError");

function updateAuthForm() {
  const registering = authMode === "register";

  document.getElementById("authModalTitle").textContent =
    registering ? "Create your AniMood account" : "Welcome to AniMood";

  authSubmit.textContent = registering ? "Register" : "Login";
  authSwitchText.textContent = registering
    ? "Already have an account?"
    : "Don't have an account?";

  authSwitch.textContent = registering ? "Login" : "Register";
  authPassword.autocomplete = registering
    ? "new-password"
    : "current-password";

  authError.textContent = "";
}
function openAuthModal(mode) {
  authMode = mode;
  updateAuthForm();
  authModal.show();
}

landingSignIn.addEventListener("click", () => {
  openAuthModal("login");
});

landingExploreSignIn.addEventListener("click", () => {
  openAuthModal("login");
});

landingSignUp.addEventListener("click", () => {
  openAuthModal("register");
});

document.getElementById("landingYear").textContent =
  new Date().getFullYear();

authBtn.addEventListener("click", async () => {
  authError.textContent = "";

  const { data: { session } } =
    await window.aniMoodSupabase.auth.getSession();

  if (session) {
    const { error } = await window.aniMoodSupabase.auth.signOut();

    if (error) {
      showAuthError(error.message);
      return;
    }

    updateAuthButton(null);
    showToast("You have logged out.");
  } else {
    authMode = "login";
    updateAuthForm();
    authModal.show();
  }
});

authSwitch.addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  updateAuthForm();
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();
  authError.textContent = "";
  authSubmit.disabled = true;

  try {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    let result;

    if (authMode === "register") {
      result = await window.aniMoodSupabase.auth.signUp({
        email,
        password
      });
    } else {
      result = await window.aniMoodSupabase.auth.signInWithPassword({
        email,
        password
      });
    }

    if (result.error) throw result.error;

    if (authMode === "register" && !result.data.session) {
      authError.textContent =
        "Account created. Check your email to confirm it, then log in.";
      return;
    }

    authModal.hide();
    authForm.reset();
    showToast(
      authMode === "register"
        ? "Account created successfully!"
        : "Welcome back to AniMood!"
    );
  } catch (error) {
    showAuthError(error.message || "Authentication failed.");
  } finally {
    authSubmit.disabled = false;
  }
});

function showAuthError(message) {
  authError.textContent = message;
}

function updateAuthButton(session) {
  const label = authBtn.querySelector("span");

  label.textContent = session ? "Logout" : "Login";
  authBtn.setAttribute(
    "aria-label",
    session ? "Log out of AniMood" : "Log in to AniMood"
  );
}

window.aniMoodSupabase.auth.onAuthStateChange((_event, session) => {
  updateAuthButton(session);
});
window.checkAniMoodAdmin = async function () {
  const { data: { user }, error: userError } =
    await window.aniMoodSupabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data, error } = await window.aniMoodSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Admin check failed:", error.message);
    return false;
  }

  return !!data;
};