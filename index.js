const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const app = express();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2024',
    port: 3306,
    database: 'wpr2001140033'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database as ID ' + connection.threadId);
});

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.render('signin', { error: req.query.error });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
        if (err || results.length === 0) {
            res.redirect('/?error=Invalid email or password');
        } else {
            req.session.loggedInUserId = results[0].id;
            req.session.user = results[0];
            res.redirect('/inbox');
        }
    });
});

app.get('/signup', (req, res) => {
    const success = req.query.success;
    const error = req.query.error;
    res.render('signup', { success, error });
});

app.post('/register', (req, res) => {
    const { fullname, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.redirect('/signup?error=Passwords do not match');
    }

    if (password.length < 6) {
        return res.redirect('/signup?error=Password must be at least 6 characters');
    }

    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error checking email existence:', err);
            return res.redirect('/signup?error=Registration failed');
        }

        if (results.length > 0) {
            return res.redirect('/signup?error=Email is already in use');
        }

        connection.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, password], (err, results) => {
            if (err) {
                console.error('Error registering user:', err);
                res.redirect('/signup?error=Registration failed');
            } else {
                req.session.user = { id: results.insertId, fullname, email };
                res.redirect('/signup?success=Registration successful');
            }
        });
    });
});


app.get('/inbox', (req, res) => {
    const user = req.session.user;
    if (!user) {
        res.status(403).send('Access Denied');
        return;
    }

    const userId = user.id;
    const fullname = user.fullname;

    connection.query('SELECT * FROM emails WHERE receiver_id = ?', [userId], (err, results) => {
        if (err) {
            res.status(500).send('Internal Server Error');
            return;
        }

        const receivedEmails = results;
        const totalPages = 5;

        res.render('inbox', { fullname, receivedEmails, totalPages });
    });
});

app.get('/emailDetail/:emailId', (req, res) => {
    const user = req.session.user;
    if (!user) {
        res.status(403).send('Access Denied');
        return;
    }

    const emailId = req.params.emailId;
    connection.query('SELECT * FROM emails WHERE id = ?', [emailId], (err, results) => {
        if (err || results.length === 0) {
            res.status(404).send('Email not found');
            return;
        }

        const fullname = user.fullname;
        const email = results[0];
        res.render('emailDetail', { user, fullname, email });
    });
});


app.post('/deleteEmails', (req, res) => {
    const { emailIds } = req.body;

    const deleteQuery = `DELETE FROM emails WHERE id IN (${emailIds.join(',')})`;

    connection.query(deleteQuery, (err, result) => {
        if (err) {
            console.error('Error deleting emails:', err);
            res.status(500).json({ error: 'Error deleting emails' });
            return;
        }
        console.log('Emails deleted successfully:', result.affectedRows);
        res.json({ message: 'Emails deleted successfully' });
    });
});



app.use((req, res, next) => {
    res.locals.successMessage = req.session.successMessage;
    res.locals.error = req.session.error;
    delete req.session.successMessage;
    delete req.session.error;
    next();
});

app.post('/send-email', upload.single('attachment'), (req, res) => {
    const { recipient, subject, body } = req.body;
    const attachment = req.file ? req.file.path : null;
    const loggedInUserId = req.session.loggedInUserId;

    if (!recipient) {
        req.session.error = 'Please select a recipient';
        res.redirect('/compose');
        return;
    }

    connection.query('SELECT fullname FROM users WHERE id = ?', [loggedInUserId], (err, userRows) => {
        if (err || userRows.length === 0) {
            console.error('Error fetching sender information:', err);
            req.session.error = 'Error fetching sender information';
            res.redirect('/compose');
            return;
        }

        const senderName = userRows[0].fullname; 

        const emailData = {
            sender_id: loggedInUserId,
            senderName: senderName, 
            receiver_id: recipient,
            subject: subject || '(no subject)',
            message: body || '(no content)',
            attachment: attachment || null
        };

        connection.query('INSERT INTO emails SET ?', emailData, (err, result) => {
            if (err) {
                console.error('Error sending email:', err);
                req.session.error = 'Error sending email';
            } else {
                req.session.successMessage = 'Email sent successfully!';
            }
            res.redirect('/compose');
        });
    });
});


app.get('/compose', (req, res) => {
    const loggedInUserId = req.session.loggedInUserId;
    if (!loggedInUserId) {
        res.status(403).send('Access Denied');
        return;
    }

    connection.query('SELECT id, fullname FROM users WHERE id = ?', [loggedInUserId], (err, userRows) => {
        if (err) {
            console.error('Error fetching user information:', err);
            req.session.error = 'Error fetching user information';
            res.redirect('/compose');
            return;
        }

        if (userRows.length === 0) {
            req.session.error = 'User does not exist';
            res.redirect('/compose');
            return;
        }

        const fullname = userRows[0].fullname;

        connection.query('SELECT id, fullname FROM users WHERE id <> ?', [loggedInUserId], (err, otherUsersRows) => {
            if (err) {
                console.error('Error fetching user list', err);
                req.session.error = 'Error fetching user list';
                res.redirect('/compose');
                return;
            }

            res.render('compose', { users: otherUsersRows, fullname });
        });
    });
});



app.get('/outbox', (req, res) => {
    const user = req.session.user;
    if (!user) {
        res.status(403).send('Access Denied');
        return;
    }

    const userId = user.id;
    const fullname = user.fullname;

    connection.query('SELECT * FROM emails WHERE sender_id = ?', [userId], (err, results) => {
        if (err) {
            res.status(500).send('Internal Server Error');
            return;
        }

        const sentEmails = results;
        const totalPages = 5;

        res.render('outbox', { fullname, sentEmails, totalPages });
    });
});



app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});


app.listen(8000, () => {
    console.log('Server is running on port 8000');
});
