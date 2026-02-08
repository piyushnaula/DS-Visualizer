'use client';

import { useMemo, useEffect, useState } from 'react';
import { TraceStep } from '@/types/trace';

const isRef = (val: any) => typeof val === 'object' && val !== null && val.type !== undefined && val.id !== undefined;

interface VariableTableProps {
    traceData: TraceStep[] | null;
    currentStep: number;
    visualizationModes: Record<string, 'linear' | 'tree' | 'grid'>;
    setVisualizationModes: React.Dispatch<React.SetStateAction<Record<string, 'linear' | 'tree' | 'grid'>>>;
}

interface VariableChange {
    name: string;
    value: unknown;
    previousValue: unknown | undefined;
    hasChanged: boolean;
    isNew: boolean;
}

export default function VariableTable({ traceData, currentStep, visualizationModes, setVisualizationModes }: VariableTableProps) {
    const [flashingVars, setFlashingVars] = useState<Set<string>>(new Set());
    const traceStep = traceData?.[currentStep];

    // Get current and previous step variables
    const currentVars = traceData?.[currentStep]?.variables ?? {};
    const previousVars = currentStep > 0 ? traceData?.[currentStep - 1]?.variables ?? {} : {};

    // Calculate variable changes
    const variableChanges = useMemo((): VariableChange[] => {
        const changes: VariableChange[] = [];

        // Get all variable names from current step
        for (const [name, value] of Object.entries(currentVars)) {
            const previousValue = previousVars[name];
            const isNew = !(name in previousVars);
            const hasChanged = !isNew && JSON.stringify(value) !== JSON.stringify(previousValue);

            changes.push({
                name,
                value,
                previousValue,
                hasChanged,
                isNew,
            });
        }

        // Sort: new variables first, then changed, then unchanged
        return changes.sort((a, b) => {
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            if (a.hasChanged && !b.hasChanged) return -1;
            if (!a.hasChanged && b.hasChanged) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [currentVars, previousVars]);

    // Trigger flash effect when variables change
    useEffect(() => {
        const changedVars = variableChanges
            .filter(v => v.hasChanged || v.isNew)
            .map(v => v.name);

        if (changedVars.length > 0) {
            setFlashingVars(new Set(changedVars));

            // Remove flash after animation
            const timer = setTimeout(() => {
                setFlashingVars(new Set());
            }, 600);

            return () => clearTimeout(timer);
        }
    }, [currentStep, variableChanges]);

    // Format value for display (Modified to handle Lists with Toggle)
    const renderVariableValue = (value: unknown): React.ReactNode => {
        if (value === null) return 'None';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;

        // Handle Heap References
        if (typeof value === 'object' && value !== null && (value as any).type === 'ref') {
            return <span className="text-blue-300">@{(value as any).id}</span>;
        }

        // Handle Heap Objects (When rendered directly or passed down)
        // Note: VariableTable receives 'variables' which are refs or primitives. 
        // We need to look up the heap object if we want to show list details.
        // BUT variables in trace are: { name: value }. 
        // If value is a Ref, we need the Heap to know if it's a list.
        // Wait, VariableTable only gets `variables`, not `heap`.
        // We need to access `traceData[currentStep].heap` to identify lists.

        return String(value);
    };

    // Helper to check if a variable is a list/tuple reference
    const getHeapObject = (val: unknown) => {
        if (typeof val === 'object' && val !== null && (val as any).type === 'ref') {
            const id = (val as any).id;
            return traceData?.[currentStep]?.heap?.[id];
        }
        return null;
    };

    // ... existing logic ...

    if (!traceData || traceData.length === 0) {
        return (
            <div className="h-full flex flex-col bg-gray-900">
                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm text-gray-400">📋 Variable Table</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <span className="text-gray-500 text-sm italic">
                        Run code to see variables...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-400">📋 Variable Table</span>
                <span className="text-xs text-gray-500">
                    {variableChanges.length} variable{variableChanges.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="flex-1 overflow-auto">
                {variableChanges.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-800 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-gray-400 font-medium border-b border-gray-700">
                                    Variable
                                </th>
                                <th className="px-4 py-2 text-left text-gray-400 font-medium border-b border-gray-700">
                                    Value
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {variableChanges.map(({ name, value, hasChanged, isNew }) => {
                                const isFlashing = flashingVars.has(name);

                                return (
                                    <tr
                                        key={name}
                                        className={`
                      border-b border-gray-800 transition-colors duration-300
                      ${isFlashing ? 'animate-flash' : ''}
                      ${isNew && isFlashing ? 'bg-green-900/30' : ''}
                      ${hasChanged && isFlashing ? 'bg-yellow-900/30' : ''}
                    `}
                                    >
                                        <td className="px-4 py-2 font-mono">
                                            <span className="text-cyan-400">{name}</span>
                                            {isNew && isFlashing && (
                                                <span className="ml-2 text-xs text-green-400">NEW</span>
                                            )}
                                            {hasChanged && isFlashing && (
                                                <span className="ml-2 text-xs text-yellow-400">CHANGED</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 font-mono">
                                            {(() => {
                                                const heapObj = getHeapObject(value);
                                                if (heapObj && (heapObj.type === 'list' || heapObj.type === 'tuple')) {
                                                    const mode = visualizationModes[String(heapObj.id)] || 'linear';
                                                    const len = (heapObj.value as any[]).length;

                                                    // Check for Grid Candidate (List of Lists)
                                                    let isGridCandidate = false;
                                                    if (heapObj.type === 'list' && len > 0) {
                                                        const first = (heapObj.value as any[])[0];
                                                        if (isRef(first)) {
                                                            const child = traceStep?.heap[first.id];
                                                            if (child && child.type === 'list') {
                                                                isGridCandidate = true;
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <div className="flex items-center gap-2 group">
                                                            <span className={`${isFlashing && (isNew || hasChanged) ? 'text-white font-semibold' : 'text-blue-300'}`}>
                                                                {heapObj.type === 'list' ? `[${len}]` : `(${len})`}
                                                            </span>
                                                            <span className="text-gray-500 text-xs">@{heapObj.id}</span>

                                                            {/* View Toggles */}
                                                            {heapObj.type === 'list' && (
                                                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {/* Tree Toggle */}
                                                                    <button
                                                                        onClick={() => setVisualizationModes(prev => ({
                                                                            ...prev,
                                                                            [String(heapObj.id)]: mode === 'tree' ? 'linear' : 'tree'
                                                                        }))}
                                                                        className={`
                                                                            px-1.5 py-0.5 text-[10px] rounded-l border-y border-l transition-colors
                                                                            ${mode === 'tree'
                                                                                ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300'
                                                                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}
                                                                        `}
                                                                        title="Tree View"
                                                                    >
                                                                        🌲
                                                                    </button>

                                                                    {/* Grid Toggle (if detected) */}
                                                                    {isGridCandidate && (
                                                                        <button
                                                                            onClick={() => setVisualizationModes(prev => ({
                                                                                ...prev,
                                                                                [String(heapObj.id)]: mode === 'grid' ? 'linear' : 'grid'
                                                                            }))}
                                                                            className={`
                                                                                px-1.5 py-0.5 text-[10px] border-y border-l transition-colors
                                                                                ${mode === 'grid'
                                                                                    ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300'
                                                                                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}
                                                                            `}
                                                                            title="Grid View"
                                                                        >
                                                                            ▦
                                                                        </button>
                                                                    )}

                                                                    {/* Linear Toggle (Reset) */}
                                                                    <button
                                                                        onClick={() => setVisualizationModes(prev => ({
                                                                            ...prev,
                                                                            [String(heapObj.id)]: 'linear'
                                                                        }))}
                                                                        className={`
                                                                            px-1.5 py-0.5 text-[10px] rounded-r border transition-colors
                                                                            ${mode === 'linear'
                                                                                ? 'bg-blue-900/50 border-blue-500 text-blue-300'
                                                                                : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}
                                                                        `}
                                                                        title="Linear View"
                                                                    >
                                                                        📏
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <span className={`${isFlashing && (isNew || hasChanged) ? 'text-white font-semibold' : 'text-green-400'}`}>
                                                        {renderVariableValue(value)}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-gray-500 text-sm italic">
                            No variables in scope at step {currentStep + 1}
                        </span>
                    </div>
                )}
            </div>

            {/* CSS for flash animation */}
            <style jsx>{`
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-flash {
          animation: flash 0.3s ease-in-out 2;
        }
      `}</style>
        </div>
    );
}
