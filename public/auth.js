function checkAuth(requiredRole) {
    const userRole = localStorage.getItem('userRole');
    
    if (!userRole) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (requiredRole && userRole !== requiredRole) {
        alert("You do not have permission to access this page.");
        window.location.href = 'dashboard.html'; 
        return false;
    }
    return true; 
}

function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

window.checkAuth = checkAuth;
window.logout = logout;