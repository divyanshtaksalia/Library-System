
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
            usersList.innerHTML = `<p class="error">Error in loading users: ${data.message}</p>`;
        }
    } catch (error) {
        usersList.innerHTML = '<p class="error">Network error while loading users.</p>';
    }
}

function renderUsers(users) {
    if (users.length === 0) {
        usersList.innerHTML = '<p>No student users found.</p>';
        return;
    }

    const tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.user_id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td style="color: ${user.account_status === 'blocked' ? 'red' : 'green'}; font-weight: bold;">
                            ${user.account_status === 'blocked' ? 'Blocked' : 'Active'}
                        </td>
                        <td>
                            ${user.account_status === 'active' ? 
                                `<button 
                                    data-user-id="${user.user_id}" 
                                    data-status="blocked" 
                                    class="btn-status btn-block"
                                    style="background-color: #dc3545; color: white;">Block</button>` 
                                : 
                                `<button 
                                    data-user-id="${user.user_id}" 
                                    data-status="active" 
                                    class="btn-status btn-activate"
                                    style="background-color: #28a745; color: white;">Activate</button>`
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
            const actionText = newStatus === 'blocked' ? 'Block' : 'Activate';

            if (!confirm(`Are you sure you want to ${actionText} this user?`)) {
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
                alert('Network error while updating user status.');
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
        booksContainer.innerHTML = '<p class="error">Network error while loading books.</p>';
    }
}

function renderBooks(books, showAdminTools) {
    booksContainer.innerHTML = '';
    if (books.length === 0) {
        booksContainer.innerHTML = '<p>No books found in the library.</p>';
        return;
    }

    const listHtml = books.map(book => `
        <div class="book-card ${book.status}">
            <h4>${book.title}</h4>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>Category:</strong> ${book.category}</p>
            <p><strong>Status:</strong> <span class="status-label">${book.status === 'available' ? 'Available' : 'Issued'}</span></p>
            ${showAdminTools ? 
                `<button data-id="${book.book_id}" class="btn-delete">Delete</button>` : 
                `<button data-id="${book.book_id}" class="btn-order" ${book.status !== 'available' ? 'disabled' : ''}>Order</button>`
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
            if (!confirm(`Are you sure you want to delete book ID: ${bookId}?`)) {
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
                alert('Network error while deleting book.');
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
                alert('Please log in first!');
                return;
            }

            if (!confirm('Are you sure you want to issue this book?')) {
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
                alert('Network error while issuing book.');
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
        returnRequestsList.innerHTML = '<p class="error">Network error while loading return requests.</p>';
    }
}

function renderReturnRequests(requests) {
    if (requests.length === 0) {
        returnRequestsList.innerHTML = '<p>No pending return requests.</p>';
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
                accept
            </button>

            <button 
                data-issue-id="${request.issue_id}" 
                data-book-id="${request.book_id}" 
                data-action="reject" 
                class="btn-handle btn-reject"
                style="background-color: #dc3545; color: white; padding: 8px; border: none; cursor: pointer;">
                reject
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
            const actionText = action === 'accept' ? 'Accept' : 'Reject';

            if (!confirm(`Are you sure you want to ${actionText} this request?`)) {
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
                alert('Network error while handling return request.');
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
            alert('Network error while adding new book.');
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