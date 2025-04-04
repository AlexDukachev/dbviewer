import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.css';
import AddConnectionModal from './components/AddConnectionModal';

function App() {
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [connections, setConnections] = useState([]); // ← соединения из SQLite
    const [databases, setDatabases] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tables, setTables] = useState([]);
    const [selectedDatabase, setSelectedDatabase] = useState(null);
    const [schemas, setSchemas] = useState([]); // Состояние для схем
    const [selectedSchema, setSelectedSchema] = useState(null); // Состояние для выбранной схемы

    // Состояния для сворачивания/разворачивания баз данных, таблиц и схем
    const [expandedDatabases, setExpandedDatabases] = useState({});
    const [expandedTables, setExpandedTables] = useState({});
    const [expandedSchemas, setExpandedSchemas] = useState({});

    useEffect(() => {
        console.log('Loading connections...');
        window.electronAPI.loadConnections()
            .then((conns) => {
                console.log('Loaded connections:', conns);
                setConnections(conns);
            })
            .catch((error) => {
                console.error('Error loading connections:', error);
            });
    }, []);

    const handleConnect = async (conn) => {
        const databases = await window.electronAPI.connectAndListDatabases(conn);
        if (databases.error) {
            alert('Ошибка: ' + databases.error);
            return;
        }

        // обновляем в состоянии базы у соединения
        setConnections((prev) =>
            prev.map((c) =>
                c.id === conn.id ? { ...c, databases } : c
            )
        );
    };

    const handleAddConnection = () => setIsModalOpen(true);
    const handleConnectionSaved = (conn) => setConnections([...connections, conn]);

    // Функция для сворачивания/разворачивания базы данных
    const toggleDatabaseExpansion = (dbName) => {
        setExpandedDatabases((prev) => ({
            ...prev,
            [dbName]: !prev[dbName],
        }));
    };

    // Функция для сворачивания/разворачивания схем
    const toggleSchemaExpansion = (schemaName) => {
        setExpandedSchemas((prev) => ({
            ...prev,
            [schemaName]: !prev[schemaName],
        }));
    };

    // Функция для сворачивания/разворачивания таблиц
    const toggleTableExpansion = (schemaName) => {
        setExpandedTables((prev) => ({
            ...prev,
            [schemaName]: !prev[schemaName],
        }));
    };

    // Загрузка схем для выбранной базы данных
    const loadSchemas = async (dbName) => {
        if (selectedConnection.type === 'mysql' || selectedConnection.type === 'MySQL') {
            // Для MySQL схемы не загружаются, просто возвращаем
            setSchemas([]);
            return;
        }

        try {
            const schemas = await window.electronAPI.invoke('load-schemas', selectedConnection, dbName);
            console.log('Схемы:', schemas);
            setSchemas(schemas);
        } catch (e) {
            alert('Ошибка при загрузке схем: ' + e.message);
        }
    };

    // Загрузка таблиц для выбранной схемы
    const loadTables = async (schemaName) => {
        try {
            const tables = await window.electronAPI.invoke('load-tables', selectedConnection, selectedDatabase, schemaName);
            console.log('Таблицы в схеме:', tables);
            setTables(tables);
        } catch (e) {
            alert('Ошибка при загрузке таблиц: ' + e.message);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col dark">
            {/* Верхняя панель */}
            <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4 text-sm">
                <span className="text-white font-semibold">DB Client</span>
            </div>

            <div className="flex flex-1">
                {/* Сайдбар: соединения и базы */}
                <div className="w-64 bg-sidebar text-white p-4">
                    <div className="font-bold mb-2 flex justify-between items-center">
                        Соединения

                        <AddConnectionModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSave={handleConnectionSaved}
                        />
                    </div>
                    <ul className="text-sm space-y-1">
                        {connections.length === 0 ? (
                            <li className="text-gray-400 text-xs">Нет соединений</li>
                        ) : (
                            connections.map((conn) => (
                                <li
                                    key={`conn-${conn.id}`}
                                    onClick={async () => {
                                        try {
                                            const dbs = await window.electronAPI.invoke('load-databases', conn);
                                            console.log('Загруженные базы данных:', dbs);
                                            if (!dbs || !Array.isArray(dbs)) {
                                                alert('Не удалось загрузить базы данных. Ответ: ' + JSON.stringify(dbs));
                                                return;
                                            }
                                            setSelectedConnection(conn);
                                            setDatabases(dbs);
                                            setSchemas([]); // Очистим схемы при изменении соединения
                                        } catch (e) {
                                            alert(e.message || 'Ошибка при загрузке баз данных');
                                        }
                                    }}
                                    className={`hover:bg-gray-600 p-1 rounded cursor-pointer ${selectedConnection?.id === conn.id ? 'bg-gray-700' : ''}`}
                                >
                                    {conn.name}
                                </li>
                            ))
                        )}

                        {selectedConnection && databases.length === 0 && (
                            <li key="no-databases" className="text-xs text-gray-400">Нет доступных баз данных</li>
                        )}

                        {selectedConnection && databases.length > 0 && (
                            <>
                                {databases.map((db) => (
                                    <div key={`db-${db}`}>
                                        {/* Кликабельный элемент для сворачивания/разворачивания базы */}
                                        <li
                                            onClick={async () => {
                                                toggleDatabaseExpansion(db);
                                                setSelectedDatabase(db);
                                                loadSchemas(db); // Загружаем схемы при выборе базы
                                            }}
                                            className="hover:bg-gray-500 p-1 rounded cursor-pointer text-xs"
                                        >
                                            {db}
                                        </li>

                                        {/* Если база развернута, показываем схемы */}
                                        {expandedDatabases[db] && schemas.length > 0 && (
                                            <div>
                                                <ul className="pl-4 space-y-1">
                                                    {schemas.map((schema) => (
                                                        <li
                                                            key={`schema-${schema}`}
                                                            onClick={() => {
                                                                toggleSchemaExpansion(schema);
                                                                loadTables(schema); // Загружаем таблицы при выборе схемы
                                                            }}
                                                            className="hover:bg-gray-400 p-1 rounded cursor-pointer text-xs"
                                                        >
                                                            {schema}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </ul>
                </div>

                {/* Центр */}
                <div className="flex-1 bg-editor-bg text-editor-fg p-4 overflow-auto">
                    <p className="text-white text-sm mb-2">
                        👈 Выберите соединение или создайте новое
                    </p>

                    {selectedDatabase && schemas.length > 0 && (
                        <div className="mt-4">
                            <div className="font-bold text-sm mb-1">Схемы</div>
                            <ul className="space-y-1 text-xs">
                                {schemas.map((schema) => (
                                    <li
                                        key={schema}
                                        className="hover:bg-gray-500 p-1 rounded cursor-pointer"
                                    >
                                        {schema}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {selectedSchema && tables.length > 0 && (
                        <div className="mt-4">
                            <div className="font-bold text-sm mb-1">Таблицы</div>
                            <ul className="space-y-1 text-xs">
                                {tables.map((table) => (
                                    <li
                                        key={table}
                                        className="hover:bg-gray-500 p-1 rounded cursor-pointer"
                                    >
                                        {table}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);