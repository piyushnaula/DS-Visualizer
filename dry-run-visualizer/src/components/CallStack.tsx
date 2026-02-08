'use client';

import { useEffect, useState, useMemo } from 'react';
import { TraceStep, StackFrame } from '@/types/trace';

interface CallStackProps {
    traceData: TraceStep[] | null;
    currentStep: number;
}

const EMPTY_STACK: StackFrame[] = [];

export default function CallStack({ traceData, currentStep }: CallStackProps) {
    const [animatingFrame, setAnimatingFrame] = useState<{ name: string, type: 'push' | 'pop' } | null>(null);

    const currentTraceStep = traceData?.[currentStep];
    const previousTraceStep = currentStep > 0 ? traceData?.[currentStep - 1] : null;

    const callStack = currentTraceStep?.callStack ?? EMPTY_STACK;
    const previousStack = previousTraceStep?.callStack ?? EMPTY_STACK;
    const stackDepth = currentTraceStep?.stackDepth ?? 0;
    const event = currentTraceStep?.event;
    const returnValue = currentTraceStep?.return_value;

    // Detect push/pop for animation
    useEffect(() => {
        if (!currentTraceStep) return;

        const currentLen = callStack.length;
        const prevLen = previousStack.length;

        if (currentLen > prevLen && event === 'call') {
            // New frame pushed (call)
            const newFrame = callStack[callStack.length - 1];
            setAnimatingFrame({ name: newFrame.name, type: 'push' });
        } else if (currentLen < prevLen || event === 'return') {
            // Frame popped (return)
            if (previousStack.length > 0) {
                const poppedFrame = previousStack[previousStack.length - 1];
                setAnimatingFrame({ name: poppedFrame.name, type: 'pop' });
            }
        }

        // Clear animation after delay
        const timer = setTimeout(() => setAnimatingFrame(null), 500);
        return () => clearTimeout(timer);
    }, [currentStep, callStack, previousStack, event, currentTraceStep]);

    // Format arguments for display
    const formatArgs = (args: Record<string, unknown>): string => {
        const entries = Object.entries(args);
        if (entries.length === 0) return '';
        return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
    };

    // Format return value
    const formatReturnValue = (value: unknown): string => {
        if (value === null) return 'None';
        if (value === undefined) return '';
        if (typeof value === 'string') return `"${value}"`;
        return JSON.stringify(value);
    };

    if (!traceData || traceData.length === 0) {
        return (
            <div className="h-full flex flex-col bg-gray-900">
                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm text-gray-400">📚 Call Stack</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <span className="text-gray-500 text-sm italic">
                        Run code to see call stack...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">📚 Call Stack</span>
                    {event === 'call' && (
                        <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded animate-pulse">
                            PUSH ↓
                        </span>
                    )}
                    {event === 'return' && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                            POP ↑
                        </span>
                    )}
                </div>
                <span className="text-xs text-gray-500">
                    Depth: {stackDepth}
                </span>
            </div>

            {/* Return value display */}
            {event === 'return' && returnValue !== undefined && (
                <div className="px-4 py-2 bg-purple-900/30 border-b border-purple-700 flex items-center gap-2">
                    <span className="text-xs text-purple-400">↩ Return:</span>
                    <span className="text-sm font-mono text-purple-300 font-semibold">
                        {formatReturnValue(returnValue)}
                    </span>
                </div>
            )}

            <div className="flex-1 p-3 overflow-auto flex flex-col-reverse gap-2">
                {callStack.length > 0 ? (
                    callStack.map((frame: StackFrame, index: number) => {
                        const isTop = index === callStack.length - 1;
                        const isMain = frame.name === '<main>';
                        const isAnimatingPush = animatingFrame?.name === frame.name && animatingFrame?.type === 'push';
                        const isAnimatingPop = animatingFrame?.name === frame.name && animatingFrame?.type === 'pop';

                        return (
                            <div
                                key={`${frame.name}-${index}`}
                                className={`
                  relative px-4 py-3 rounded-lg border-2 transition-all duration-300
                  ${isTop
                                        ? 'bg-blue-900/40 border-blue-500 shadow-lg shadow-blue-500/20'
                                        : 'bg-gray-800/60 border-gray-600'
                                    }
                  ${isAnimatingPush ? 'animate-push-frame ring-2 ring-green-400' : ''}
                  ${isAnimatingPop ? 'animate-pop-frame ring-2 ring-red-400' : ''}
                `}
                            >
                                {/* Stack level indicator */}
                                <div className={`
                  absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full
                  ${isTop ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}
                  ${isAnimatingPush ? 'bg-green-400' : ''}
                  ${isAnimatingPop ? 'bg-red-400' : ''}
                `} />

                                {/* Frame content */}
                                <div className="ml-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`
                      font-mono font-semibold
                      ${isTop ? 'text-blue-300' : 'text-gray-300'}
                      ${isMain ? 'italic' : ''}
                    `}>
                                            {isMain ? '(module)' : frame.name}
                                        </span>
                                        {isTop && (
                                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                                ACTIVE
                                            </span>
                                        )}
                                        {isAnimatingPush && (
                                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded animate-pulse">
                                                CALLED
                                            </span>
                                        )}
                                    </div>

                                    {/* Function arguments (passed values) */}
                                    {!isMain && Object.keys(frame.args).length > 0 && (
                                        <div className="mt-1 flex items-center gap-1">
                                            <span className="text-xs text-gray-500">Args:</span>
                                            <span className="text-xs font-mono text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
                                                {formatArgs(frame.args)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Line number */}
                                    <div className="mt-1 text-xs text-gray-500">
                                        Line {frame.line}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-gray-500 text-sm italic">
                            No active call stack
                        </span>
                    </div>
                )}
            </div>

            {/* Stack visualization legend */}
            <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-500 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    Active
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Push (call)
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    Pop (return)
                </span>
            </div>

            {/* CSS for animations */}
            <style jsx>{`
        @keyframes pushFrame {
          0% { transform: translateY(-20px); opacity: 0; }
          50% { transform: translateY(5px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes popFrame {
          0% { opacity: 1; background-color: rgba(239, 68, 68, 0.3); }
          100% { opacity: 0.7; background-color: transparent; }
        }
        .animate-push-frame {
          animation: pushFrame 0.4s ease-out;
        }
        .animate-pop-frame {
          animation: popFrame 0.4s ease-out;
        }
      `}</style>
        </div>
    );
}
