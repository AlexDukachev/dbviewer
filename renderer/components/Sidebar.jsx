import React, { useState, useEffect } from 'react';
import AddConnectionModal from './AddConnectionModal';

export default function Sidebar() {
    const [databases, setDatabases] = useState({});
    const [schemas, setSchemas] = useState({});
    const [expandedDatabases, setExpandedDatabases] = useState({});
    const [expandedSchemas, setExpandedSchemas] = useState({});
    const [tablesByDatabase, setTablesByDatabase] = useState({});
    const [tablesBySchema, setTablesBySchema] = useState({});
    const [selectedDatabase, setSelectedDatabase] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState(null);
    const [connections, setConnections] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [connectionToEdit, setConnectionToEdit] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingConnection, setEditingConnection] = useState(null);

    const loadConnections = async () => {
        try {
            const conn = await window.electronAPI.invoke('load-connections');
            console.log(conn);
            setConnections(conn);
        } catch (e) {
            setError('Ошибка при загрузке соединений: ' + e.message);
        }
    };

    const loadDatabases = async (conn) => {
        try {
            if (!databases[conn.id]) { // Проверяем, загружены ли базы данных для этого подключения
                const dbs = await window.electronAPI.invoke('load-databases', conn);
                setDatabases((prev) => ({
                    ...prev,
                    [conn.id]: dbs,
                }));
                setError(null);
            }
        } catch (e) {
            setError('Ошибка при загрузке баз данных: ' + e.message);
        }
    };

    const loadSchemas = async (dbName) => {
        try {
            const schemas = await window.electronAPI.invoke('load-schemas', selectedConnection, dbName);
            setSchemas((prev) => ({
                ...prev,
                [dbName]: schemas,
            }));
            setError(null);
        } catch (e) {
            setError('Ошибка при загрузке схем: ' + e.message);
        }
    };

    const loadTables = async (schemaName = null, dbName = selectedDatabase) => {
        try {
            const tables = await window.electronAPI.invoke('load-tables', selectedConnection, dbName, schemaName);

            if (
                selectedConnection.type.toLowerCase().includes('postgres') &&
                schemaName
            ) {
                setTablesBySchema((prev) => ({
                    ...prev,
                    [dbName]: {
                        ...(prev[dbName] || {}),
                        [schemaName]: tables,
                    },
                }));
            } else {
                setTablesByDatabase((prev) => ({
                    ...prev,
                    [dbName]: tables,
                }));
            }
            setError(null);
        } catch (e) {
            setError('Ошибка при загрузке таблиц: ' + e.message);
        }
    };

    useEffect(() => {
        loadConnections();
    }, []);

    const handleConnectionSaved = async (newConnection) => {
        try {
            await window.electronAPI.invoke('save-connection', newConnection);
            setIsModalOpen(false);
            setIsEditModalOpen(false);
            setConnectionToEdit(null);
            await loadConnections();
        } catch (e) {
            setError('Ошибка при сохранении подключения: ' + e.message);
        }
    };

    const handleConnectionDelete = async (connId) => {
        try {
            await window.electronAPI.invoke('delete-connection', connId);
            await loadConnections();
        } catch (e) {
            setError('Ошибка при удалении подключения: ' + e.message);
        }
    };

    const toggleDatabaseExpansion = (dbName) => {
        setExpandedDatabases((prev) => ({
            ...prev,
            [dbName]: !prev[dbName],
        }));
    };

    const toggleSchemaExpansion = (schemaName) => {
        setExpandedSchemas((prev) => ({
            ...prev,
            [schemaName]: !prev[schemaName],
        }));
    };

    const handleConnectionClick = async (conn) => {
        setSelectedConnection(conn);
        setExpandedDatabases((prev) => ({
            ...prev,
            [conn.id]: !prev[conn.id],
        }));

        // Если базы данных ещё не загружены, загружаем их
        if (!databases[conn.id]) {
            await loadDatabases(conn);
            setSchemas({});
            setTablesByDatabase({});
            setTablesBySchema({});
        }
    };

    const handleEditConnection = (conn) => {
        setConnectionToEdit(conn);
        setIsEditModalOpen(true); // Открытие модалки редактирования
    };

    return (
        <div className="w-64 bg-sidebar text-white p-4">
            <div className="font-bold mb-2 flex justify-between items-center">
                <div>Соединения</div>
                <button
                    onClick={() => {
                        setEditingConnection(null); // для новой формы
                        setModalVisible(true);
                    }}
                    className="text-xs bg-blue-500 rounded px-2 py-1 hover:bg-blue-400"
                >
                    +
                </button>
            </div>

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

            <ul className="text-sm space-y-1">
                {connections.length === 0 ? (
                    <li className="text-gray-400 text-xs">Нет соединений</li>
                ) : (
                    connections.map((conn) => (
                        <li key={`conn-${conn.id}`} className="flex justify-between items-center">
                            <div
                                onClick={async () => {
                                    await handleConnectionClick(conn);
                                }}
                                className={`hover:bg-gray-600 p-1 rounded cursor-pointer ${
                                    selectedConnection?.id === conn.id ? 'bg-gray-700' : ''
                                }`}
                            >
                                {conn.name}
                            </div>

                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        setEditingConnection(conn);
                                        setModalVisible(true);
                                    }}
                                    className="text-xs bg-yellow-500 rounded px-2 py-1 hover:bg-yellow-400"
                                >
                                    ✎
                                </button>
                                <button
                                    onClick={() => handleConnectionDelete(conn.id)}
                                    className="text-red-400 hover:text-red-500"
                                >
                                    🗑️
                                </button>
                            </div>
                        </li>
                    ))
                )}
            </ul>

            {modalVisible && (
                <AddConnectionModal
                    isOpen={modalVisible}
                    onClose={() => {
                        setModalVisible(false);
                        setEditingConnection(null);
                    }}
                    onSave={handleConnectionSaved}
                    connection={editingConnection}
                />
            )}

            {selectedConnection && databases[selectedConnection.id]?.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {databases[selectedConnection.id].map((db) => (
                        <li key={`db-${db}`}>
                            <div
                                onClick={async () => {
                                    setSelectedDatabase(db);
                                    toggleDatabaseExpansion(db);

                                    if (
                                        selectedConnection.type.toLowerCase().includes('postgres')
                                    ) {
                                        loadSchemas(db);
                                    } else {
                                        loadTables(null, db);
                                    }
                                }}
                                className="hover:bg-gray-500 p-1 rounded cursor-pointer text-xs flex items-center"
                            >
                                <span
                                    className={`mr-2 transform transition-transform ${
                                        expandedDatabases[db] ? 'rotate-90' : ''
                                    }`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </span>
                                {db}
                            </div>

                            {expandedDatabases[db] && (
                                <ul className="pl-4 space-y-1">
                                    {selectedConnection.type
                                        .toLowerCase()
                                        .includes('postgres') &&
                                    schemas[db]?.length > 0 ? (
                                        schemas[db].map((schema) => (
                                            <li key={`schema-${schema}`}>
                                                <div
                                                    onClick={() => {
                                                        toggleSchemaExpansion(schema);
                                                        loadTables(schema, db);
                                                    }}
                                                    className="hover:bg-gray-400 p-1 rounded cursor-pointer text-xs flex items-center"
                                                >
                                                    <span
                                                        className={`mr-2 transform transition-transform ${
                                                            expandedSchemas[schema]
                                                                ? 'rotate-90'
                                                                : ''
                                                        }`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth="2"
                                                                d="M19 9l-7 7-7-7"
                                                            />
                                                        </svg>
                                                    </span>
                                                    {schema}
                                                </div>

                                                {expandedSchemas[schema] && (
                                                    <ul className="pl-4">
                                                        {tablesBySchema[db]?.[schema]?.length >
                                                        0 ? (
                                                            tablesBySchema[db][
                                                                schema
                                                                ].map((table) => (
                                                                <li
                                                                    key={`table-${schema}-${table}`}
                                                                    className="text-sm text-gray-300 p-1 rounded cursor-pointer"
                                                                >
                                                                    {table}
                                                                </li>
                                                            ))
                                                        ) : (
                                                            <li className="text-xs text-gray-400">
                                                                Нет таблиц
                                                            </li>
                                                        )}
                                                    </ul>
                                                )}
                                            </li>
                                        ))
                                    ) : (
                                        <ul className="pl-4">
                                            {tablesByDatabase[db]?.length > 0 ? (
                                                tablesByDatabase[db].map((table) => (
                                                    <li
                                                        key={`table-${table}`}
                                                        className="text-sm text-gray-300 p-1 rounded cursor-pointer"
                                                    >
                                                        {table}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-xs text-gray-400">
                                                    Нет таблиц
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {isEditModalOpen && connectionToEdit && (
                <AddConnectionModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleConnectionSaved}
                    connection={connectionToEdit}
                />
            )}
        </div>
    );
}