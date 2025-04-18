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
ipcMain.handle('load-tables', async (event, conn, database, schemaName) => {
    console.log('Загрузка таблиц для:', conn.type, 'База:', database, 'Схема:', schemaName);

    if (conn.type.toLowerCase().includes('postgres')) {
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
                WHERE table_schema = $1
            `, [schemaName || 'public']);
            await client.end();
            return res.rows.map((row) => row.table_name);
        } catch (err) {
            throw new Error('Ошибка при подключении к базе данных PostgreSQL: ' + err.message);
        }

    } else if (conn.type.toLowerCase().includes('mysql')) {
        if (!database) {
            throw new Error('Для MySQL необходимо указать имя базы данных');
        }

        const mysqlConn = await mysql.createConnection({
            host: conn.host,
            port: conn.port,
            user: conn.username,
            password: conn.password,
            database,
        });

        try {
            const [rows] = await mysqlConn.query('SHOW TABLES');
            await mysqlConn.end();
            console.log(rows)
            return rows.map((row) => Object.values(row)[0]);
        } catch (err) {
            throw new Error('Ошибка при подключении к базе данных MySQL: ' + err.message);
        }
    }

    throw new Error('Неподдерживаемый тип базы данных');
});

// Загрузка схем для PostgreSQL
ipcMain.handle('load-schemas', async (event, conn, database) => {
    console.log('Загрузка схем для базы:', database);

    if (conn.type === 'postgres' || conn.type === 'postgresql' || conn.type === 'PostgreSQL') {
        const client = new Client({
            host: conn.host === 'localhost' ? '127.0.0.1' : conn.host,
            port: conn.port,
            user: conn.username,
            password: conn.password,
            database,
        });

        try {
            await client.connect();
            const res = await client.query(`
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
            `);
            await client.end();
            console.log('Схемы PostgreSQL:', res.rows); // Добавляем лог для проверок
            return res.rows.map((row) => row.schema_name);
        } catch (err) {
            console.error('Ошибка при получении схем PostgreSQL:', err.message);
            throw new Error('Ошибка при подключении к базе данных PostgreSQL: ' + err.message);
        }
    }

    throw new Error('Неподдерживаемый тип базы данных');
});

// Загрузка баз данных для PostgreSQL и MySQL
ipcMain.handle('load-databases', async (event, conn) => {
    console.log('Получено соединение:', conn);

    try {
        if (conn.type === 'postgres' || conn.type === 'postgresql' || conn.type === 'PostgreSQL') {
            const client = new Client({
                host: conn.host === 'localhost' ? '127.0.0.1' : conn.host,
                port: conn.port,
                user: conn.username,
                password: conn.password,
                database: conn.database || 'postgres' // <-- это исправление
            });

            try {
                await client.connect();
            } catch (err) {
                console.error('Ошибка при подключении к PostgreSQL:', err);
                throw new Error('Не удалось подключиться к базе данных PostgreSQL: ' + err.message);
            }

            const res = await client.query(`SELECT datname FROM pg_database WHERE datistemplate = false`);
            console.log('Базы PostgreSQL:', res.rows);
            await client.end();

            return res.rows.map(row => row.datname);
        } else if (conn.type === 'mysql' || conn.type === 'MySQL') {
            const connDb = await mysql.createConnection({
                host: conn.host === 'localhost' ? '127.0.0.1' : conn.host,
                port: conn.port,
                user: conn.username,
                password: conn.password,
            });

            const [rows] = await connDb.query('SHOW DATABASES');
            console.log('Базы MySQL:', rows);
            await connDb.end();

            return rows.map(row => row.Database || row.database);
        }

        return [];
    } catch (err) {
        console.error('Ошибка при получении баз данных:', err.message);
        console.error('Тип ошибки:', err.name);
        console.error('Стек вызовов:', err.stack);
        throw new Error('Ошибка при подключении или запросе баз данных: ' + err.message);
    }
});

// Сохранение подключения
ipcMain.handle('save-connection', (event, conn) => {
    const stmt = db.prepare(`
        INSERT INTO connections (name, type, host, port, username, password, default_database)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(conn.name, conn.type, conn.host === 'localhost' ? '127.0.0.1' : conn.host, conn.port, conn.username, conn.password, conn.default_database);
    return { id: result.lastInsertRowid, ...conn };
});

// Загрузка всех сохраненных подключений
ipcMain.handle('load-connections', () => {
    return db.prepare(`SELECT * FROM connections`).all();
});

ipcMain.handle('delete-connection', (event, id) => {
    db.prepare('DELETE FROM connections WHERE id = ?').run(id);
    return true;
});

ipcMain.handle('update-connection', (event, conn) => {
    db.prepare(`
        UPDATE connections
        SET name = ?, type = ?, host = ?, port = ?, username = ?, password = ?, default_database = ?
        WHERE id = ?
    `).run(conn.name, conn.type, conn.host, conn.port, conn.username, conn.password, conn.default_database, conn.id);
    return conn;
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

    // Открываем DevTools при запуске
    win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
});