// 1. ज़रूरी पैकेज इम्पोर्ट करें
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

// 2. एक्सप्रेस ऐप (Express App) बनाएँ
const app = express();

// 3. मिडलवेयर (Middleware) का इस्तेमाल करें
app.use(cors()); // CORS को इनेबल करें ताकि फ्रंटएंड-बैकएंड बात कर सकें
app.use(express.json()); // JSON अनुरोधों (requests) को समझने के लिए
// public फोल्डर को static files के लिए सेट करें
app.use(express.static(path.join(__dirname, 'public')));

// 4. MySQL डेटाबेस से कनेक्ट करें
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // XAMPP का डिफ़ॉल्ट यूज़र
    password: '12345',       // XAMPP का डिफ़ॉल्ट पासवर्ड खाली होता है
    database: 'library_db',
    port: 3307 // जो डेटाबेस हमने Step 1 में बनाया था
});

db.connect((err) => {
    if (err) {
        console.error('MySQL से कनेक्ट होने में समस्या: ' + err.stack);
        return;
    }
    console.log('MySQL से सफलतापूर्वक कनेक्ट हो गया (ID: ' + db.threadId + ')');
});

// 5. एक 'टेस्ट' API रूट बनाएँ (यह चेक करने के लिए कि सब ठीक है)
app.get('/api/test-connection', (req, res) => {
    // MySQL से एक सिंपल क्वेरी (query) चलाते हैं
    db.query('SELECT 1 + 1 AS solution', (err, results) => {
        if (err) {
            // अगर कोई एरर (error) है, तो उसे भेजें
            console.error('क्वेरी एरर: ' + err.stack);
            //res.status(500).send('डेटाबेस क्वेरी फेल हो गई');
            return;
        }
        // अगर सब ठीक है, तो 'solution' भेजें
        res.json(results);
    });
});
// ----------------------------------------------------
// API Routes (रास्ते)
// ----------------------------------------------------

// रजिस्ट्रेशन रूट
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body; // फ्रंटएंड से डेटा लें

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'कृपया सभी फ़ील्ड भरें।' });
    }

    try {
        // 1. पासवर्ड को हैश करें (एन्क्रिप्ट करें)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 2. SQL क्वेरी (Query)
        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        
        // 3. डेटाबेस में इंसर्ट करें
        db.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                // अगर ईमेल पहले से मौजूद है
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ success: false, message: 'यह ईमेल पहले से पंजीकृत है।' });
                }
                console.error(err);
                return res.status(500).json({ success: false, message: 'रजिस्ट्रेशन फेल हो गया। सर्वर त्रुटि।' });
            }
            
            // सफलता (Success)
            res.status(201).json({ success: true, message: 'रजिस्ट्रेशन सफल! कृपया लॉगिन करें।' });
        });
    } catch (hashError) {
        console.error("Hashing error:", hashError);
        res.status(500).json({ success: false, message: 'पासवर्ड प्रोसेसिंग में त्रुटि।' });
    }
});


// Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'कृपया ईमेल और पासवर्ड भरें।' });
    }

    // 1. डेटाबेस से यूज़र को ईमेल द्वारा ढूँढें
    const sql = 'SELECT user_id, password, role, account_status, username FROM users WHERE email = ?';
    
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'सर्वर त्रुटि।' });
        }

        // 2. अगर यूज़र नहीं मिला
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'अमान्य ईमेल या पासवर्ड।' });
        }

        const user = results[0];

        // 3. अकाउंट ब्लॉक है या नहीं जाँचें
        if (user.account_status === 'blocked') {
            return res.status(403).json({ success: false, message: 'आपका खाता ब्लॉक है। कृपया लाइब्रेरी ऑफिस से संपर्क करें।' });
        }

        // 4. पासवर्ड की तुलना करें (Hashing का उपयोग करके)
        // bcrypt.compare async है, इसलिए हम पूरे फंक्शन को async (ऊपर) बना रहे हैं
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'अमान्य ईमेल या पासवर्ड।' });
        }

        // 5. सफलता: यूज़र को उसकी जानकारी (role) के साथ भेजें
        res.status(200).json({
            success: true,
            message: 'लॉगिन सफल!',
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role // student या admin
            }
        });
    });
});
// ----------------------------------------------------
// Books API Routes
// ----------------------------------------------------

// 1. सभी किताबें दिखाएँ (GET /api/books)
app.get('/api/books', (req, res) => {
    // हम केवल 'available' किताबें दिखाना चाहते हैं (या सब)
    const sql = 'SELECT book_id, title, author, category, status FROM books ORDER BY title ASC';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'किताबें लोड करने में त्रुटि।' });
        }
        res.json({ success: true, books: results });
    });
});

// 2. नई किताब जोड़ें (POST /api/books) - केवल Admin के लिए
app.post('/api/books', (req, res) => {
    // **नोट:** असली प्रोजेक्ट में, आपको यहाँ Admin की जाँच करनी होगी।
    // अभी के लिए, हम मान लेते हैं कि अनुरोध Admin पैनल से आ रहा है।
    
    const { title, author, category } = req.body;

    if (!title || !author || !category) {
        return res.status(400).json({ success: false, message: 'शीर्षक, लेखक और श्रेणी आवश्यक हैं।' });
    }

    const sql = 'INSERT INTO books (title, author, category) VALUES (?, ?, ?)';
    
    db.query(sql, [title, author, category], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'किताब जोड़ने में त्रुटि।' });
        }
        res.status(201).json({ 
            success: true, 
            message: 'किताब सफलतापूर्वक जोड़ी गई!',
            bookId: result.insertId 
        });
    });
});
// 3. किताब हटाएँ (DELETE /api/books/:id) - केवल Admin के लिए
app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id; // URL से ID लें (जैसे /api/books/5)

    const sql = 'DELETE FROM books WHERE book_id = ?';
    
    db.query(sql, [bookId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'किताब हटाने में त्रुटि।' });
        }
        
        // जाँचें कि कोई पंक्ति प्रभावित हुई है या नहीं
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'किताब नहीं मिली।' });
        }
        
        res.status(200).json({ success: true, message: 'किताब सफलतापूर्वक हटाई गई।' });
    });
});
// ----------------------------------------------------
// Users API Routes (केवल Admin के लिए)
// ----------------------------------------------------

// 1. सभी यूज़र्स दिखाएँ (GET /api/users)
app.get('/api/users', (req, res) => {
    // Admin को छोड़कर सभी यूज़र्स दिखाएँ
    const sql = 'SELECT user_id, username, email, role, account_status FROM users WHERE role != "admin" ORDER BY user_id DESC';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'यूज़र्स लोड करने में त्रुटि।' });
        }
        res.json({ success: true, users: results });
    });
});

// 2. यूज़र अकाउंट स्टेटस अपडेट करें (POST /api/users/status)
app.post('/api/users/status', (req, res) => {
    const { userId, status } = req.body; // status: 'active' या 'blocked'

    if (!userId || !status) {
        return res.status(400).json({ success: false, message: 'यूज़र ID और स्टेटस आवश्यक है।' });
    }

    const sql = 'UPDATE users SET account_status = ? WHERE user_id = ? AND role != "admin"';
    
    db.query(sql, [status, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'स्टेटस अपडेट करने में त्रुटि।' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'यूज़र नहीं मिला या एडमिन को अपडेट करने की अनुमति नहीं।' });
        }
        
        res.status(200).json({ success: true, message: `यूज़र का अकाउंट सफलतापूर्वक ${status} किया गया।` });
    });
});
// ----------------------------------------------------
// Issue & Return API Routes
// ----------------------------------------------------

// 1. किताब इश्यू करें (POST /api/issue-book)
app.post('/api/issue-book', (req, res) => {
    const { userId, bookId } = req.body;

    if (!userId || !bookId) {
        return res.status(400).json({ success: false, message: 'यूज़र ID और बुक ID आवश्यक है।' });
    }
    
    // ट्रांजेक्शन शुरू करें (दो बदलाव एक साथ करने के लिए)
    db.beginTransaction(err => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'इश्यू शुरू करने में त्रुटि।' });
        }

        // A. इश्यू रिकॉर्ड जोड़ें
        const issueSql = 'INSERT INTO issued_books (user_id, book_id) VALUES (?, ?)';
        db.query(issueSql, [userId, bookId], (err, result) => {
            console.log(`Return Book ID: ${bookId}, Affected Rows: ${result ? result.affectedRows : 'N/A'}`);
            if (err) {
                return db.rollback(() => {
                    console.error(err);
                    res.status(500).json({ success: false, message: 'इश्यू रिकॉर्ड बनाने में त्रुटि। शायद किताब उपलब्ध नहीं है।' });
                });
            }

            // B. किताब का स्टेटस 'issued' में अपडेट करें
            const updateBookSql = 'UPDATE books SET status ="available" WHERE book_id= ?';
            db.query(updateBookSql, [bookId], (err, result) => {
    if (err || result.affectedRows === 0) { // 💡 यहाँ समस्या है!
        return db.rollback(() => {
            console.error(err || "बुक उपलब्ध नहीं है");
            res.status(400).json({ success: false, message: 'किताब उपलब्ध नहीं है या पहले से इश्यू है।' });
        });
    }

                // C. सबमिट करें
                db.commit(err => {
                    res.status(200).json({ success: true, message: 'किताब सफलतापूर्वक इश्यू हुई!' });
                });
            });
        });
    });
});

// 2. स्टूडेंट के इश्यू किए गए ऑर्डर्स दिखाएँ (GET /api/my-orders/:userId)
app.get('/api/my-orders/:userId', (req, res) => {
    const userId = req.params.userId;
    
    const sql = `
        SELECT ib.issue_id, ib.issue_date, b.title, b.author, ib.return_status
        FROM issued_books ib 
        JOIN books b ON ib.book_id = b.book_id 
        WHERE ib.user_id = ? AND ib.return_date IS NULL
        ORDER BY ib.issue_date DESC`;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'ऑर्डर्स लोड करने में त्रुटि।' });
        }
        res.json({ success: true, orders: results });
    });
});

// 3. किताब रिटर्न करें (POST /api/return-book)
app.post('/api/return-book', (req, res) => {
    const { issueId, bookId } = req.body;
    if (!issueId || !bookId) {
        return res.status(400).json({ success: false, message: 'इश्यू ID और बुक ID आवश्यक है।' });
    }
    

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ success: false, message: 'रिटर्न शुरू करने में त्रुटि।' });

        // A. issued_books टेबल में return_date अपडेट करें
        const updateIssueSql = 'UPDATE issued_books SET return_date = NOW() WHERE issue_id = ? AND return_date IS NULL';
        db.query(updateIssueSql, [issueId], (err, result) => {
            if (err || result.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(400).json({ success: false, message: 'रिटर्न रिकॉर्ड नहीं मिला।' });
                });
            }

            // B. books टेबल में status को 'available' में अपडेट करें
            const updateBookSql = 'UPDATE books SET status = "available" WHERE book_id = ?';
            db.query(updateBookSql, [bookId], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error(err);
                        res.status(500).json({ success: false, message: 'किताब स्टेटस अपडेट करने में त्रुटि।' });
                    });
                }
                
                // C. सबमिट करें
                db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'रिटर्न प्रोसेस पूरा करने में त्रुटि।' }));
                    res.status(200).json({ success: true, message: 'किताब सफलतापूर्वक वापस की गई!' });
                });
            });
        });
    });
});
// 3. किताब रिटर्न के लिए रिक्वेस्ट भेजें (POST /api/request-return)
app.post('/api/request-return', (req, res) => {
    const { issueId } = req.body;
    
    if (!issueId) {
        return res.status(400).json({ success: false, message: 'इश्यू ID आवश्यक है।' });
    }
    const sql = `
        UPDATE issued_books 
        SET return_status = "pending" 
        WHERE 
            issue_id = ? AND 
            return_date IS NULL AND 
            (return_status IS NULL OR return_status = 'rejected')`;

    // return_status को 'pending' पर सेट करें। 
    // यह return_date IS NULL वाले active issues को ही टारगेट करता है।
    // const sql = 'UPDATE issued_books SET return_status = "pending" WHERE issue_id = ? AND return_date IS NULL AND return_status IS NULL';
    
    db.query(sql, [issueId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'रिटर्न रिक्वेस्ट भेजने में त्रुटि।' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'इश्यू रिकॉर्ड नहीं मिला या रिक्वेस्ट पहले ही भेजी जा चुकी है।' });
        }
        res.status(200).json({ success: true, message: 'रिटर्न रिक्वेस्ट सफलतापूर्वक भेजी गई। एडमिन की पुष्टि का इंतज़ार है।' });
    });
});
// 4. लंबित रिटर्न रिक्वेस्ट दिखाएँ (GET /api/return-requests)
app.get('/api/return-requests', (req, res) => {
    const sql = `
        SELECT 
            ib.issue_id, 
            ib.book_id,
            u.username, 
            b.title, 
            b.author,
            ib.issue_date
        FROM issued_books ib
        JOIN users u ON ib.user_id = u.user_id
        JOIN books b ON ib.book_id = b.book_id
        WHERE ib.return_status = 'pending'
        ORDER BY ib.issue_date DESC`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'रिटर्न रिक्वेस्ट लोड करने में त्रुटि।' });
        }
        res.json({ success: true, requests: results });
    });
});
// 5. एडमिन द्वारा रिटर्न रिक्वेस्ट को स्वीकार/अस्वीकार करें (POST /api/handle-return)
app.post('/api/handle-return', (req, res) => {
    // bookId की ज़रूरत है ताकि किताब को available कर सकें
    const { issueId, bookId, action } = req.body; 

    if (!issueId || !bookId || !action || (action !== 'accept' && action !== 'reject')) {
        return res.status(400).json({ success: false, message: 'अमान्य अनुरोध डेटा।' });
    }

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ success: false, message: 'प्रोसेस शुरू करने में त्रुटि।' });

        if (action === 'reject') {
            // A. केवल स्टेटस 'rejected' पर सेट करें (कोई किताब स्टेटस अपडेट नहीं)
            const rejectSql = 'UPDATE issued_books SET return_status = "rejected" WHERE issue_id = ? AND return_status = "pending"';
            db.query(rejectSql, [issueId], (err, result) => {
                if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'अस्वीकार करने में त्रुटि।' }));
                
                db.commit(err => res.status(200).json({ success: true, message: 'रिटर्न रिक्वेस्ट अस्वीकार कर दी गई।' }));
            });
            
        } else if (action === 'accept') {
            
            // B. स्वीकार करें: 1. issued_books अपडेट करें (return_date और status)
            const updateIssueSql = 'UPDATE issued_books SET return_date = NOW(), return_status = "completed" WHERE issue_id = ? AND return_status = "pending"';
            db.query(updateIssueSql, [issueId], (err, result) => {
                if (err || result.affectedRows === 0) {
                    return db.rollback(() => res.status(400).json({ success: false, message: 'लंबित रिक्वेस्ट नहीं मिली।' }));
                }

                // C. स्वीकार करें: 2. books टेबल में स्टेटस 'available' पर सेट करें
                const updateBookSql = 'UPDATE books SET status = "available" WHERE book_id = ?';
                db.query(updateBookSql, [bookId], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("ADMIN ACCEPT ERROR:", err);
                            res.status(500).json({ success: false, message: 'किताब स्टेटस अपडेट करने में त्रुटि।' });
                        });
                    }
                    
                    // D. कमिट करें (Commit)
                    db.commit(err => {
                        if (err) return db.rollback(() => res.status(500).json({ success: false, message: 'रिटर्न प्रोसेस पूरा करने में त्रुटि।' }));
                        res.status(200).json({ success: true, message: 'रिटर्न सफलतापूर्वक स्वीकार किया गया। किताब उपलब्ध हो गई है!' });
                    });
                });
            });
        }
    });
});
// 6. सर्वर को 'सुनने' (Listen) के लिए चालू करें
const PORT = 3000; // हम अपने सर्वर को पोर्ट 3000 पर चलाएँगे
app.listen(PORT, () => {
    console.log(`सर्वर http://localhost:${PORT} पर चल रहा है`);
});