export default function Sidebar({ connections, onAddClick, onSelectConnection }) {
    return (
        <div className="w-72 bg-gray-800 p-4 border-r border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Соединения</h2>
                <button
                    onClick={onAddClick}
                    className="text-sm bg-blue-600 px-2 py-1 rounded hover:bg-blue-500"
                >
                    +
                </button>
            </div>
            <ul className="space-y-2">
                {connections.length === 0 ? (
                    <li className="text-gray-400 text-sm">Нет соединений</li>
                ) : (
                    connections.map((conn) => (
                        <li
                            key={conn.id}
                            onClick={() => onSelectConnection(conn)}
                            className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                        >
                            {conn.name}
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}