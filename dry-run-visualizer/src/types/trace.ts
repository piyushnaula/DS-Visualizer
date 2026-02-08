// Type definitions for trace data using new Heap Serialization

export interface StackFrame {
    name: string;
    line: number;
    args: Record<string, unknown>;
}

export interface HeapObject {
    type: 'list' | 'tuple' | 'dict' | 'set' | 'object' | 'ListNode' | 'TreeNode' | 'unknown';
    id: number;
    value: unknown; // The content (list items, dict k/v, or object fields)
    class?: string; // Class name for custom objects
}

export interface VariableReference {
    type: 'ref';
    id: number;
}

export type VariableValue = string | number | boolean | null | VariableReference | HeapObject; // HeapObject is for when we inline it, but usually it's in heap

// Helper to check if a value is a reference
export function isReference(value: unknown): value is VariableReference {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as any).type === 'ref' &&
        typeof (value as any).id === 'number'
    );
}

export interface TraceStep {
    line: number;
    event: 'line' | 'call' | 'return';
    variables: Record<string, VariableValue>;
    heap: Record<string, HeapObject>; // New heap dictionary
    function: string | null;
    return_value?: VariableValue;
    stdout?: string;
    stackDepth?: number;
    callStack?: StackFrame[];
}

export type TraceData = TraceStep[];

export interface ExecutionResult {
    output: string;
    error: string | null;
    traceData: TraceData | null;
}
