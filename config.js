// ===============================
//  Global System Configuration
// ===============================

// رابط Google Apps Script Web App
const API_URL = "https://script.google.com/macros/s/AKfycbzoFzNnpkp0Nzm_d23w8p5kcQX1B9R-Hnt2Cy5VLSpinglDD-IysCPgMWVSBFKOjPf7/exec";

// ===============================
//  User Session Helpers
// ===============================

// جلب بيانات المستخدم من التخزين المحلي
function getCurrentUser() {
    const u = localStorage.getItem("sp_user");
    if (!u) return null;
    return JSON.parse(u);
}

// تسجيل خروج المستخدم
function logout() {
    localStorage.removeItem("sp_user");
    window.location.href = "login.html";
}
