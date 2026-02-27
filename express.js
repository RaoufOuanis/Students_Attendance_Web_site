const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');
const os = require('os');
const basicAuth = require('express-basic-auth'); 
const app = express();
const server = http.createServer(app);
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
const io = socketIo(server); // Attach Socket.IO to your server
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json()); // Use json parser for body
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', basicAuth({
    users: { 'admin': 'wifakstif19000' },
    challenge: true,
    realm: 'Admin Area',
}));

let isRegistrationEnabled = true;
let db;
mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'wifakstif19000',
    database: process.env.DB_NAME || 'attendance'
}).then((connection) => {
    db = connection;
    const port = process.env.PORT || 3000;
    server.listen(port, () => console.log(`Listening on port ${port}`));
    setupRoutes();
}).catch((err) => {
    console.error(err);
});

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                continue;
            }
            return iface.address;
        }
    }
}

function setupRoutes() {
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'main.htm'));
    });
    app.get('/isRegistrationEnabled', (req, res) => {
        res.json({ enabled: isRegistrationEnabled });
    });

    const QRCode = require('qrcode');

    app.get('/ip', async (req, res) => {
        const url = `http://${getLocalIP()}:3000`;
        const qr = await QRCode.toDataURL(url);
        res.render('ip', { qr });
    });

    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'admin.htm'));
    });

    app.get('/students', async (req, res) => {
        try {
            await db.execute('ALTER TABLE students AUTO_INCREMENT = 1');
            const [rows] = await db.execute('SELECT * FROM students');
            res.json(rows);
        } catch (err) {
            console.error(err);
            res.send('An error occurred');
        }
    });

    app.post('/toggle', (req, res) => {
        isRegistrationEnabled = req.body.enable;
        if (req.body.enable) {
            io.emit('enableButton');
            res.send('Registration enabled');
        } else {
            io.emit('disableButton');
            res.send('Registration disabled');
        }
        
    });

    app.post('/register', async (req, res) => {
        if (!isRegistrationEnabled) {
            res.send('تم توقيف التسجيل حالياً');
            return;
        }
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        let studentId = req.body.studentId;
        if (!ip) {
            res.send('IP address');
            return;
        }
        if (!studentId || studentId.length < 8 || isNaN(studentId)) {
            res.send('هذا الرقم لا يبدو رقم طالب صحيح');
            return;
        }

        studentId = studentId.slice(-8);

        try {
            const [existingStudentId] = await db.execute('SELECT * FROM students WHERE RIGHT(studentId, 8) = ?', [studentId]);
            const [existingIp] = await db.execute('SELECT * FROM students WHERE ip = ?', [ip]);

        if (existingStudentId.length > 0) {
            res.send('التسجيل غير ممكن بسبب تكرار رقم الطالب.');
            return;
        }

        if (existingIp.length > 0) {
           res.send('التسجيل غير ممكن بسبب تكرار عنوان IP.');
           return;
        }

         const [rows] = await db.execute('SELECT name, surname, StudentIdL FROM mylist WHERE RIGHT(StudentIdL, 8) = ?', [studentId]);

        if (rows.length > 0) {
        const { name, surname, StudentIdL } = rows[0];
        
        await db.execute('INSERT INTO students (ip, studentId) VALUES (?, ?)', [ip, StudentIdL]);
        res.send(`تم التسجيل بنجاح للطالب (ة)  ${name} ${surname}`);
        } else {
        res.send('التسجيل غير ممكن بسبب عدم وجود هذا الرقم في القائمة الرسمية.');
        }
        } catch (err) {
            console.error(err);
            res.send('حصل خطأ أثناء عملية التسجيل يرجى تكرار المحاولة بعد لحظات');
        }
        
    });
    app.post('/addStudent', async (req, res) => {
        const { studentId } = req.body;
        const studentIp = '127.0.0.1'; // Bogus IP address
    
        try {
            await db.execute('INSERT INTO students (ip, studentId) VALUES (?, ?)', [studentIp, studentId]);
            res.send('Student added successfully');
        } catch (err) {
            console.error(err);
            res.send('An error occurred');
        }
    });
    
    app.post('/removeStudent', async (req, res) => {
        const { studentId } = req.body;
    
        try {
            await db.execute('DELETE FROM students WHERE studentId = ?', [studentId]);
            res.send('Student removed successfully');
        } catch (err) {
            console.error(err);
            res.send('An error occurred');
        }
    });
    app.post('/removeAllStudents', async (req, res) => {
        try {
            await db.query('DELETE FROM students');
            res.status(200).send('All students have been removed');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    });

    app.post('/admin/importMyList', async (req, res) => {
        const rows = req.body?.rows;
        if (!Array.isArray(rows) || rows.length === 0) {
            res.status(400).json({ error: 'No rows provided' });
            return;
        }
        if (rows.length > 20000) {
            res.status(413).json({ error: 'Too many rows' });
            return;
        }

        const normalized = rows
            .map((r) => {
                const name = (r?.name ?? '').toString().trim();
                const surname = (r?.surname ?? '').toString().trim();
                const StudentIdL = (r?.StudentIdL ?? '').toString().trim();
                return { name, surname, StudentIdL };
            })
            .filter((r) => r.StudentIdL.length > 0);

        if (normalized.length === 0) {
            res.status(400).json({ error: 'No valid StudentIdL values found' });
            return;
        }

        const chunkSize = 500;
        let inserted = 0;

        try {
            await db.beginTransaction();

            for (let i = 0; i < normalized.length; i += chunkSize) {
                const chunk = normalized.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => '(?, ?, ?)').join(',');
                const values = chunk.flatMap((r) => [r.name, r.surname, r.StudentIdL]);

                const [result] = await db.execute(
                    `INSERT INTO mylist (name, surname, StudentIdL) VALUES ${placeholders}`,
                    values
                );
                inserted += result?.affectedRows ?? 0;
            }

            await db.commit();
            res.json({ inserted, received: rows.length, valid: normalized.length });
        } catch (err) {
            try {
                await db.rollback();
            } catch (rollbackErr) {
                console.error('Rollback error:', rollbackErr);
            }

            if (err && err.code === 'ER_NO_SUCH_TABLE') {
                res.status(500).json({
                    error: 'Table mylist does not exist in database',
                    hint: 'Create table mylist (name, surname, StudentIdL) then retry'
                });
                return;
            }

            console.error(err);
            res.status(500).json({ error: 'Import failed' });
        }
    });
}