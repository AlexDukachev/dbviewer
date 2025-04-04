import React, { useState } from 'react';

const Tabs = ({ tabs, onTabChange, onCloseTab }) => {
    return (
        <div className="flex space-x-2 border-b border-gray-700">
            {tabs.map((tab, index) => (
                <div
                    key={index}
                    className="flex items-center cursor-pointer p-2 text-sm bg-gray-800 text-white rounded-t-md"
                    onClick={() => onTabChange(index)}
                >
                    <span>{tab.title}</span>
                    <button
                        className="ml-2 text-red-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseTab(index);
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Tabs;