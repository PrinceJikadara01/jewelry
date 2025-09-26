const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Create a new pool instance. The Pool will read the DATABASE_URL environment
// variable automatically to connect to the database.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render's free tier Postgres
    }
});

// Function to query the database
const query = (text, params) => pool.query(text, params);

// Function to initialize the database tables
async function initializeDatabase() {
    try {
        // Create the users table if it doesn't exist
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        `);

        // Create the products table if it doesn't exist
        await query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(255) NOT NULL,
                price NUMERIC(10, 2) NOT NULL,
                description TEXT,
                imageUrl TEXT,
                isFeatured BOOLEAN DEFAULT FALSE
            )
        `);

        // Create the subscribers table
        await query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                subscribed_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Create the contact messages table
        await query(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                message TEXT NOT NULL,
                received_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        console.log('Database tables checked/created successfully.');

        // Add a default admin user if one doesn't exist
        const adminUsername = 'admin';
        const res = await query('SELECT * FROM users WHERE username = $1', [adminUsername]);

        if (res.rows.length === 0) {
            const salt = bcrypt.genSaltSync(10);
            // Default password is 'admin123'
            const hashedPassword = bcrypt.hashSync('admin123', salt);
            await query('INSERT INTO users (username, password) VALUES ($1, $2)', [adminUsername, hashedPassword]);
            console.log('Default admin user created with password "admin123"');
        }
    } catch (err) {
        console.error('Error initializing database:', err.stack);
        // We have removed process.exit(1) and will re-throw the error
        // so that server.js can handle it gracefully.
        throw err;
    }
}

module.exports = {
    query,
    initializeDatabase,
    pool
};