
const booksContainer = document.getElementById('booksList');
const addBookForm = document.getElementById('addBookForm');
const returnRequestsList = document.getElementById('returnRequestsList');
// फ़ंक्शन 1: सभी किताबें API से लोड करें और दिखाएँ
// public/books.js
// शुरुआत में, यूज़र लिस्ट कंटेनर को परिभाषित करें
const usersList = document.getElementById('usersList'); 

// 💡 Admin के लिए सभी यूज़र्स को लोड करने का फ़ंक्शन
async function loadUsers() {
    if (!usersList) return; // अगर कंटेनर मौजूद नहीं है, तो Admin नहीं है
    
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
            renderUsers(data.users);
        } else {
            usersList.innerHTML = `<p class="error">यूज़र्स को लोड करने में त्रुटि: ${data.message}</p>`;
        }
    } catch (error) {
        usersList.innerHTML = '<p class="error">यूज़र्स को लोड करने में नेटवर्क त्रुटि।</p>';
    }
}

// 💡 यूज़र डेटा को HTML में रेंडर करें
function renderUsers(users) {
    if (users.length === 0) {
        usersList.innerHTML = '<p>कोई स्टूडेंट यूज़र नहीं मिला।</p>';
        return;
    }

    // हम यहाँ टेबल स्ट्रक्चर का उपयोग कर रहे हैं
    const tableHtml = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>यूज़रनेम</th>
                    <th>ईमेल</th>
                    <th>स्टेटस</th>
                    <th>एक्शन</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.user_id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td style="color: ${user.account_status === 'blocked' ? 'red' : 'green'}; font-weight: bold;">
                            ${user.account_status.toUpperCase()}
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
// public/books.js

// 💡 यूज़र स्टेटस बटन के लिए इवेंट लिसनर सेट करें
function setupUserStatusListeners() {
    if (!usersList) return;

    usersList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-status')) {
            const userId = e.target.dataset.userId;
            const newStatus = e.target.dataset.status; // 'active' या 'blocked'
            const actionText = newStatus === 'blocked' ? 'ब्लॉक' : 'एक्टिवेट';

            if (!confirm(`क्या आप वाकई इस यूज़र को ${actionText} करना चाहते हैं?`)) {
                return;
            }

            try {
                const response = await fetch('/api/users/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, status: newStatus })
                });
                
                const data = await response.json();
                alert(data.message);
                
                if (data.success) {
                    loadUsers(); // लिस्ट अपडेट करें
                }
            } catch (error) {
                alert(`यूज़र स्टेटस अपडेट करने में नेटवर्क त्रुटि।`);
            }
        }
    });
}
async function loadBooks(showAdminTools = false) {
    try {
        const response = await fetch('/api/books');
        const data = await response.json();

        if (data.success) {
            renderBooks(data.books, showAdminTools);
        } else {
            booksContainer.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        booksContainer.innerHTML = '<p class="error">सर्वर से किताबें लोड नहीं हो सकीं।</p>';
    }
}

// फ़ंक्शन 2: HTML में किताबों को रेंडर करें
function renderBooks(books, showAdminTools) {
    booksContainer.innerHTML = ''; // पिछली लिस्ट साफ़ करें
    
    if (books.length === 0) {
        booksContainer.innerHTML = '<p>लाइब्रेरी में कोई किताब नहीं है।</p>';
        return;
    }

    const listHtml = books.map(book => `
        <div class="book-card ${book.status}">
            <h4>${book.title}</h4>
            <p><strong>लेखक:</strong> ${book.author}</p>
            <p><strong>श्रेणी:</strong> ${book.category}</p>
            <p><strong>स्टेटस:</strong> <span class="status-label">${book.status === 'available' ? 'उपलब्ध' : 'इश्यू है'}</span></p>
            ${showAdminTools ? 
                `<button data-id="${book.book_id}" class="btn-delete">हटाएँ</button>` : 
                `<button data-id="${book.book_id}" class="btn-order" ${book.status !== 'available' ? 'disabled' : ''}>ऑर्डर करें</button>`
            }
        </div>
    `).join('');

    // बेसिक CSS के लिए स्टाइल जोड़ें
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
// books.js के अंदर renderBooks फ़ंक्शन के बाद
// -------------------------------------------------------------------

// फ़ंक्शन 3: Delete इवेंट लिसनर सेट करें
function setupDeleteListeners() {
    // यह इवेंट लिसनर केवल Admin के लिए चलेगा
    booksContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const bookId = e.target.dataset.id;
            
            if (!confirm(`क्या आप वाकई बुक ID: ${bookId} को हटाना चाहते हैं?`)) {
                return; // अगर Admin कैंसिल करता है
            }

            try {
                const response = await fetch(`/api/books/${bookId}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                alert(data.message);
                
                if (data.success) {
                    loadBooks(true); // लिस्ट रीलोड करें
                }
            } catch (error) {
                alert('किताब हटाने में नेटवर्क त्रुटि।');
            }
        }
    });
}
// फ़ंक्शन 4: इश्यू इवेंट लिसनर सेट करें (Student के लिए)
function setupIssueListeners() {
    booksContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-order')) {
            const bookId = e.target.dataset.id;
            const userId = localStorage.getItem('userId');

            if (!userId) {
                alert('कृपया पहले लॉगिन करें!');
                return;
            }

            if (!confirm(`क्या आप वाकई इस किताब को इश्यू करना चाहते हैं?`)) {
                return;
            }

            try {
                const response = await fetch('/api/issue-book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, bookId: bookId })
                });
                
                const data = await response.json();
                alert(data.message); 
                
                if (data.success) {
                    loadBooks(false); // Student लिस्ट रीलोड करें
                    if (typeof loadMyOrders === 'function') {
                        loadMyOrders(); // ऑर्डर्स की लिस्ट भी अपडेट करें
                    }
                }
            } catch (error) {
                alert('किताब इश्यू करने में नेटवर्क त्रुटि।');
            }
        }
    });
}
// public/books.js

// फ़ंक्शन 5: लंबित रिटर्न रिक्वेस्ट लोड करें और दिखाएँ
async function loadReturnRequests() {
    if (!returnRequestsList) return; 

    try {
        const response = await fetch('/api/return-requests');
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
// public/books.js

// फ़ंक्शन 6: HTML में रिक्वेस्ट रेंडर करें
function renderReturnRequests(requests) {
    if (requests.length === 0) {
        returnRequestsList.innerHTML = '<p>कोई लंबित रिटर्न रिक्वेस्ट नहीं है।</p>';
        return;
    }

    const listHtml = requests.map(request => `
        <div class="request-card" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 4px;">
            <h4>${request.title} (ID: ${request.book_id})</h4>
            <p><strong>यूज़र:</strong> ${request.username}</p>
            <p><strong>लेखक:</strong> ${request.author}</p>
            <p><strong>इश्यू तिथि:</strong> ${new Date(request.issue_date).toLocaleDateString()}</p>
            
            <button 
                data-issue-id="${request.issue_id}" 
                data-book-id="${request.book_id}" 
                data-action="accept" 
                class="btn-handle btn-accept" 
                style="background-color: #28a745; color: white; padding: 8px; border: none; cursor: pointer; margin-right: 10px;">
                स्वीकार करें (Accept)
            </button>
            
            <button 
                data-issue-id="${request.issue_id}" 
                data-book-id="${request.book_id}" 
                data-action="reject" 
                class="btn-handle btn-reject"
                style="background-color: #dc3545; color: white; padding: 8px; border: none; cursor: pointer;">
                अस्वीकार करें (Reject)
            </button>
        </div>
    `).join('');

    returnRequestsList.innerHTML = listHtml;
}
// public/books.js

// फ़ंक्शन 7: रिक्वेस्ट हैंडल करने के लिए इवेंट लिसनर सेट करें
function setupReturnRequestListeners() {
    if (!returnRequestsList) return;

    returnRequestsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-handle')) {
            const issueId = e.target.dataset.issueId;
            const bookId = e.target.dataset.bookId;
            const action = e.target.dataset.action; // 'accept' या 'reject'

            const actionText = action === 'accept' ? 'स्वीकार' : 'अस्वीकार';

            if (!confirm(`क्या आप वाकई इस रिक्वेस्ट को ${actionText} करना चाहते हैं?`)) {
                return;
            }

            try {
                const response = await fetch('/api/handle-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ issueId, bookId, action })
                });
                
                const data = await response.json();
                alert(data.message);
                
                if (data.success) {
                    // 1. रिक्वेस्ट लिस्ट को अपडेट करें
                    loadReturnRequests(); 

                    // 2. लाइब्रेरी लिस्ट को अपडेट करें (केवल accept होने पर)
                    if (action === 'accept') {
                        loadBooks(true); // admin view अपडेट करें
                    }
                }
            } catch (error) {
                alert(`रिटर्न रिक्वेस्ट हैंडल करने में नेटवर्क त्रुटि।`);
            }
        }
    });
}
// फ़ंक्शन 3: नई किताब जोड़ें (केवल Admin के लिए)
if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('newTitle').value;
        const author = document.getElementById('newAuthor').value;
        const category = document.getElementById('newCategory').value;

        try {
            const response = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author, category })
            });
            
            const data = await response.json();
            alert(data.message); 
            
            if (data.success) {
                addBookForm.reset();
                loadBooks(true); // लिस्ट रीलोड करें
            }
        } catch (error) {
            alert('किताब जोड़ने में नेटवर्क त्रुटि।');
        }
    });
}
// public/books.js के अंत में

// ... (existing loadBooks, setupDeleteListeners calls)

// 💡 Admin रिक्वेस्ट लॉजिक यहाँ सक्रिय करें
if (returnRequestsList) { 
    // यह सुनिश्चित करता है कि फ़ंक्शन केवल Admin पेज पर ही चलें
    loadReturnRequests();
    setupReturnRequestListeners();
}
// public/books.js के अंत में

// ... (existing loadBooks, loadReturnRequests, setupReturnRequestListeners calls)

// 💡 Admin यूज़र लॉजिक यहाँ सक्रिय करें
if (usersList) { 
    loadUsers();
    setupUserStatusListeners();
}
window.loadBooks = loadBooks; 

// 3. सभी लिसनर्स को केवल एक बार फ़ाइल के अंत में सक्रिय करें
// --------------------------------------------------------
setupDeleteListeners();
setupIssueListeners();