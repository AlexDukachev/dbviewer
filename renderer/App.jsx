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
                                    key={conn.id}
                                    onClick={async () => {
                                        try {
                                            const dbs = await window.electron.invoke('load-databases', conn);
                                            setSelectedConnection(conn);
                                            setDatabases(dbs);
                                        } catch (e) {
                                            alert(e.message + `(#номер строки)` || 'Ошибка при загрузке баз данных');
                                        }
                                    }}
                                    className={`hover:bg-gray-600 p-1 rounded cursor-pointer ${selectedConnection?.id === conn.id ? 'bg-gray-700' : ''}`}
                                >
                                    {conn.name}
                                </li>
                            ))
                        )}
                        {selectedConnection && databases.length > 0 && (
                            <div className="mt-4">
                                <div className="font-bold text-sm mb-1">Базы данных</div>
                                <ul className="space-y-1 text-xs">
                                    {databases.map((db) => (
                                        <li
                                            key={db}
                                            onClick={async () => {
                                                try {
                                                    const tbls = await window.electron.invoke('load-tables', selectedConnection, db);
                                                    setSelectedDatabase(db);
                                                    setTables(tbls);
                                                    console.log('Tables for database', db, tbls); // Логируем таблицы
                                                } catch (e) {
                                                    alert(e.message || 'Ошибка при загрузке таблиц');
                                                }
                                            }}
                                            className="hover:bg-gray-500 p-1 rounded cursor-pointer"
                                        >
                                            {db}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </ul>
                </div>

                {/* Центр */}
                <div className="flex-1 bg-editor-bg text-editor-fg p-4 overflow-auto">
                    <p className="text-white text-sm mb-2">
                        👈 Выберите соединение или создайте новое
                    </p>

                    {selectedDatabase && tables.length > 0 && (
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
