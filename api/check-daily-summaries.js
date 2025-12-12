/**
 * Check daily_summaries table structure
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quality_tickets_system'
};

async function check() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database
        });
        
        const [rows] = await connection.query('DESCRIBE daily_summaries');
        console.log('Columns in daily_summaries:');
        rows.forEach(row => {
            console.log(`  - ${row.Field} (${row.Type})`);
        });
        
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
        if (connection) {
            await connection.end();
        }
        process.exit(1);
    }
}

check();

