// यह फ़ंक्शन जांचता है कि यूज़र लॉग इन है या नहीं।
function checkAuth(requiredRole) {
    const userRole = localStorage.getItem('userRole');
    
    // अगर कोई रोल नहीं मिला है (लॉगिन नहीं है)
    if (!userRole) {
        window.location.href = 'login.html';
        return false;
    }
    
    // अगर यूज़र के पास आवश्यक रोल नहीं है (जैसे स्टूडेंट admin.html पर जाने की कोशिश कर रहा है)
    if (requiredRole && userRole !== requiredRole) {
        alert('आपके पास इस पेज को एक्सेस करने की अनुमति नहीं है।');
        window.location.href = 'dashboard.html'; // छात्र को उसके डैशबोर्ड पर भेजें
        return false;
    }
    return true; // सब ठीक है
}

// लॉगआउट फ़ंक्शन
function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

// HTML में सीधे उपयोग के लिए फ़ंक्शन को वैश्विक (global) बनाएं
window.checkAuth = checkAuth;
window.logout = logout;