// 1. ज़रूरी पैकेज इम्पोर्ट करें
const express = require('express');
const { Pool } = require('pg'); // MySQL2 की जगह PostgreSQL Pool का उपयोग करें
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

// 2. एक्सप्रेस ऐप (Express App) बनाएँ
const app = express();

// 3. मिडलवेयर (Middleware) का इस्तेमाल करें
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 4. PostgreSQL डेटाबेस से कनेक्ट करें (Render Environment Variables का उपयोग करके)
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432, // PostgreSQL का डिफ़ॉल्ट पोर्ट
    ssl: { rejectUnauthorized: false } // Render/Cloud होस्टिंग के लिए आवश्यक
});

pool.connect((err, client, done) => {
    if (err) {
        console.error('PostgreSQL से कनेक्ट होने में समस्या: ', err.stack);
        return;
    }
    console.log('PostgreSQL से सफलतापूर्वक कनेक्ट हो गया');
    done(); // क्लाइंट को पूल में वापस भेजें
});

// 5. एक 'टेस्ट' API रूट बनाएँ
app.get('/api/test-connection', (req, res) => {
    // PostgreSQL से एक सिंपल क्वेरी (query) चलाते हैं
    pool.query('SELECT 1 + 1 AS solution', (err, results) => {
        if (err) {
            console.error('क्वेरी एरर: ' + err.stack);
            return res.status(500).send('डेटाबेस क्वेरी फेल हो गई');
        }
        res.json(results.rows); // PostgreSQL में परिणाम results.rows में होते हैं
    });
});

// ----------------------------------------------------
// API Routes (रास्ते)
// ----------------------------------------------------
// 🔥 अस्थायी रूट: नया एडमिन बनाने के लिए (सुरक्षा के लिए इसे तुरंत हटा दें)
app.get('/api/create-admin-one-time', async (req, res) => {
    const adminEmail = 'new.admin@mylibrary.com'; // <--- नया ईमेल
    const adminPassword = 'AdminPass2025'; // <--- नया पासवर्ड
    const adminUsername = 'SystemAdmin';

    try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        // चेक करें कि यूज़र पहले से मौजूद तो नहीं है
        const checkSql = 'SELECT user_id FROM users WHERE email = $1';
        const existingUser = await pool.query(checkSql, [adminEmail]);

        if (existingUser.rowCount > 0) {
            return res.json({ success: false, message: 'एडमिन पहले से मौजूद है।' });
        }
        
        // नया एडमिन रिकॉर्ड जोड़ें (role='admin' सेट करें)
        const insertSql = 'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)';
        await pool.query(insertSql, [adminUsername, adminEmail, hashedPassword, 'admin']);
        
        res.json({ 
            success: true, 
            message: `नया एडमिन बनाया गया। ईमेल: ${adminEmail}, पासवर्ड: ${adminPassword}. **सुरक्षा के लिए इस रूट को जल्द ही हटा दें!**` 
        });

    } catch (error) {
        console.error("Admin creation error:", error);
        res.status(500).json({ success: false, message: 'एडमिन बनाने में त्रुटि।' });
    }
});
// रजिस्ट्रेशन रूट
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'कृपया सभी फ़ील्ड भरें।' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // PostgreSQL प्लेसहोल्डर्स: ? की जगह $1, $2, $3...
        const sql = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)';
        
        pool.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                // डुप्लीकेट एंट्री को PostgreSQL में अलग तरीके से हैंडल किया जाता है
                if (err.code === '23505') { // 23505 is the unique violation code
                    return res.status(409).json({ success: false, message: 'यह ईमेल पहले से पंजीकृत है।' });
                }
                console.error(err);
                return res.status(500).json({ success: false, message: 'रजिस्ट्रेशन फेल हो गया। सर्वर त्रुटि।' });
            }
            
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

    // 1. डेटाबेस से यूज़र को ईमेल द्वारा ढूँढें
    // PostgreSQL में कॉलम नाम 'password' नहीं, 'password_hash' है
    const sql = 'SELECT user_id, password_hash, role, account_status, username FROM users WHERE email = $1';
    
    pool.query(sql, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'सर्वर त्रुटि।' });
        }

        // 2. अगर यूज़र नहीं मिला
        if (results.rows.length === 0) { // PostgreSQL में परिणाम results.rows में होते हैं
            return res.status(401).json({ success: false, message: 'अमान्य ईमेल या पासवर्ड।' });
        }

        const user = results.rows[0];

        // 3. अकाउंट ब्लॉक है या नहीं जाँचें
        if (user.account_status === 'blocked') {
            return res.status(403).json({ success: false, message: 'आपका खाता ब्लॉक है। कृपया लाइब्रेरी ऑफिस से संपर्क करें।' });
        }

        // 4. पासवर्ड की तुलना करें (Hashing का उपयोग करके)
        // PostgreSQL से मिला कॉलम नाम 'password_hash' उपयोग करें
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'अमान्य ईमेल या पासवर्ड।' });
        }

        // 5. सफलता
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
    const sql = 'SELECT book_id, title, author, category, status FROM books ORDER BY title ASC';
    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'किताबें लोड करने में त्रुटि।' });
        }
        res.json({ success: true, books: results.rows });
    });
});

// 2. नई किताब जोड़ें (POST /api/books) - केवल Admin के लिए
app.post('/api/books', (req, res) => {
    const { title, author, category } = req.body;

    if (!title || !author || !category) {
        return res.status(400).json({ success: false, message: 'शीर्षक, लेखक और श्रेणी आवश्यक हैं।' });
    }

    const sql = 'INSERT INTO books (title, author, category) VALUES ($1, $2, $3) RETURNING book_id';
    
    pool.query(sql, [title, author, category], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'किताब जोड़ने में त्रुटि।' });
        }
        res.status(201).json({ 
            success: true, 
            message: 'किताब सफलतापूर्वक जोड़ी गई!',
            bookId: result.rows[0].book_id // PostgreSQL से ID प्राप्त करने का तरीका
        });
    });
});
// 3. किताब हटाएँ (DELETE /api/books/:id) - केवल Admin के लिए
app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    const sql = 'DELETE FROM books WHERE book_id = $1';
    
    pool.query(sql, [bookId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'किताब हटाने में त्रुटि।' });
        }
        
        if (result.rowCount === 0) { // PostgreSQL में affectedRows की जगह rowCount
            return res.status(404).json({ success: false, message: 'किताब नहीं मिली।' });
        }
        
        res.status(200).json({ success: true, message: 'किताब सफलतापूर्वक हटाई गई।' });
    });
});
// ----------------------------------------------------
// Users API Routes (केवल Admin के लिए)
// ----------------------------------------------------

// 1. सभी यूज़र्स दिखाएँ (GET /api/users)
app.get('/api/users', (req, res) => {
    // MySQL के " की जगह PostgreSQL में ' का उपयोग
    const sql = "SELECT user_id, username, email, role, account_status FROM users WHERE role != 'admin' ORDER BY user_id DESC";
    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'यूज़र्स लोड करने में त्रुटि।' });
        }
        res.json({ success: true, users: results.rows });
    });
});

// 2. यूज़र अकाउंट स्टेटस अपडेट करें (POST /api/users/status)
app.post('/api/users/status', (req, res) => {
    const { userId, status } = req.body;

    if (!userId || !status) {
        return res.status(400).json({ success: false, message: 'यूज़र ID और स्टेटस आवश्यक है।' });
    }

    const sql = "UPDATE users SET account_status = $1 WHERE user_id = $2 AND role != 'admin'";
    
    pool.query(sql, [status, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'स्टेटस अपडेट करने में त्रुटि।' });
        }
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'यूज़र नहीं मिला या एडमिन को अपडेट करने की अनुमति नहीं।' });
        }
        
        res.status(200).json({ success: true, message: `यूज़र का अकाउंट सफलतापूर्वक ${status} किया गया।` });
    });
});
// ----------------------------------------------------
// Issue & Return API Routes
// ----------------------------------------------------

// 1. किताब इश्यू करें (POST /api/issue-book)
app.post('/api/issue-book', (req, res) => {
    const { userId, bookId } = req.body;

    if (!userId || !bookId) {
        return res.status(400).json({ success: false, message: 'यूज़र ID और बुक ID आवश्यक है।' });
    }
    
    // PostgreSQL में ट्रांजेक्शन के लिए क्लाइंट का उपयोग किया जाता है
    pool.connect(async (err, client, done) => {
        if (err) return res.status(500).json({ success: false, message: 'इश्यू शुरू करने में त्रुटि।' });

        try {
            await client.query('BEGIN'); // ट्रांजेक्शन शुरू

            // A. किताब का स्टेटस 'available' है, यह जाँचें और अपडेट करें (MySQL से बेहतर)
            const checkAndUpdateSql = "UPDATE books SET status = 'issued' WHERE book_id = $1 AND status = 'available' RETURNING book_id";
            const updateResult = await client.query(checkAndUpdateSql, [bookId]);

            if (updateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'किताब उपलब्ध नहीं है या पहले से इश्यू है।' });
            }

            // B. इश्यू रिकॉर्ड जोड़ें
            // टेबल का नाम 'issued_books' की जगह 'issues' उपयोग करें
            const issueSql = 'INSERT INTO issues (user_id, book_id) VALUES ($1, $2)';
            await client.query(issueSql, [userId, bookId]);

            // C. सबमिट करें
            await client.query('COMMIT');
            res.status(200).json({ success: true, message: 'किताब सफलतापूर्वक इश्यू हुई!' });

        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Issue Transaction Error:", e);
            res.status(500).json({ success: false, message: 'इश्यू प्रोसेस करने में त्रुटि।' });
        } finally {
            done(); // क्लाइंट को पूल में वापस भेजें
        }
    });
});


// 2. स्टूडेंट के इश्यू किए गए ऑर्डर्स दिखाएँ (GET /api/my-orders/:userId)
app.get('/api/my-orders/:userId', (req, res) => {
    const userId = req.params.userId;
    
    // टेबल का नाम issued_books की जगह issues उपयोग करें
    const sql = `
        SELECT ib.issue_id, ib.issue_date, b.title, b.author, ib.status AS return_status
        FROM issues ib 
        JOIN books b ON ib.book_id = b.book_id 
        WHERE ib.user_id = $1 AND ib.return_date IS NULL
        ORDER BY ib.issue_date DESC`;

    pool.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'ऑर्डर्स लोड करने में त्रुटि।' });
        }
        res.json({ success: true, orders: results.rows });
    });
});

// 3. किताब रिटर्न करें (POST /api/return-book) - यह अब Admin द्वारा सीधे उपयोग नहीं होगा
// यह कोड आपके पिछले code में थोड़ा भ्रमित था, अब हम केवल request/handle-return का उपयोग करेंगे।
/* app.post('/api/return-book', (req, res) => { ... }) हटा दिया गया */


// 3. किताब रिटर्न के लिए रिक्वेस्ट भेजें (POST /api/request-return)
app.post('/api/request-return', (req, res) => {
    const { issueId } = req.body;
    
    if (!issueId) {
        return res.status(400).json({ success: false, message: 'इश्यू ID आवश्यक है।' });
    }
    
    // टेबल का नाम issued_books की जगह issues उपयोग करें
    const sql = `
        UPDATE issues 
        SET status = 'pending' 
        WHERE 
            issue_id = $1 AND 
            return_date IS NULL AND 
            (status = 'issued' OR status = 'rejected')`;

    pool.query(sql, [issueId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'रिटर्न रिक्वेस्ट भेजने में त्रुटि।' });
        }
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'इश्यू रिकॉर्ड नहीं मिला या रिक्वेस्ट पहले ही भेजी जा चुकी है।' });
        }
        res.status(200).json({ success: true, message: 'रिटर्न रिक्वेस्ट सफलतापूर्वक भेजी गई। एडमिन की पुष्टि का इंतज़ार है।' });
    });
});
// 4. लंबित रिटर्न रिक्वेस्ट दिखाएँ (GET /api/return-requests)
app.get('/api/return-requests', (req, res) => {
    // टेबल का नाम issued_books की जगह issues उपयोग करें
    const sql = `
        SELECT 
            ib.issue_id, 
            ib.book_id,
            u.username, 
            b.title, 
            b.author,
            ib.issue_date
        FROM issues ib
        JOIN users u ON ib.user_id = u.user_id
        JOIN books b ON ib.book_id = b.book_id
        WHERE ib.status = 'pending'
        ORDER BY ib.issue_date DESC`;

    pool.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'रिटर्न रिक्वेस्ट लोड करने में त्रुटि।' });
        }
        res.json({ success: true, requests: results.rows });
    });
});
// 5. एडमिन द्वारा रिटर्न रिक्वेस्ट को स्वीकार/अस्वीकार करें (POST /api/handle-return)
app.post('/api/handle-return', (req, res) => {
    const { issueId, bookId, action } = req.body; 

    if (!issueId || !bookId || !action || (action !== 'accept' && action !== 'reject')) {
        return res.status(400).json({ success: false, message: 'अमान्य अनुरोध डेटा।' });
    }

    pool.connect(async (err, client, done) => {
        if (err) return res.status(500).json({ success: false, message: 'प्रोसेस शुरू करने में त्रुटि।' });

        try {
            await client.query('BEGIN'); // ट्रांजेक्शन शुरू

            if (action === 'reject') {
                // A. केवल स्टेटस 'rejected' पर सेट करें 
                const rejectSql = "UPDATE issues SET status = 'rejected' WHERE issue_id = $1 AND status = 'pending'";
                const result = await client.query(rejectSql, [issueId]);
                
                if(result.rowCount === 0) throw new Error("रिक्वेस्ट नहीं मिली");

                await client.query('COMMIT');
                res.status(200).json({ success: true, message: 'रिटर्न रिक्वेस्ट अस्वीकार कर दी गई।' });
                
            } else if (action === 'accept') {
                
                // B. स्वीकार करें: 1. issues अपडेट करें (return_date और status)
                const updateIssueSql = "UPDATE issues SET return_date = NOW(), status = 'completed' WHERE issue_id = $1 AND status = 'pending'";
                const result = await client.query(updateIssueSql, [issueId]);

                if (result.rowCount === 0) throw new Error("लंबित रिक्वेस्ट नहीं मिली");

                // C. स्वीकार करें: 2. books टेबल में स्टेटस 'available' पर सेट करें
                const updateBookSql = "UPDATE books SET status = 'available' WHERE book_id = $1";
                await client.query(updateBookSql, [bookId]);
                    
                // D. कमिट करें (Commit)
                await client.query('COMMIT');
                res.status(200).json({ success: true, message: 'रिटर्न सफलतापूर्वक स्वीकार किया गया। किताब उपलब्ध हो गई है!' });
            }
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Admin Handle Transaction Error:", e);
            res.status(500).json({ success: false, message: e.message || 'रिटर्न प्रोसेस करने में त्रुटि।' });
        } finally {
            done(); // क्लाइंट को पूल में वापस भेजें
        }
    });
});
// 6. सर्वर को 'सुनने' (Listen) के लिए चालू करें
const PORT = process.env.PORT || 3000; // Render का पोर्ट या 3000 का उपयोग करें
app.listen(PORT, () => {
    console.log(`सर्वर पोर्ट ${PORT} पर चल रहा है`);
});