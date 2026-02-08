'use client';

import { useState, useEffect } from 'react';
import CodeEditor from '@/components/CodeEditor';
import OutputConsole from '@/components/OutputConsole';
import TraceController from '@/components/TraceController';
import LiveOutput from '@/components/LiveOutput';
import VariableTable from '@/components/VariableTable';
import CallStack from '@/components/CallStack';
import InputBox from '@/components/InputBox';
import DataStructureVisualizer from '@/components/DataStructureVisualizer';
import { usePyodide } from '@/hooks/usePyodide';
import { TraceData } from '@/types/trace';
import { compressCode, decompressCode } from '@/utils/urlManager';
import ErrorBoundary from '@/components/ErrorBoundary';
const DEFAULT_CODE = `# Dry Run Visualizer - BST & Optimization
# 1. Run -> See the Tree Layout (Top-Down)
# 2. Toggle "Show NULLs" to see leaf connections
# 3. This tree is spaced out nicely!

class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

root = Node(10)
root.left = Node(5)
root.right = Node(15)
root.left.left = Node(2)
root.left.right = Node(7)
root.right.right = Node(20)

# 4. Array Visualization Demo:
# Click "Tree View" on 'arr' in the Variable Table!
# 6. Heatmap Visualization Demo:
# Click "Grid View" on 'dp' to see the heatmap and animations!
rows, cols = 5, 5
dp = [[0]*cols for _ in range(rows)]

# Fill Diagonally to show animations
for i in range(rows):
    for j in range(cols):
        dp[i][j] = (i + 1) * (j + 1)
`;

export default function Home() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [inputs, setInputs] = useState<string>('10\napple\nbanana');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const { isLoading, runCode, terminate } = usePyodide();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // Map Heap ID -> 'linear' | 'tree' | 'grid'
  const [visualizationModes, setVisualizationModes] = useState<Record<string, 'linear' | 'tree' | 'grid'>>({});

  // Load code from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove '#'
    if (hash) {
      const decompressed = decompressCode(hash);
      if (decompressed) {
        setCode(decompressed);
      }
    }
  }, []);

  const handleShare = async () => {
    const compressed = compressCode(code);
    window.history.replaceState(null, '', `#${compressed}`);
    await navigator.clipboard.writeText(window.location.href);

    window.history.replaceState(null, '', `#${compressed}`);
    await navigator.clipboard.writeText(window.location.href);

    setToast({ message: 'Link copied to clipboard! 📋', type: 'success' });
    setTimeout(() => setToast(null), 2000);
  };

  const handleWarning = (message: string) => {
    setToast({ message, type: 'warning' });
    setTimeout(() => setToast(null), 3000);
  };


  // Get the current line to highlight
  const highlightLine = traceData?.[currentStep]?.line ?? null;

  const handleCodeChange = (value: string | undefined) => {
    setCode(value || '');
  };

  const handleStop = () => {
    terminate();
    setIsRunning(false);
    setError('Execution stopped forcibly.');
    setOutput('');
  };

  const handleReset = () => {
    setTraceData(null);
    setOutput('');
    setError(null);
    setCurrentStep(0);
    setIsRunning(false);
    terminate(); // Ensure worker is clean
  };

  const handleRunCode = async () => {
    if (isLoading) return;

    setIsRunning(true);
    setError(null);
    setOutput('');
    setTraceData(null);
    setCurrentStep(0);

    try {
      const inputList = inputs.trim() ? inputs.trim().split('\n') : [];
      const result = await runCode(code, inputList);
      setOutput(result.output);
      setError(result.error);
      setTraceData(result.traceData);

      // Reset to first step when new trace data arrives
      if (result.traceData && result.traceData.length > 0) {
        setCurrentStep(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!traceData || traceData.length === 0) return;

      if (e.key === 'ArrowRight' || e.key === 'n') {
        setCurrentStep(prev => Math.min(traceData.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        setCurrentStep(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Home') {
        setCurrentStep(0);
      } else if (e.key === 'End') {
        setCurrentStep(traceData.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [traceData]);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700 relative">
        {/* Toast Notification */}
        {toast && (
          <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg z-50 animate-bounce text-white ${toast.type === 'warning' ? 'bg-yellow-600' : 'bg-green-600'
            }`}>
            {toast.message}
          </div>
        )}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">
            🔍 Dry Run Visualizer
          </h1>
          {isLoading && (
            <span className="text-sm text-yellow-400 animate-pulse flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Initializing Worker...
            </span>
          )}
          {!isLoading && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              ✓ Ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-4 py-2 font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-200 flex items-center gap-2"
          >
            <span>🔗</span> Share
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors duration-200 flex items-center gap-2"
            title="Reset Visualization"
          >
            <span>🔄</span> Reset
          </button>
          {isRunning && (
            <button
              onClick={handleStop}
              className="px-4 py-2 font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 flex items-center gap-2"
            >
              <span>⏹</span> Stop
            </button>
          )}
          <button
            onClick={handleRunCode}
            className={`px-6 py-2 font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2
            ${!isLoading && !isRunning
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Running...
              </>
            ) : (
              <>
                <span>▶</span>
                Run Code
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Panel - Code Editor, Input & Output (50%) */}
        <div className="w-1/2 h-full border-r border-gray-700 flex flex-col">
          {/* Code Editor (50%) */}
          <div className="flex-[5] flex flex-col min-h-0 border-b border-gray-700">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-400">📝 Code Editor</span>
              {highlightLine && (
                <span className="text-xs text-yellow-400">
                  Line {highlightLine} highlighted
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <CodeEditor
                code={code}
                onChange={handleCodeChange}
                highlightLine={highlightLine}
              />
            </div>
          </div>

          {/* Input Box (20%) */}
          <div className="flex-[2] min-h-0 border-b border-gray-700">
            <InputBox inputs={inputs} onChange={setInputs} />
          </div>

          {/* Output Console (30%) - Full execution output */}
          <div className="flex-[3] min-h-0">
            <OutputConsole output={output} error={error} isRunning={isRunning} />
          </div>
        </div>

        {/* Right Panel - Trace Controller, Call Stack, Variable Table & Live Output (50%) */}
        <div className="w-1/2 h-full flex flex-col">
          {/* Trace Controller (20%) - Navigation only */}
          <div className="flex-[2] min-h-0 border-b border-gray-700">
            <TraceController
              traceData={traceData}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />
          </div>

          {/* Call Stack (30%) */}
          <div className="flex-[3] min-h-0 border-b border-gray-700">
            <CallStack
              traceData={traceData}
              currentStep={currentStep}
            />
          </div>

          {/* Variable Table (25%) */}
          <div className="flex-[2] min-h-0 border-b border-gray-700">
            <ErrorBoundary fallbackMessage="Variable Table crashed.">
              <VariableTable
                traceData={traceData}
                currentStep={currentStep}
                visualizationModes={visualizationModes}
                setVisualizationModes={setVisualizationModes}
              />
            </ErrorBoundary>
          </div>

          {/* Data Structure Visualizer (30%) */}
          <div className="flex-[3] min-h-0 border-b border-gray-700">
            <ErrorBoundary fallbackMessage="Graph Visualization crashed.">
              <DataStructureVisualizer
                traceData={traceData}
                currentStep={currentStep}
                visualizationModes={visualizationModes}
                onWarning={handleWarning}
              />
            </ErrorBoundary>
          </div>

          {/* Live Output (10%) */}
          <div className="flex-[1] min-h-0">
            <LiveOutput
              traceData={traceData}
              currentStep={currentStep}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
