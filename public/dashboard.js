const ordersContainer = document.getElementById('myOrdersList');

// फ़ंक्शन 1: स्टूडेंट के इश्यू किए गए ऑर्डर्स लोड करें
async function loadMyOrders() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await fetch(`http://localhost:3000/api/my-orders/${userId}`);
        const data = await response.json();

        if (data.success) {
            renderMyOrders(data.orders);
        } else {
            ordersContainer.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        ordersContainer.innerHTML = '<p class="error">ऑर्डर्स लोड नहीं हो सके।</p>';
    }
}

// फ़ंक्शन 2: HTML में ऑर्डर्स को रेंडर करें
function renderMyOrders(orders) {
    ordersContainer.innerHTML = '';

    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>आपकी कोई किताब अभी इश्यू नहीं है।</p>';
        return;
    }

    const listHtml = orders.map(order => {
        let buttonHtml = '';
        let statusLabel = '';

        if (order.return_status === 'pending') {
            statusLabel = '<p style="color: orange; font-weight: bold;">रिटर्न रिक्वेस्ट लंबित है</p>';
            // बटन नहीं दिखाएंगे क्योंकि रिक्वेस्ट भेजी जा चुकी है
        } else if (order.return_status === 'rejected') {
            statusLabel = '<p style="color: red; font-weight: bold;">रिटर्न रिक्वेस्ट अस्वीकार</p>';
            // रिजेक्ट होने पर यूजर दोबारा रिक्वेस्ट भेज सके
            buttonHtml = `<button data-id="${order.issue_id}" class="btn-return">वापस करें (पुनः प्रयास)</button>`;
        } else {
            // default (NULL या active): अभी तक कोई रिक्वेस्ट नहीं भेजी गई
            statusLabel = '<p style="color: gray;">रिक्वेस्ट भेजें</p>';
            buttonHtml = `<button data-id="${order.issue_id}" data-book-id="${order.book_id}" class="btn-return">वापस करें</button>`;
        }
        
        return `
        
        <div class="order-card">
            <h4>${order.title}</h4>
            <p><strong>लेखक:</strong> ${order.author}</p>
            <p><strong>इश्यू तिथि:</strong> ${new Date(order.issue_date).toLocaleDateString()}</p>
            ${statusLabel}
            ${buttonHtml}
        </div>
        `;
    }).join('');

    ordersContainer.innerHTML = listHtml;
}

// फ़ंक्शन 3: रिटर्न इवेंट लिसनर सेट करें
ordersContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-return')) {
        const issueId = e.target.dataset.id;

        if (!confirm(`क्या आप वाकई इस किताब को वापस करना चाहते हैं?`)) {
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/request-return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ issueId: issueId })
            });
            
            const data = await response.json();
            alert(data.message);
            
            if (data.success) {
                loadMyOrders(); // ऑर्डर्स की लिस्ट अपडेट करें
            }
        } catch (error) {
            alert('किताब वापस करने में नेटवर्क त्रुटि।');
        }
    }
});

// इसे global बना दें ताकि books.js इसे कॉल कर सके
window.loadMyOrders = loadMyOrders;