// DOM Elements
const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const loginBtn = document.getElementById("loginBtn");

let db, auth;

// Check if already logged in
if (sessionStorage.getItem("isLoggedIn") === "true") {
    window.location.href = "features.html";
}

// Initialize Firebase by fetching config from API
async function initializeFirebase() {
    try {
        const response = await fetch('/api/config');
        const firebaseConfig = await response.json();
        
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();
        
        await auth.signInAnonymously();
        console.log("Firebase connected successfully");
        
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        showError("Failed to connect to database. Please refresh the page.");
        loginBtn.disabled = true;
    }
}

// Login handler
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    
    errorMsg.classList.remove("show");
    
    if (!username || !password) {
        showError("Please enter both username and password");
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    
    try {
        if (!db) {
            await initializeFirebase();
        }
        
        const snapshot = await db.ref("admin").once("value");
        const adminData = snapshot.val();
        
        if (!adminData) {
            showError("Admin credentials not found in database");
            resetButton();
            return;
        }
        
        if (adminData.username === username && adminData.password === password) {
            sessionStorage.setItem("isLoggedIn", "true");
            window.location.href = "features";
        } else {
            showError("Invalid username or password");
            resetButton();
        }
        
    } catch (error) {
        console.error("Login error:", error);
        showError("An error occurred. Please try again.");
        resetButton();
    }
});

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.add("show");
}

function resetButton() {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
}

// Start initialization
initializeFirebase();
