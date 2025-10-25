const usersContainer = document.getElementById('usersList');

async function loadUsers() {
    try {
        const response = await fetch('https://library-system-ovrx.onrender.com/api/users');
        const data = await response.json();

        if (data.success) {
            renderUsers(data.users);
        } else {
            usersContainer.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        usersContainer.innerHTML = '<p class="error">यूज़र्स लोड नहीं हो सके।</p>';
    }
}

function renderUsers(users) {
    usersContainer.innerHTML = '';

    if (users.length === 0) {
        usersContainer.innerHTML = '<p>कोई छात्र उपयोगकर्ता नहीं मिला।</p>';
        return;
    }

    const tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>नाम</th>
                    <th>ईमेल</th>
                    <th>स्थिति</th>
                    <th>कार्रवाई</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.user_id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td class="status-${user.account_status}">
                            ${user.account_status === 'blocked' ? 'ब्लॉक' : 'सक्रिय'}
                        </td>
                        <td>
                            <button data-id="${user.user_id}" 
                                data-status="${user.account_status === 'active' ? 'blocked' : 'active'}"
                                class="btn-toggle-status">
                                ${user.account_status === 'active' ? 'ब्लॉक करें' : 'सक्रिय करें'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <style>
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
            .status-blocked { color: red; font-weight: bold; }
            .status-active { color: green; }
            .btn-toggle-status { padding: 5px 10px; cursor: pointer; }
        </style>
    `;

    usersContainer.innerHTML = tableHtml;
    setupStatusToggleListeners();
}

function setupStatusToggleListeners() {
    usersContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-toggle-status')) {
            const userId = e.target.dataset.id;
            const newStatus = e.target.dataset.status;

            try {
                const response = await fetch('https://library-system-ovrx.onrender.com/api/users/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, status: newStatus })
                });

                const data = await response.json();
                alert(data.message);

                if (data.success) {
                    loadUsers();
                }
            } catch (error) {
                alert('स्टेटस अपडेट करते समय नेटवर्क त्रुटि।');
            }
        }
    });
}