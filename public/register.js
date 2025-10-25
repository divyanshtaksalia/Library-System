document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // फ़ॉर्म को डिफ़ॉल्ट सबमिट होने से रोकें

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    // मैसेज बॉक्स को रीसेट करें
    messageElement.style.display = 'none';
    messageElement.className = 'message';
    messageElement.textContent = '';

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            // सफलता का संदेश
            messageElement.classList.add('success');
            messageElement.textContent = data.message;
            // 2 सेकंड बाद लॉगिन पेज पर भेज दें
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            // विफलता का संदेश
            messageElement.classList.add('error');
            messageElement.textContent = data.message;
        }

    } catch (error) {
        console.error('Registration failed:', error);
        messageElement.classList.add('error');
        messageElement.textContent = 'नेटवर्क त्रुटि: सर्वर से कनेक्ट नहीं हो सका।';
    }
});