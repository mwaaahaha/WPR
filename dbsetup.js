const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'wpr',
  password: 'fit2024',
  port: 3306,
  database: 'wpr2001140033'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database successfully');
});

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
  )
`;

const insertUsersData = `
  INSERT INTO users (fullname, email, password) VALUES
    ('User1', 'a@a.com', '123'),
    ('User2', 'b@b.com', '123'),
    ('User3', 'c@c.com', '123'),
    ('User4', 'd@d.com', '123'),
    ('User5', 'e@e.com', '123')
`;

const createEmailsTable = `
  CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    senderName VARCHAR(50) NOT NULL,
    timeSent TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    messagePreview VARCHAR(255) AS (SUBSTRING_INDEX(message, ' ', 10)) PERSISTENT,
    attachment VARCHAR(100), 
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )
`;


const insertEmailsData = `
  INSERT INTO emails (sender_id, receiver_id, subject, message, senderName, attachment)
  VALUES
    (2, 1, 'Test email 1', 'Hello from User2 to User1', 'User2', 'attachment1.pdf'),
    (3, 1, 'Test email 2', 'Hi User1, this is User3', 'User3', 'attachment2.docx'),
    (1, 2, 'Reply to User2', 'Hey User2, this is User1 replying', 'User1', 'attachment3.jpg'),
    (1, 3, 'Another message', 'Message from User1 to User3', 'User1', 'attachment4.pdf'),
    (2, 1, 'Important Proposal', 'Dear User1, please find the proposal attached.', 'User2', 'proposal.pdf'),
    (1, 2, 'Project Update', 'Hi User2, here is the latest update on the project.', 'User1', 'update.docx'),
    (3, 1, 'Meeting Invitation', 'Hello User1, inviting you to the upcoming meeting.', 'User3', 'invite.pdf'),
    (2, 3, 'Feedback Request', 'Hi User3, seeking your feedback on the recent discussion.', 'User2', 'feedback_form.pdf'),
    (3, 2, 'Status Update', 'Hello User2, sharing the current status report.', 'User3', 'status_report.pdf'),
    (1, 3, 'Feedback Received', 'Hi User3, thank you for providing your feedback.', 'User1', 'thank_you.pdf'),
    (3, 2, 'Weekly Newsletter', 'Hello User2, here is the weekly newsletter.', 'User3', 'newsletter.pdf')
`;


connection.query(createUsersTable, (err) => {
  if (err) throw err;
  console.log('Users table created successfully');
  connection.query(insertUsersData, (err) => {
    if (err) throw err;
    console.log('Sample users data inserted successfully');
  });
});

connection.query(createEmailsTable, (err) => {
  if (err) throw err;
  console.log('Emails table created successfully');
  connection.query(insertEmailsData, (err) => {
    if (err) throw err;
    console.log('Sample emails data inserted successfully');
    connection.end();
  });
});
