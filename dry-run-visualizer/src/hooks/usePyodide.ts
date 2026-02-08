import { useState, useEffect, useCallback, useRef } from 'react';
import { TraceData, ExecutionResult } from '@/types/trace';

interface UsePyodideReturn {
    isLoading: boolean;
    runCode: (code: string, inputs?: string[]) => Promise<ExecutionResult>;
    terminate: () => void;
}

export function usePyodide(): UsePyodideReturn {
    const [isLoading, setIsLoading] = useState(true);
    const workerRef = useRef<Worker | null>(null);

    // Initialize Worker
    useEffect(() => {
        const worker = new Worker('/pyodide.worker.js');
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const { type } = e.data;
            if (type === 'READY') {
                setIsLoading(false);
            }
        };

        worker.postMessage({ type: 'INIT' });

        return () => {
            worker.terminate();
        };
    }, []);

    const terminate = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
        }
        // Restart worker
        setIsLoading(true);
        const worker = new Worker('/pyodide.worker.js');
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const { type } = e.data;
            if (type === 'READY') {
                setIsLoading(false);
            }
        };
        worker.postMessage({ type: 'INIT' });
    }, []);

    const runCode = useCallback(
        async (code: string, inputs: string[] = []): Promise<ExecutionResult> => {
            return new Promise((resolve) => {
                if (!workerRef.current) {
                    resolve({ output: '', error: 'Worker not initialized', traceData: null });
                    return;
                }

                const worker = workerRef.current;

                // One-time listener for this specific run
                const handleMessage = (e: MessageEvent) => {
                    const { type, result, message } = e.data;

                    if (type === 'SUCCESS') {
                        worker.removeEventListener('message', handleMessage);
                        try {
                            // Parse JSON result from tracer
                            const parsed = JSON.parse(result);
                            resolve({
                                output: parsed.trace && parsed.trace.length > 0 ? parsed.trace[parsed.trace.length - 1].stdout : '',
                                error: parsed.error,
                                traceData: parsed.trace
                            });
                        } catch (err) {
                            resolve({
                                output: '',
                                error: 'Failed to parse worker response',
                                traceData: null
                            });
                        }
                    } else if (type === 'ERROR') {
                        worker.removeEventListener('message', handleMessage);
                        resolve({
                            output: '',
                            error: message,
                            traceData: null
                        });
                    }
                };

                worker.addEventListener('message', handleMessage);
                worker.postMessage({ type: 'RUN', code, inputs });
            });
        },
        []
    );

    return { isLoading, runCode, terminate };
}
