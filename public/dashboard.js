const ordersContainer = document.getElementById('myOrdersList');

async function loadMyOrders() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await fetch(`https://library-system-ovrx.onrender.com/api/my-orders/${userId}`);
        const data = await response.json();

        if (data.success) {
            renderMyOrders(data.orders);
        } else {
            ordersContainer.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        ordersContainer.innerHTML = '<p class="error">Network error while loading orders.</p>';
    }
}


function renderMyOrders(orders) {
    ordersContainer.innerHTML = '';

    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>No books are currently issued to you.</p>';
        return;
    }

    const listHtml = orders.map(order => {
        let buttonHtml = '';
        let statusLabel = '';

        if (order.return_status === 'pending') {
            statusLabel = '<p style="color: orange; font-weight: bold;">Return request is pending</p>';
            
        } else if (order.return_status === 'rejected') {
            statusLabel = '<p style="color: red; font-weight: bold;">Return request was rejected</p>';
            
            buttonHtml = `<button data-id="${order.issue_id}" class="btn-return">Return (Retry)</button>`;
        } else {
            
            statusLabel = '<p style="color: gray;">Send Request</p>';
            buttonHtml = `<button data-id="${order.issue_id}" data-book-id="${order.book_id}" class="btn-return">Return</button>`;
        }
        
        return `
        
        <div class="order-card">
            <h4>${order.title}</h4>
            <p><strong>Author:</strong> ${order.author}</p>
            <p><strong>Issue Date:</strong> ${new Date(order.issue_date).toLocaleDateString()}</p>
            ${statusLabel}
            ${buttonHtml}
        </div>
        `;
    }).join('');

    ordersContainer.innerHTML = listHtml;
}
ordersContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-return')) {
        const issueId = e.target.dataset.id;

        if (!confirm(`Are you sure you want to return this book?`)) {
            return;
        }

        try {
            const response = await fetch('https://library-system-ovrx.onrender.com/api/request-return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ issueId: issueId })
            });
            
            const data = await response.json();
            alert(data.message);
            
            if (data.success) {
                loadMyOrders(); 
            }
        } catch (error) {
            alert('Network error while sending return request.');
        }
    }
});

window.loadMyOrders = loadMyOrders;