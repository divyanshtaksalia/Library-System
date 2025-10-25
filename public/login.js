document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // फॉर्म को डिफ़ॉल्ट सबमिट होने से रोकें

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    // मैसेज बॉक्स को रीसेट करें
    messageElement.style.display = 'none';
    messageElement.className = 'message';
    messageElement.textContent = '';

    try {
        // Backend API को कॉल करें
        const response = await fetch('https://library-system-ovrx.onrender.com/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            messageElement.classList.add('success');
            messageElement.textContent = data.message;
            
            // यूज़र की जानकारी (role and id) को localStorage में स्टोर करें
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);

            // रोल के आधार पर रीडायरेक्ट करें
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            // विफलता का संदेश
            messageElement.classList.add('error');
            messageElement.textContent = data.message;
        }

    } catch (error) {
        console.error('Login failed:', error);
        messageElement.classList.add('error');
        messageElement.textContent = 'नेटवर्क त्रुटि: सर्वर से कनेक्ट नहीं हो सका।';
    }
});