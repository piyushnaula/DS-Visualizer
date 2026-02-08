'use client';

import { TraceStep } from '@/types/trace';

interface TraceControllerProps {
    traceData: TraceStep[] | null;
    currentStep: number;
    onStepChange: (step: number) => void;
}

export default function TraceController({
    traceData,
    currentStep,
    onStepChange,
}: TraceControllerProps) {
    const totalSteps = traceData?.length ?? 0;
    const currentTraceStep = traceData?.[currentStep];

    const goToStart = () => onStepChange(0);
    const goToPrev = () => onStepChange(Math.max(0, currentStep - 1));
    const goToNext = () => onStepChange(Math.min(totalSteps - 1, currentStep + 1));
    const goToEnd = () => onStepChange(totalSteps - 1);

    if (!traceData || traceData.length === 0) {
        return (
            <div className="h-full flex flex-col">
                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm text-gray-400">🎮 Trace Controller</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className="text-4xl mb-4">▶️</div>
                        <p className="text-sm">Run code to start tracing</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-sm text-gray-400">🎮 Trace Controller</span>
            </div>

            {/* Navigation Controls */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <button
                        onClick={goToStart}
                        disabled={currentStep === 0}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
                        title="Go to start"
                    >
                        ⏮️ Start
                    </button>
                    <button
                        onClick={goToPrev}
                        disabled={currentStep === 0}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors font-semibold"
                        title="Previous step"
                    >
                        ◀ Prev
                    </button>
                    <button
                        onClick={goToNext}
                        disabled={currentStep === totalSteps - 1}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors font-semibold"
                        title="Next step"
                    >
                        Next ▶
                    </button>
                    <button
                        onClick={goToEnd}
                        disabled={currentStep === totalSteps - 1}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
                        title="Go to end"
                    >
                        End ⏭️
                    </button>
                </div>

                {/* Progress indicator */}
                <div className="text-center">
                    <span className="text-lg font-mono text-white">
                        Step {currentStep + 1} / {totalSteps}
                    </span>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Current Step Details */}
            <div className="flex-1 p-4 overflow-auto">
                {currentTraceStep && (
                    <div className="space-y-4">
                        {/* Step Info */}
                        <div className="bg-gray-800 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-400 mb-2">Current Step</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Line:</span>
                                    <span className="ml-2 text-yellow-400 font-mono">
                                        {currentTraceStep.line}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Event:</span>
                                    <span className={`ml-2 font-mono ${currentTraceStep.event === 'call' ? 'text-green-400' :
                                            currentTraceStep.event === 'return' ? 'text-purple-400' :
                                                'text-blue-400'
                                        }`}>
                                        {currentTraceStep.event}
                                    </span>
                                </div>
                                {currentTraceStep.function && (
                                    <div className="col-span-2">
                                        <span className="text-gray-500">Function:</span>
                                        <span className="ml-2 text-cyan-400 font-mono">
                                            {currentTraceStep.function}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Variables */}
                        <div className="bg-gray-800 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-400 mb-2">Variables</h3>
                            {Object.keys(currentTraceStep.variables).length > 0 ? (
                                <div className="space-y-1">
                                    {Object.entries(currentTraceStep.variables).map(([name, value]) => (
                                        <div key={name} className="flex items-start font-mono text-sm">
                                            <span className="text-cyan-400 min-w-[80px]">{name}</span>
                                            <span className="text-gray-500 mx-2">=</span>
                                            <span className="text-green-400">
                                                {JSON.stringify(value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-gray-500 text-sm italic">No variables in scope</span>
                            )}
                        </div>

                        {/* Return Value (if present) */}
                        {currentTraceStep.return_value !== undefined && (
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-400 mb-2">Return Value</h3>
                                <span className="text-purple-400 font-mono text-sm">
                                    {JSON.stringify(currentTraceStep.return_value)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
