'use client';

import { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
    highlightLine?: number | null;
}

export default function CodeEditor({ code, onChange, highlightLine }: CodeEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    // Update line highlighting when highlightLine changes
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        // Clear previous decorations
        if (decorationsRef.current) {
            decorationsRef.current.clear();
        }

        // Add new decoration if we have a line to highlight
        if (highlightLine && highlightLine > 0) {
            decorationsRef.current = editor.createDecorationsCollection([
                {
                    range: {
                        startLineNumber: highlightLine,
                        startColumn: 1,
                        endLineNumber: highlightLine,
                        endColumn: 1,
                    },
                    options: {
                        isWholeLine: true,
                        className: 'highlighted-line',
                        glyphMarginClassName: 'highlighted-glyph',
                    },
                },
            ]);

            // Scroll to the highlighted line
            editor.revealLineInCenter(highlightLine);
        }
    }, [highlightLine]);

    return (
        <div className="h-full w-full">
            <style jsx global>{`
        .highlighted-line {
          background-color: rgba(255, 255, 0, 0.2) !important;
          border-left: 3px solid #fbbf24 !important;
        }
        .highlighted-glyph {
          background-color: #fbbf24;
          width: 5px !important;
          margin-left: 3px;
        }
      `}</style>
            <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={onChange}
                onMount={handleEditorMount}
                options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    padding: { top: 16, bottom: 16 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    tabSize: 4,
                    glyphMargin: true,
                }}
            />
        </div>
    );
}
