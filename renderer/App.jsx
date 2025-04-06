import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.css';
import AddConnectionModal from './components/AddConnectionModal';
import Sidebar from "./components/Sidebar";

function App() {
    const [connections, setConnections] = useState([]); // ← соединения из SQLite
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedDatabase, setSelectedDatabase] = useState(null);
    const [schemas, setSchemas] = useState([]); // Состояние для схем
    const [selectedSchema, setSelectedSchema] = useState(null); // Состояние для выбранной схемы

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
                <Sidebar />

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