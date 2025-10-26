const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432, 
    ssl: { rejectUnauthorized: false } 
});

pool.connect((err, client, done) => {
    if (err) {
        console.error('PostgreSQL connection error: ', err.stack);
        return;
    }
    console.log('PostgreSQL connected successfully');
    done(); 
});

app.get('/api/test-connection', (req, res) => {
    
    pool.query('SELECT 1 + 1 AS solution', (err, results) => {
        if (err) {
            console.error('Query error: ' + err.stack);
            return res.status(500).send('Database query failed');
        }
        res.json(results.rows); 
    });
});

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        

        const sql = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)';
        
        pool.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {

                if (err.code === '23505') { // 23505 is the unique violation code
                    return res.status(409).json({ success: false, message: 'This email is already registered.' });
                }
                console.error(err);
                return res.status(500).json({ success: false, message: 'Registration failed. Server error.' });
            }

            res.status(201).json({ success: true, message: 'Registration successful! Please log in.' });
        });
    } catch (hashError) {
        console.error("Hashing error:", hashError);
        res.status(500).json({ success: false, message: 'Error processing password.' });
    }
});


// Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    const sql = 'SELECT user_id, password_hash, role, account_status, username FROM users WHERE email = $1';
    
    pool.query(sql, [email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }

        
        if (results.rows.length === 0) { 
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = results.rows[0];

        
        if (user.account_status === 'blocked') {
            return res.status(403).json({ success: false, message: 'Your account is blocked. Please contact the library office.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user.user_id,
                username: user.username,
                role: user.role 
            }
        });
    });
});

app.get('/api/books', (req, res) => {
    const sql = 'SELECT book_id, title, author, category, status FROM books ORDER BY title ASC';
    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error loading books.' });
        }
        res.json({ success: true, books: results.rows });
    });
});


app.post('/api/books', (req, res) => {
    const { title, author, category } = req.body;

    if (!title || !author || !category) {
        return res.status(400).json({ success: false, message: 'Title, author, and category are required.' });
    }

    const sql = 'INSERT INTO books (title, author, category) VALUES ($1, $2, $3) RETURNING book_id';
    
    pool.query(sql, [title, author, category], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error adding book.' });
        }
        res.status(201).json({
            success: true,
            message: 'Book added successfully!',
            bookId: result.rows[0].book_id 
        });
    });
});

app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    const sql = 'DELETE FROM books WHERE book_id = $1';
    
    pool.query(sql, [bookId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error deleting book.' });
        }
        
        if (result.rowCount === 0) { 
            return res.status(404).json({ success: false, message: 'Book not found.' });
        }

        res.status(200).json({ success: true, message: 'Book deleted successfully.' });
    });
});

app.get('/api/users', (req, res) => {

    const sql = "SELECT user_id, username, email, role, account_status FROM users WHERE role != 'admin' ORDER BY user_id DESC";
    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error loading users.' });
        }
        res.json({ success: true, users: results.rows });
    });
});


app.post('/api/users/status', (req, res) => {
    const { userId, status } = req.body;

    if (!userId || !status) {
        return res.status(400).json({ success: false, message: 'User ID and status are required.' });
    }

    const sql = "UPDATE users SET account_status = $1 WHERE user_id = $2 AND role != 'admin'";
    
    pool.query(sql, [status, userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error updating status.' });
        }
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found or cannot update admin.' });
        }

        res.status(200).json({ success: true, message: `User account successfully ${status}.` });
    });
});

app.post('/api/issue-book', (req, res) => {
    const { userId, bookId } = req.body;

    if (!userId || !bookId) {
        return res.status(400).json({ success: false, message: 'User ID and book ID are required.' });
    }
    
    pool.connect(async (err, client, done) => {
        if (err) return res.status(500).json({ success: false, message: 'Error starting issue process.' });

        try {
            await client.query('BEGIN'); 

            
            const checkAndUpdateSql = "UPDATE books SET status = 'issued' WHERE book_id = $1 AND status = 'available' RETURNING book_id";
            const updateResult = await client.query(checkAndUpdateSql, [bookId]);

            if (updateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Book not available or already issued.' });
            }

            
            const issueSql = 'INSERT INTO issues (user_id, book_id) VALUES ($1, $2)';
            await client.query(issueSql, [userId, bookId]);


            await client.query('COMMIT');
            res.status(200).json({ success: true, message: 'Book issued successfully!' });

        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Issue Transaction Error:", e);
            res.status(500).json({ success: false, message: 'Error processing issue.' });
        } finally {
            done(); 
        }
    });
});



app.get('/api/my-orders/:userId', (req, res) => {
    const userId = req.params.userId;
    

    const sql = `
        SELECT ib.issue_id, ib.issue_date, b.title, b.author, ib.status AS return_status
        FROM issues ib 
        JOIN books b ON ib.book_id = b.book_id 
        WHERE ib.user_id = $1 AND ib.return_date IS NULL
        ORDER BY ib.issue_date DESC`;

    pool.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error loading orders.' });
        }
        res.json({ success: true, orders: results.rows });
    });
});


app.post('/api/request-return', (req, res) => {
    const { issueId } = req.body;
    
    if (!issueId) {
        return res.status(400).json({ success: false, message: 'Issue ID is required.' });
    }

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
            return res.status(500).json({ success: false, message: 'Error sending return request.' });
        }
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Issue record not found or request already sent.' });
        }
        res.status(200).json({ success: true, message: 'Return request sent successfully. Awaiting admin approval.' });
    });
});

app.get('/api/return-requests', (req, res) => {
   
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
            return res.status(500).json({ success: false, message: 'Error loading return requests.' });
        }
        res.json({ success: true, requests: results.rows });
    });
});

app.post('/api/handle-return', (req, res) => {
    const { issueId, bookId, action } = req.body; 

    if (!issueId || !bookId || !action || (action !== 'accept' && action !== 'reject')) {
        return res.status(400).json({ success: false, message: 'Invalid request data.' });
    }

    pool.connect(async (err, client, done) => {
        if (err) return res.status(500).json({ success: false, message: 'Error starting process.' });

        try {
            await client.query('BEGIN'); 

            if (action === 'reject') {
            
                const rejectSql = "UPDATE issues SET status = 'rejected' WHERE issue_id = $1 AND status = 'pending'";
                const result = await client.query(rejectSql, [issueId]);
                
                if(result.rowCount === 0) throw new Error("long pending request not found");

                await client.query('COMMIT');
                res.status(200).json({ success: true, message: 'Return request rejected successfully.' });

            } else if (action === 'accept') {
                
                
                const updateIssueSql = "UPDATE issues SET return_date = NOW(), status = 'completed' WHERE issue_id = $1 AND status = 'pending'";
                const result = await client.query(updateIssueSql, [issueId]);

                if (result.rowCount === 0) throw new Error("long pending request not found");

                
                const updateBookSql = "UPDATE books SET status = 'available' WHERE book_id = $1";
                await client.query(updateBookSql, [bookId]);

                if (result.rowCount === 0) throw new Error("long pending request not found");

                await client.query('COMMIT');
                res.status(200).json({ success: true, message: 'Return request accepted successfully. Book is now available!' });
            }
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Admin Handle Transaction Error:", e);
            res.status(500).json({ success: false, message: e.message || 'Error processing return request.' });
        } finally {
            done(); 
        }
    });
});

const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});