const express = require('express');
const cors = require('cors');
const multer = require('multer');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_super_secret_key_change_this';

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'https://swyam-project-ankit.vercel.app',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// SQLite Database Setup using sql.js (pure JS, no native bindings)
const dbPath = path.join(__dirname, 'database.sqlite');
let db;

async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rollNo TEXT NOT NULL,
        course TEXT NOT NULL,
        semester TEXT NOT NULL,
        enrolled TEXT NOT NULL,
        screenshot TEXT,
        theoryMarks INTEGER DEFAULT NULL,
        internalMarks INTEGER DEFAULT NULL,
        displayOrder INTEGER DEFAULT 0,
        submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Try to add new columns to existing table (will fail silently if they already exist)
    try {
        db.run(`ALTER TABLE submissions ADD COLUMN theoryMarks INTEGER DEFAULT NULL`);
        db.run(`ALTER TABLE submissions ADD COLUMN internalMarks INTEGER DEFAULT NULL`);
    } catch (e) {}
    try {
        db.run(`ALTER TABLE submissions ADD COLUMN displayOrder INTEGER DEFAULT 0`);
    } catch (e) {}
    try {
        db.run(`ALTER TABLE submissions ADD COLUMN semester TEXT NOT NULL DEFAULT '1st Semester'`);
    } catch (e) {}

    db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL
    )`);

    console.log('Connected to SQLite database (sql.js).');
}

// Save database to file periodically
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

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

    try {
        // Check if any teacher already exists
        const result = db.exec(`SELECT COUNT(*) FROM teachers`);
        const count = result[0].values[0][0];
        
        if (count > 0) {
            return res.status(403).json({ error: 'A teacher account already exists. Only one teacher is allowed.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword]);
        saveDatabase();
        res.status(201).json({ message: 'Teacher registered successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Registration failed' });
    }
});

// Teacher Login
app.post('/api/teacher/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = db.exec(`SELECT * FROM teachers WHERE email = ?`, [email]);
        if (result.length === 0 || result[0].values.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const row = result[0].values[0];
        const teacher = {
            id: row[0],
            email: row[1],
            password: row[2],
            name: row[3]
        };

        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: teacher.id, email: teacher.email }, SECRET_KEY, { expiresIn: '1d' });
        res.json({ token, name: teacher.name });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- STUDENT SUBMISSION ROUTES ---

// Submit Student Data (Public)
app.post('/api/submit', upload.single('screenshot'), (req, res) => {
    const { name, rollNo, course, semester, enrolled } = req.body;
    const screenshot = req.file ? req.file.filename : null;

    if (!name || !rollNo || !course || !semester || !enrolled) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Get max displayOrder to append to the bottom
        let maxOrder = 0;
        try {
            const result = db.exec(`SELECT MAX(displayOrder) FROM submissions`);
            if (result.length > 0 && result[0].values.length > 0 && result[0].values[0][0] !== null) {
                maxOrder = result[0].values[0][0] + 1;
            }
        } catch (e) {}

        db.run(`INSERT INTO submissions (name, rollNo, course, semester, enrolled, screenshot, displayOrder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, rollNo, course, semester, enrolled, screenshot, maxOrder]);
        saveDatabase();
        
        const lastId = db.exec(`SELECT last_insert_rowid()`)[0].values[0][0];
        res.status(201).json({ id: lastId, message: 'Submission successful' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save submission' });
    }
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
    try {
        const result = db.exec(`SELECT * FROM submissions ORDER BY displayOrder ASC, submittedAt DESC`);
        if (result.length === 0) return res.json([]);

        const columns = result[0].columns;
        const rows = result[0].values.map(row => {
            const obj = {};
            columns.forEach((col, i) => { obj[col] = row[i]; });
            return obj;
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// Update Marks for a Submission (Requires Login)
app.put('/api/submissions/:id/marks', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { theoryMarks, internalMarks } = req.body;

    // Convert to integers, or null if empty
    const tMarks = theoryMarks !== '' && theoryMarks !== undefined ? parseInt(theoryMarks, 10) : null;
    const iMarks = internalMarks !== '' && internalMarks !== undefined ? parseInt(internalMarks, 10) : null;

    try {
        db.run(`UPDATE submissions SET theoryMarks = ?, internalMarks = ? WHERE id = ?`, [tMarks, iMarks, id]);
        saveDatabase();
        res.json({ message: 'Marks updated successfully' });
    } catch (err) {
        console.error('Error updating marks:', err);
        res.status(500).json({ error: 'Failed to update marks' });
    }
});

// Delete Submission (Requires Login)
app.delete('/api/submissions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    try {
        db.run(`DELETE FROM submissions WHERE id = ?`, [id]);
        saveDatabase();
        res.json({ message: 'Submission deleted successfully' });
    } catch (err) {
        console.error('Error deleting submission:', err);
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

// Reorder Submissions (Requires Login)
app.put('/api/submissions/reorder', authenticateToken, (req, res) => {
    const { orderedIds } = req.body; // Array of IDs in the new order

    if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        orderedIds.forEach((id, index) => {
            db.run(`UPDATE submissions SET displayOrder = ? WHERE id = ?`, [index, id]);
        });
        saveDatabase();
        res.json({ message: 'Order saved successfully' });
    } catch (err) {
        console.error('Error reordering submissions:', err);
        res.status(500).json({ error: 'Failed to save order' });
    }
});

// Initialize database then start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
