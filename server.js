// server.js

const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 5005;

// Подключение к базе данных
const dbConnection = mysql.createConnection({
    host: '192.168.8.55',
    port: 6000,
    user: 'root',
    password: '1Ct4YMwjIEPxOed',
    database: 'job_docs',
});

// Парсинг тела запроса как JSON
app.use(express.json());

// Эндпоинт для выполнения SQL-запросов
app.post('/execute-query', async (req, res) => {
    const { query } = req.body;

    dbConnection.execute(query, (error, results) => {
        if (error) {
            console.error('Ошибка выполнения запроса:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, data: results });
    })
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});