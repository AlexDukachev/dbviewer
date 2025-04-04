import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

const MonacoEditor = ({ value, onChange, className }) => {
    const editorRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        editorRef.current = monaco.editor.create(containerRef.current, {
            value: value,
            language: 'sql',
            theme: 'vs-dark',
            automaticLayout: true,
        });

        const editor = editorRef.current;

        editor.onDidChangeModelContent(() => {
            const newValue = editor.getValue();
            onChange(newValue);
        });

        return () => editor.dispose();
    }, []);

    // Обновляем value только если оно реально поменялось извне
    useEffect(() => {
        const editor = editorRef.current;
        if (editor && value !== editor.getValue()) {
            editor.setValue(value);
        }
    }, [value]);

    return <div ref={containerRef} className={className || 'w-full h-64'} />;
};

export default MonacoEditor;