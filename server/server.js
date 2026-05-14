const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_super_secret_key_change_this'; // Use .env in production

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// SQLite Database Setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        
        // Submissions table
        db.run(`CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rollNo TEXT NOT NULL,
            course TEXT NOT NULL,
            enrolled TEXT NOT NULL,
            screenshot TEXT,
            submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Teachers table
        db.run(`CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL
        )`);
    }
});

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// --- TEACHER AUTH ROUTES ---

// Teacher Register
app.post('/api/teacher/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)`;

    db.run(query, [name, email, hashedPassword], function(err) {
        if (err) return res.status(400).json({ error: 'Email already exists' });
        res.status(201).json({ message: 'Teacher registered successfully' });
    });
});

// Teacher Login
app.post('/api/teacher/login', (req, res) => {
    const { email, password } = req.body;
    const query = `SELECT * FROM teachers WHERE email = ?`;

    db.get(query, [email], async (err, teacher) => {
        if (err || !teacher) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: teacher.id, email: teacher.email }, SECRET_KEY, { expiresIn: '1d' });
        res.json({ token, name: teacher.name });
    });
});

// --- STUDENT SUBMISSION ROUTES ---

// Submit Student Data (Public)
app.post('/api/submit', upload.single('screenshot'), (req, res) => {
    const { name, rollNo, course, enrolled } = req.body;
    const screenshot = req.file ? req.file.filename : null;

    if (!name || !rollNo || !course || !enrolled) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `INSERT INTO submissions (name, rollNo, course, enrolled, screenshot) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [name, rollNo, course, enrolled, screenshot], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to save submission' });
        res.status(201).json({ id: this.lastID, message: 'Submission successful' });
    });
});

// --- PROTECTED TEACHER ROUTES ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Get All Submissions (Requires Login)
app.get('/api/submissions', authenticateToken, (req, res) => {
    const query = `SELECT * FROM submissions ORDER BY submittedAt DESC`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch submissions' });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
