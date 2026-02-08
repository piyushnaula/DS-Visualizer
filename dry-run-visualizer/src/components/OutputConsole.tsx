'use client';

interface OutputConsoleProps {
    output: string;
    error: string | null;
    isRunning: boolean;
}

export default function OutputConsole({ output, error, isRunning }: OutputConsoleProps) {
    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-400">📟 Output Console</span>
                {isRunning && (
                    <span className="text-xs text-yellow-400 animate-pulse">Running...</span>
                )}
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-sm">
                {error ? (
                    <div className="text-red-400 whitespace-pre-wrap">
                        <span className="text-red-500 font-semibold">Error: </span>
                        {error}
                    </div>
                ) : output ? (
                    <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
                ) : (
                    <span className="text-gray-500 italic">
                        Output will appear here after running code...
                    </span>
                )}
            </div>
        </div>
    );
}
