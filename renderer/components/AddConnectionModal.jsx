import React, { useState } from 'react';

export default function AddConnectionModal({ onClose, onSave, editingConnection = null }) {
    const [form, setForm] = useState(
        editingConnection || {
            name: 'localhost',
            type: 'mysql',
            host: '127.0.0.1',
            port: 3306,
            username: 'db_user',
            password: 'password',
            default_database: '',
        }
    );
    const [errors, setErrors] = useState({});  // Стейт для хранения ошибок

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        let newErrors = {};
        // Проверка обязательных полей
        if (!form.host) newErrors.host = "Поле обязательно для заполнения";
        if (!form.port) newErrors.port = "Поле обязательно для заполнения";
        if (!form.name) newErrors.name = "Поле обязательно для заполнения";
        if (!form.username) newErrors.username = "Поле обязательно для заполнения";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);  // Отобразить ошибки
            return;
        }

        onSave(form);
        setForm({
            name: 'localhost',
            type: 'mysql',
            host: '127.0.0.1',
            port: 3306,
            username: 'db_user',
            password: 'password',
            default_database: '',
        });  // Очистка формы
        setErrors({});  // Очистка ошибок
        if (onClose) onClose();  // Закрыть модалку
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl w-96 shadow-lg">
                <h2 className="text-xl mb-4 font-semibold">Новое соединение</h2>

                <div className="space-y-3">
                    {[
                        ['Название', 'name'],
                        ['Тип БД', 'type', 'select'],
                        ['Хост', 'host'],
                        ['Порт', 'port'],
                        ['Пользователь', 'username'],
                        ['Пароль', 'password'],
                        ['База по умолчанию', 'default_database'],
                    ].map(([label, name, type]) => (
                        <div key={name}>
                            <label className="block text-sm mb-1">{label}</label>
                            {type === 'select' ? (
                                <select
                                    name={name}
                                    value={form[name]}  // Это гарантирует, что состояние будет обновляться
                                    onChange={handleChange}
                                    className={`w-full p-2 rounded bg-gray-700 text-white ${errors[name] ? 'border-2 border-red-500' : ''}`}
                                >
                                    <option value="postgre">PostgreSQL</option>
                                    <option value="mysql">MySQL</option>
                                </select>
                            ) : (
                                <input
                                    type={name === 'password' ? 'password' : 'text'}
                                    name={name}
                                    value={form[name]}  // Это гарантирует, что состояние будет обновляться
                                    onChange={handleChange}
                                    className={`w-full p-2 rounded bg-gray-700 text-white ${errors[name] ? 'border-2 border-red-500' : ''}`}
                                />
                            )}
                            {errors[name] && <small className="text-red-500 text-xs">{errors[name]}</small>}  {/* Отображение ошибки */}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end space-x-2 mt-5">
                    <button onClick={() => { if (onClose) onClose(); }} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">Отмена</button>
                    <button onClick={() => { handleSubmit(); if (onClose) onClose(); }} className="px-4 py-2 bg-green-600 rounded hover:bg-green-500">Сохранить</button>
                </div>
            </div>
        </div>
    );
}