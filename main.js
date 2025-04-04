const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const { Client } = require('pg');
const mysql = require('mysql2/promise');

const db = new Database(path.join(app.getPath('userData'), 'connections.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS connections (
                                               id INTEGER PRIMARY KEY AUTOINCREMENT,
                                               name TEXT,
                                               type TEXT,
                                               host TEXT,
                                               port INTEGER,
                                               username TEXT,
                                               password TEXT,
                                               default_database TEXT
    )
`);

// Загрузка таблиц для PostgreSQL и MySQL
ipcMain.handle('load-tables', async (event, conn, database) => {
    if (conn.type === 'postgres') {
        const client = new Client({
            host: conn.host,
            port: conn.port,
            user: conn.username,
            password: conn.password,
            database,
        });

        try {
            await client.connect();
            const res = await client.query(`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
            `);
            await client.end();
            return res.rows.map((row) => row.table_name);
        } catch (err) {
            console.error('Ошибка при получении таблиц:', err.message);
            throw new Error('Ошибка при подключении к базе данных: ' + err.message);
        }
    } else if (conn.type === 'mysql') {
        const connMysql = await mysql.createConnection({
            host: conn.host,
            port: conn.port,
            user: conn.username,
            password: conn.password,
            database,
        });

        try {
            const [rows] = await connMysql.query('SHOW TABLES');
            await connMysql.end();
            return rows.map((row) => Object.values(row)[0]); // Возвращаем названия таблиц
        } catch (err) {
            console.error('Ошибка при получении таблиц MySQL:', err.message);
            throw new Error('Ошибка при подключении к базе данных MySQL: ' + err.message);
        }
    }

    throw new Error('Неподдерживаемый тип базы данных');
});

// Загрузка баз данных для PostgreSQL и MySQL
ipcMain.handle('load-databases', async (event, conn) => {
    if (conn.type === 'postgres') {
        const client = new Client({
            host: conn.host,
            port: conn.port,
            user: conn.username,
            password: conn.password,
        });

        try {
            await client.connect();
            const res = await client.query(`SELECT datname FROM pg_database WHERE datistemplate = false`);
            await client.end();
            return res.rows.map((row) => row.datname);
        } catch (err) {
            console.error('Ошибка подключения к PostgreSQL:', err.message);
            throw new Error('Ошибка подключения: ' + err.message);
        }
    } else if (conn.type === 'mysql') {
        const connMysql = await mysql.createConnection({
            host: conn.host,
            port: conn.port,
            user: conn.username,
            password: conn.password,
        });

        try {
            const [rows] = await connMysql.query('SHOW DATABASES');
            await connMysql.end();
            return rows.map((row) => row.Database);
        } catch (err) {
            console.error('Ошибка подключения к MySQL:', err.message);
            throw new Error('Ошибка подключения: ' + err.message);
        }
    }

    throw new Error('Неподдерживаемый тип базы данных');
});

// Сохранение подключения
ipcMain.handle('save-connection', (event, conn) => {
    const stmt = db.prepare(`
        INSERT INTO connections (name, type, host, port, username, password, default_database)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(conn.name, conn.type, conn.host, conn.port, conn.username, conn.password, conn.default_database);
    return { id: result.lastInsertRowid, ...conn };
});

// Загрузка всех сохраненных подключений
ipcMain.handle('load-connections', () => {
    return db.prepare(`SELECT * FROM connections`).all();
});

// Подключение и загрузка баз данных
ipcMain.handle('connect-and-list-databases', async (event, connection) => {
    try {
        if (connection.type === 'postgres' || connection.type === 'postgresql') {
            const client = new Client({
                host: connection.host,
                port: connection.port,
                user: connection.username,
                password: connection.password,
            });

            try {
                await client.connect();
            } catch (err) {
                console.error('Ошибка подключения:', err.message);
                throw new Error('Не удалось подключиться к базе данных PostgreSQL: ' + err.message);
            }
            const res = await client.query(`SELECT datname FROM pg_database WHERE datistemplate = false`);
            await client.end();
            return res.rows.map(row => row.datname);
        } else if (connection.type === 'mysql') {
            const conn = await mysql.createConnection({
                host: connection.host,
                port: connection.port,
                user: connection.username,
                password: connection.password,
                database: 'information_schema', // или другая база для работы с метаданными
            });
            const [rows] = await conn.query('SHOW DATABASES');
            await conn.end();
            return rows.map(row => row.Database);
        }

        return [];
    } catch (err) {
        console.error('Ошибка подключения к базе:', err);
        return { error: err.message };
    }
});

// Создание главного окна приложения
function createWindow () {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
});