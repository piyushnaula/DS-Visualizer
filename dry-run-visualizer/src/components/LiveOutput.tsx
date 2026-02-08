'use client';

import { useMemo } from 'react';
import { TraceStep } from '@/types/trace';

interface LiveOutputProps {
    traceData: TraceStep[] | null;
    currentStep: number;
}

export default function LiveOutput({ traceData, currentStep }: LiveOutputProps) {
    // Calculate cumulative output up to current step
    const cumulativeOutput = useMemo(() => {
        if (!traceData || traceData.length === 0) return '';

        let output = '';
        for (let i = 0; i <= currentStep && i < traceData.length; i++) {
            if (traceData[i].stdout) {
                output += traceData[i].stdout;
            }
        }
        return output;
    }, [traceData, currentStep]);

    // Get just the new output from current step
    const currentStepOutput = traceData?.[currentStep]?.stdout || '';

    if (!traceData || traceData.length === 0) {
        return (
            <div className="h-full flex flex-col bg-gray-900">
                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm text-gray-400">📺 Live Output (Dry Run)</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <span className="text-gray-500 text-sm italic">
                        Run code to see live output...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-400">📺 Live Output (Dry Run)</span>
                {currentStepOutput && (
                    <span className="text-xs text-green-400 animate-pulse">● New output</span>
                )}
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-sm">
                {cumulativeOutput ? (
                    <pre className="text-green-400 whitespace-pre-wrap">
                        {cumulativeOutput.split('\n').map((line, index, arr) => {
                            // Highlight the most recent output line
                            const isCurrentOutput = currentStepOutput &&
                                cumulativeOutput.endsWith(currentStepOutput) &&
                                index >= arr.length - currentStepOutput.split('\n').length;

                            return (
                                <span
                                    key={index}
                                    className={isCurrentOutput ? 'bg-green-900/50 text-green-300' : ''}
                                >
                                    {line}
                                    {index < arr.length - 1 && '\n'}
                                </span>
                            );
                        })}
                    </pre>
                ) : (
                    <span className="text-gray-500 italic">
                        No output yet at step {currentStep + 1}...
                    </span>
                )}
            </div>
        </div>
    );
}
