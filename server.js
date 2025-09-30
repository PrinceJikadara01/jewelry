require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');
const nodemailer = require('nodemailer');
// Import the new database query function and initializer
const { query, initializeDatabase, pool } = require('./database.js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// --- Cloudinary Configuration ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// --- Nodemailer Configuration ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static Files ---
app.use(express.static(__dirname));

// --- Multer Setup for File Uploads ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- API Endpoints ---

// Admin Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }
    try {
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful!', token: token });
    } catch (err) {
        console.error('Server error during login:', err);
        res.status(500).json({ message: 'Server error during login.', error: err.message });
    }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- Product API Endpoints ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error retrieving products:', err);
        res.status(500).json({ message: 'Error retrieving products.', error: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: `Product with id ${id} not found.` });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`Error retrieving product with id ${id}:`, err);
        res.status(500).json({ message: 'Error retrieving product.', error: err.message });
    }
});

app.post('/api/products', authenticateToken, upload.single('image'), async (req, res) => {
    const { name, category, price, description, isFeatured } = req.body;
    if (!req.file) {
        return res.status(400).json({ message: 'Product image is required.' });
    }
    if (!name || !category || !price) {
        return res.status(400).json({ message: 'Name, category, and price are required.' });
    }
    let imageUrl = '';
    try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: "aethelred_products" });
        imageUrl = cloudinaryResponse.secure_url;
    } catch (uploadError) {
        console.error('Cloudinary Upload Error:', uploadError);
        return res.status(500).json({ message: 'Error uploading image.', error: uploadError.message });
    }
    const sql = `INSERT INTO products (name, category, price, description, imageUrl, isFeatured) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    const params = [name, category, parseFloat(price), description, imageUrl, isFeatured === 'true'];
    try {
        const result = await query(sql, params);
        res.status(201).json({ message: 'Product added successfully!', productId: result.rows[0].id });
    } catch (err) {
        console.error('Database Error on Product POST:', err);
        res.status(500).json({ message: 'Error adding product to database.', error: err.message });
    }
});

app.put('/api/products/:id', authenticateToken, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, category, price, description, isFeatured } = req.body;
    if (!name || !category || !price) {
        return res.status(400).json({ message: 'Name, category, and price are required.' });
    }
    try {
        const productResult = await query('SELECT * FROM products WHERE id = $1', [id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: `Product with id ${id} not found.` });
        }
        const product = productResult.rows[0];
        let imageUrl = product.imageUrl;
        if (req.file) {
            try {
                const b64 = Buffer.from(req.file.buffer).toString("base64");
                let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, { folder: "aethelred_products" });
                imageUrl = cloudinaryResponse.secure_url;
            } catch (uploadError) {
                return res.status(500).json({ message: 'Error uploading new image.', error: uploadError.message });
            }
        }
        const sql = `UPDATE products SET name = $1, category = $2, price = $3, description = $4, imageUrl = $5, isFeatured = $6 WHERE id = $7`;
        const params = [name, category, parseFloat(price), description, imageUrl, isFeatured === 'true', id];
        const updateResult = await query(sql, params);
        if (updateResult.rowCount === 0) {
            res.status(404).json({ message: `Product with id ${id} not found.` });
        } else {
            res.json({ message: `Product with id ${id} updated successfully.` });
        }
    } catch (err) {
        console.error(`Error updating product with id ${id}:`, err);
        res.status(500).json({ message: `Error updating product with id ${id}.`, error: err.message });
    }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const productResult = await query('SELECT * FROM products WHERE id = $1', [id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: `Product with id ${id} not found.` });
        }
        await query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: `Product with id ${id} deleted successfully.` });
    } catch (err) {
        console.error(`Error deleting product with id ${id}:`, err);
        res.status(500).json({ message: `Error deleting product with id ${id}.`, error: err.message });
    }
});

app.post('/api/products/import', authenticateToken, async (req, res) => {
    const products = req.body;
    if (!Array.isArray(products)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of products.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sql = `INSERT INTO products (name, category, price, description, imageUrl, isFeatured) VALUES ($1, $2, $3, $4, $5, $6)`;
        for (const product of products) {
            const params = [
                product.name || 'Unnamed Product',
                product.category || 'Uncategorized',
                parseFloat(product.price) || 0,
                product.description || '',
                product.imageUrl || '',
                product.isFeatured || false
            ];
            await client.query(sql, params);
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Products imported successfully!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during product import transaction:', err);
        res.status(500).json({ message: 'An error occurred during the import process.', error: err.message });
    } finally {
        client.release();
    }
});

// --- Form Submission Endposints ---

app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email address is required.' });
    }
    try {
        const existing = await query('SELECT id FROM subscribers WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'This email is already subscribed.' });
        }
        await query('INSERT INTO subscribers (email) VALUES ($1)', [email]);
        res.status(201).json({ message: 'Thank you for subscribing!' });
    } catch (err) {
        console.error('Error during subscription:', err);
        res.status(500).json({ message: 'An error occurred on the server.', error: err.message });
    }
});

// POST a new contact message
app.post('/api/contact', async (req, res) => {

    const config = {
        mail_to : process.env.EMAIL_TO
    }

    const { name, email, subject, message } = req.body;
    if (!name || !email || !message || !config.mail_to) {
        return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    try {
        // --- Database Insertion (Optional) ---
        try {
            const sql = `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`;
            await query(sql, [name, email, subject, message]);
        } catch (dbError) {
            console.warn("WARNING: Failed to save contact message to database. Continuing to send email.", dbError.message);
        }

        // --- Email Notification ---
        try {
            const mailOptions = {
                from: `"Aethelred Website" <${email}>`,
                to: config.mail_to,
                subject: `New Contact Form Message: ${subject}`,
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6;">
                        <h2>New Message from Aethelred Website</h2>
                        <p>You have received a new message through your contact form.</p>
                        <hr>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
                        <p><strong>Message:</strong></p>
                        <p style="padding: 10px; border-left: 3px solid #eee;">${message.replace(/\n/g, '<br>')}</p>
                    </div>
                `,
            };
            await transporter.sendMail(mailOptions);
            res.status(201).json({ message: 'Your message has been sent successfully!' });
        } catch (emailError) {
            console.error('Failed to send contact email:', emailError);
            res.status(500).json({ message: 'Failed to send email notification.' });
        }
    } catch (err) {
        console.error('Critical error in /api/contact route:', err);
        res.status(500).json({ message: 'An error occurred on the server.', error: err.message });
    }
});

// --- Frontend Page Routes ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});
app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'products.html'));
});
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});
app.get('/owner', (req, res) => {
    res.sendFile(path.join(__dirname, 'owner.html'));
});
app.get('/product', (req, res) => {
    res.sendFile(path.join(__dirname, 'product.html'));
});
app.get('/wishlist', (req, res) => {
    res.sendFile(path.join(__dirname, 'wishlist.html'));
});

// --- Server Initialization ---
async function startServer() {
    try {
        await initializeDatabase(); // Try to connect to the database
    } catch (dbError) {
        console.warn("*******************************************************************");
        console.warn("WARNING: Could not connect to the database.");
        console.warn("The contact form will still send emails, but other features may not work.");
        console.warn(`Database error: ${dbError.message}`);
        console.warn("*******************************************************************");
    }
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

startServer();