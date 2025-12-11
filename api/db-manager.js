/**
 * Database Connection Manager
 */

const mysql = require('mysql2/promise');
const config = require('./config');

let pool = null;

async function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: config.db.host,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            waitForConnections: true,
            connectionLimit: config.db.connectionLimit,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
    }
    return pool;
}

async function query(sql, params = []) {
    const connection = await getPool();
    const [results] = await connection.execute(sql, params);
    return results;
}

async function queryOne(sql, params = []) {
    const results = await query(sql, params);
    return results[0] || null;
}

module.exports = {
    getPool,
    query,
    queryOne
};

