// Database Configuration
require('dotenv').config();

module.exports = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'quality_tickets_system',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0
    },
    server: {
        port: process.env.PORT || 3001
    },
    upload: {
        dest: '../uploads/',
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB
        }
    }
};

