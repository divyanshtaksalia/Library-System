
const booksContainer = document.getElementById('booksList');
const addBookForm = document.getElementById('addBookForm');
const returnRequestsList = document.getElementById('returnRequestsList');
const usersList = document.getElementById('usersList');

async function loadUsers() {
    if (!usersList) return;
    try {
        const response = await fetch('https://library-system-ovrx.onrender.com/api/users');
        const data = await response.json();
        if (data.success) {
            renderUsers(data.users);
        } else {
            usersList.innerHTML = `<p class="error">यूज़र्स लोड करने में त्रुटि: ${data.message}</p>`;
        }
    } catch (error) {
        usersList.innerHTML = '<p class="error">यूज़र्स लोड करने में नेटवर्क त्रुटि।</p>';
    }
}

function renderUsers(users) {
    if (users.length === 0) {
        usersList.innerHTML = '<p>कोई छात्र उपयोगकर्ता नहीं मिला।</p>';
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
                        <td style="color: ${user.account_status === 'blocked' ? 'red' : 'green'}; font-weight: bold;">
                            ${user.account_status === 'blocked' ? 'ब्लॉक' : 'सक्रिय'}
                        </td>
                        <td>
                            ${user.account_status === 'active' ? 
                                `<button 
                                    data-user-id="${user.user_id}" 
                                    data-status="blocked" 
                                    class="btn-status btn-block"
                                    style="background-color: #dc3545; color: white;">ब्लॉक करें</button>` 
                                : 
                                `<button 
                                    data-user-id="${user.user_id}" 
                                    data-status="active" 
                                    class="btn-status btn-activate"
                                    style="background-color: #28a745; color: white;">सक्रिय करें</button>`
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    usersList.innerHTML = tableHtml;
}

function setupUserStatusListeners() {
    if (!usersList) return;
    usersList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-status')) {
            const userId = e.target.dataset.userId;
            const newStatus = e.target.dataset.status;
            const actionText = newStatus === 'blocked' ? 'ब्लॉक' : 'सक्रिय';

            if (!confirm(`क्या आप वाकई इस उपयोगकर्ता को ${actionText} करना चाहते हैं?`)) {
                return;
            }

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
                alert('यूज़र स्टेटस अपडेट करते समय नेटवर्क त्रुटि।');
            }
        }
    });
}

async function loadBooks(showAdminTools = false) {
    try {
        const response = await fetch('https://library-system-ovrx.onrender.com/api/books');
        const data = await response.json();
        if (data.success) {
            renderBooks(data.books, showAdminTools);
        } else {
            booksContainer.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        booksContainer.innerHTML = '<p class="error">सर्वर से किताबें लोड नहीं की जा सकीं।</p>';
    }
}

function renderBooks(books, showAdminTools) {
    booksContainer.innerHTML = '';
    if (books.length === 0) {
        booksContainer.innerHTML = '<p>लाइब्रेरी में कोई किताब नहीं है।</p>';
        return;
    }

    const listHtml = books.map(book => `
        <div class="book-card ${book.status}">
            <h4>${book.title}</h4>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>Category:</strong> ${book.category}</p>
            <p><strong>स्थिति:</strong> <span class="status-label">${book.status === 'available' ? 'उपलब्ध' : 'इश्यू'}</span></p>
            ${showAdminTools ? 
                `<button data-id="${book.book_id}" class="btn-delete">हटाएँ</button>` : 
                `<button data-id="${book.book_id}" class="btn-order" ${book.status !== 'available' ? 'disabled' : ''}>ऑर्डर करें</button>`
            }
        </div>
    `).join('');

    const style = `
        <style>
            .book-card { border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 4px; display: flex; flex-direction: column; }
            .book-card.issued { background-color: #fcebeb; }
            .status-label { font-weight: bold; color: ${showAdminTools ? '#333' : 'green'}; }
            .book-card.issued .status-label { color: red; }
            .btn-delete, .btn-order { padding: 8px; margin-top: 10px; cursor: pointer; border: none; border-radius: 3px; }
            .btn-delete { background-color: #dc3545; color: white; }
            .btn-order { background-color: #28a745; color: white; }
            .btn-order:disabled { background-color: #6c757d; cursor: not-allowed; }
        </style>
    `;

    booksContainer.innerHTML = style + listHtml;
}

function setupDeleteListeners() {
    booksContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const bookId = e.target.dataset.id;
            if (!confirm(`क्या आप वाकई पुस्तक ID: ${bookId} हटाना चाहते हैं?`)) {
                return;
            }

            try {
                const response = await fetch(`https://library-system-ovrx.onrender.com/api/books/${bookId}`, { method: 'DELETE' });
                const data = await response.json();
                alert(data.message);
                if (data.success) {
                    loadBooks(true);
                }
            } catch (error) {
                alert('किताब हटाते समय नेटवर्क त्रुटि।');
            }
        }
    });
}

function setupIssueListeners() {
    booksContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-order')) {
            const bookId = e.target.dataset.id;
            const userId = localStorage.getItem('userId');

            if (!userId) {
                alert('कृपया पहले लॉगिन करें!');
                return;
            }

            if (!confirm('क्या आप वाकई यह किताब इश्यू करना चाहते हैं?')) {
                return;
            }

            try {
                const response = await fetch('https://library-system-ovrx.onrender.com/api/issue-book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, bookId: bookId })
                });

                const data = await response.json();
                alert(data.message);

                if (data.success) {
                    loadBooks(false);
                    if (typeof loadMyOrders === 'function') {
                        loadMyOrders();
                    }
                }
            } catch (error) {
                alert('किताब इश्यू करने में नेटवर्क त्रुटि।');
            }
        }
    });
}

async function loadReturnRequests() {
    if (!returnRequestsList) return;
    try {
        const response = await fetch('https://library-system-ovrx.onrender.com/api/return-requests');
        const data = await response.json();
        if (data.success) {
            renderReturnRequests(data.requests);
        } else {
            returnRequestsList.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        returnRequestsList.innerHTML = '<p class="error">रिटर्न रिक्वेस्ट लोड करने में नेटवर्क त्रुटि।</p>';
    }
}

function renderReturnRequests(requests) {
    if (requests.length === 0) {
        returnRequestsList.innerHTML = '<p>कोई लंबित रिटर्न रिक्वेस्ट नहीं है।</p>';
        return;
    }

    const listHtml = requests.map(request => `
        <div class="request-card" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 4px;">
            <h4>${request.title} (ID: ${request.book_id})</h4>
            <p><strong>User:</strong> ${request.username}</p>
            <p><strong>Author:</strong> ${request.author}</p>
            <p><strong>Issue Date:</strong> ${new Date(request.issue_date).toLocaleDateString()}</p>

            <button 
                data-issue-id="${request.issue_id}" 
                data-book-id="${request.book_id}" 
                data-action="accept" 
                class="btn-handle btn-accept" 
                style="background-color: #28a745; color: white; padding: 8px; border: none; cursor: pointer; margin-right: 10px;">
                स्वीकार करें
            </button>

            <button 
                data-issue-id="${request.issue_id}" 
                data-book-id="${request.book_id}" 
                data-action="reject" 
                class="btn-handle btn-reject"
                style="background-color: #dc3545; color: white; padding: 8px; border: none; cursor: pointer;">
                अस्वीकार करें
            </button>
        </div>
    `).join('');

    returnRequestsList.innerHTML = listHtml;
}

function setupReturnRequestListeners() {
    if (!returnRequestsList) return;
    returnRequestsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-handle')) {
            const issueId = e.target.dataset.issueId;
            const bookId = e.target.dataset.bookId;
            const action = e.target.dataset.action;
            const actionText = action === 'accept' ? 'स्वीकार' : 'अस्वीकार';

            if (!confirm(`क्या आप वाकई इस रिक्वेस्ट को ${actionText} करना चाहते हैं?`)) {
                return;
            }

            try {
                const response = await fetch('https://library-system-ovrx.onrender.com/api/handle-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ issueId, bookId, action })
                });

                const data = await response.json();
                alert(data.message);

                if (data.success) {
                    loadReturnRequests();
                    if (action === 'accept') {
                        loadBooks(true);
                    }
                }
            } catch (error) {
                alert('रिटर्न रिक्वेस्ट हैंडल करने में नेटवर्क त्रुटि।');
            }
        }
    });
}

if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('newTitle').value;
        const author = document.getElementById('newAuthor').value;
        const category = document.getElementById('newCategory').value;

        try {
            const response = await fetch('https://library-system-ovrx.onrender.com/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author, category })
            });

            const data = await response.json();
            alert(data.message);

            if (data.success) {
                addBookForm.reset();
                loadBooks(true);
            }
        } catch (error) {
            alert('किताब जोड़ते समय नेटवर्क त्रुटि।');
        }
    });
}

if (returnRequestsList) {
    loadReturnRequests();
    setupReturnRequestListeners();
}

if (usersList) {
    loadUsers();
    setupUserStatusListeners();
}

window.loadBooks = loadBooks;

setupDeleteListeners();
setupIssueListeners();