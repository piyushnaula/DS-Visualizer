'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    Handle,
    Position,
    useNodesState,
    useEdgesState,
    MarkerType,
    ConnectionLineType
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import GridVisualizer from './GridVisualizer';
import { TraceStep } from '@/types/trace';

interface DataStructureVisualizerProps {
    traceData: TraceStep[] | null;
    currentStep: number;
    visualizationModes?: Record<string, 'linear' | 'tree' | 'grid'>;
    onWarning?: (message: string) => void;
}

// --- Custom Nodes ---

const TreeNode = ({ data }: { data: { label: string, value: string } }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-600 border-2 border-emerald-400 flex items-center justify-center shadow-lg relative z-10">
                <span className="text-white font-bold font-mono text-sm">{data.value}</span>
                <Handle type="target" position={Position.Top} className="!bg-emerald-200 !w-2 !h-2" />
                <Handle type="source" position={Position.Bottom} className="!bg-emerald-200 !w-2 !h-2" />
            </div>
            <div className="mt-1 text-[10px] text-emerald-400/70 font-mono">#{data.label}</div>
        </div>
    );
};

const ListNode = ({ data }: { data: { label: string, value: string } }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="px-4 py-2 bg-orange-600 border-2 border-orange-400 rounded-md shadow-lg flex items-center justify-center min-w-[60px]">
                <span className="text-white font-bold font-mono text-sm">{data.value}</span>
                <Handle type="target" position={Position.Left} className="!bg-orange-200 !w-2 !h-2" />
                <Handle type="source" position={Position.Right} className="!bg-orange-200 !w-2 !h-2" />
            </div>
            <div className="mt-1 text-[10px] text-orange-400/70 font-mono">#{data.label}</div>
        </div>
    );
};

const DefaultObjectNode = ({ data }: { data: { label: string, value: string, type: string } }) => {
    let bgColor = 'bg-gray-700';
    let borderColor = 'border-gray-500';

    if (data.type === 'list') { bgColor = 'bg-blue-900'; borderColor = 'border-blue-500'; }
    if (data.type === 'dict') { bgColor = 'bg-purple-900'; borderColor = 'border-purple-500'; }

    return (
        <div className={`px-3 py-2 ${bgColor} border-2 ${borderColor} rounded shadow-md min-w-[80px] text-center`}>
            <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
            <div className="text-[10px] text-gray-400 mb-0.5 uppercase">{data.type} #{data.label}</div>
            <div className="text-white font-mono text-xs whitespace-pre-wrap">{data.value}</div>
            <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
        </div>
    );
};

const VariablePointerNode = ({ data }: { data: { label: string } }) => {
    return (
        <div className="px-2 py-1 bg-cyan-900/80 border border-cyan-500 rounded text-center shadow-sm">
            <div className="text-cyan-300 font-bold font-mono text-xs">{data.label}</div>
            <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-1 !h-1" />
        </div>
    );
};

const NullNode = () => {
    return (
        <div className="flex flex-col items-center justify-center">
            <div className="w-8 h-6 bg-gray-700 rounded-sm flex items-center justify-center border border-gray-500 shadow-sm">
                <span className="text-[10px] text-gray-400 font-mono">NULL</span>
            </div>
            <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-1 !h-1" />
        </div>
    );
};
const nodeTypes = {
    treeNode: TreeNode,
    listNode: ListNode,
    defaultNode: DefaultObjectNode,
    variableNode: VariablePointerNode,
    nullNode: NullNode,
    gridNode: GridVisualizer,
};

// --- Layout Logic ---

// Robust local Ref check to avoid import issues
const isRef = (val: any) => val && typeof val === 'object' && val.type === 'ref';

// --- Layout Logic ---

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const ranksep = direction === 'TB' ? 60 : 50;
    const nodesep = direction === 'TB' ? 80 : 40;
    dagreGraph.setGraph({ rankdir: direction, ranksep, nodesep });

    nodes.forEach((node) => {
        // Skip child nodes (handled by parent)
        if (node.parentNode) return;

        let width = node.width || 60, height = node.height || 60;
        if (node.style?.width) width = Number(node.style.width);
        if (node.style?.height) height = Number(node.style.height);

        if (node.type === 'defaultNode') { width = 140; height = 100; }
        if (node.type === 'variableNode') { width = 100; height = 40; }
        if (node.type === 'treeNode') { width = 60; height = 60; }
        if (node.type === 'listNode') { width = 100; height = 60; }
        if (node.type === 'nullNode') { width = 50; height = 40; }

        // If it's a grid container (has specific style set in logic), keep that size
        if (node.data?.isGridContainer) {
            width = node.data.width || width;
            height = node.data.height || height;
        }

        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        // Skip edges that are purely internal to a grid? 
        // Or just let Dagre handle edges. 
        // If source/target is a child node, Dagre might fail if we didn't add the child node.

        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        const sourceId = sourceNode?.parentNode || edge.source;
        const targetId = targetNode?.parentNode || edge.target;

        if (sourceId !== targetId) {
            dagreGraph.setEdge(sourceId, targetId);
        }
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        if (node.parentNode) return node; // Keep relative position

        const nodeWithPosition = dagreGraph.node(node.id);
        if (!nodeWithPosition) return node;

        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWithPosition.width / 2,
                y: nodeWithPosition.y - nodeWithPosition.height / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

export default function DataStructureVisualizer({ traceData, currentStep, visualizationModes = {}, onWarning }: DataStructureVisualizerProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [showNulls, setShowNulls] = useState(true);

    const traceStep = traceData?.[currentStep];

    const nodeTypesMemo = useMemo(() => nodeTypes, []);

    useEffect(() => {
        if (!traceStep?.variables || !traceStep?.heap) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const { variables, heap } = traceStep;
        const rawNodes: Node[] = [];
        const rawEdges: Edge[] = [];
        const usedHeapIds = new Set<string>();

        // 1. Determine dominant structure type for layout direction
        let layoutDirection: 'TB' | 'LR' = 'TB';
        let hasNext = false;
        let hasLeftRight = false;

        // 2. Identify reachable objects (BFS)
        const queue = Object.values(variables).filter(isRef).map(v => String((v as any).id));
        queue.forEach(id => usedHeapIds.add(id));

        // Expand...
        let processedIdx = 0;
        while (processedIdx < queue.length) {
            const id = queue[processedIdx++];
            const obj = heap[id];
            if (!obj) continue;

            // Check structure for layout hint
            if (obj.type === 'ListNode') hasNext = true;
            if (obj.type === 'TreeNode') hasLeftRight = true;

            // Find children refs
            let children: string[] = [];
            if (obj.type === 'list' || obj.type === 'tuple' || obj.type === 'set') {
                (obj.value as any[]).forEach(item => { if (isRef(item)) children.push(String(item.id)); });
            } else if (typeof obj.value === 'object') {
                Object.values(obj.value as any).forEach(val => {
                    if (isRef(val)) {
                        children.push(String((val as any).id));
                    }
                });
            }

            children.forEach(childId => {
                if (!usedHeapIds.has(childId)) {
                    usedHeapIds.add(childId);
                    queue.push(childId);
                }
            });
        }

        // 2.5 Force TB layout if ANY array is in Tree Mode
        Object.keys(visualizationModes).forEach(id => {
            if (visualizationModes[id] === 'tree' && usedHeapIds.has(id)) {
                layoutDirection = 'TB';
            }
        });

        if (hasNext && !hasLeftRight && layoutDirection !== 'TB') layoutDirection = 'LR';

        // 3. Create Heap Nodes & Edges
        usedHeapIds.forEach(id => {
            const obj = heap[id];
            if (!obj) return;

            let nodeType = 'defaultNode';
            let displayValue = '';

            if (obj.type === 'TreeNode') {
                nodeType = 'treeNode';
                displayValue = String((obj.value as any).val ?? (obj.value as any).value ?? (obj.value as any).data ?? '?');
            } else if (obj.type === 'ListNode') {
                nodeType = 'listNode';
                displayValue = String((obj.value as any).val ?? (obj.value as any).value ?? (obj.value as any).data ?? '?');
            } else {
                if (Array.isArray(obj.value)) {
                    // Check mode for this array
                    const mode = visualizationModes[id] || 'linear';

                    if (mode === 'tree') {
                        // Render Tree Structure
                        const arr = obj.value as any[];
                        const limit = Math.min(arr.length, 31);

                        // Warn if truncated
                        if (arr.length > 31 && onWarning) {
                            onWarning(`Heap view truncated to depth 5 for performance.`);
                        }

                        for (let i = 0; i < limit; i++) {
                            const val = arr[i];
                            const isRefVal = isRef(val);
                            const valDisplay = isRefVal ? `@${val.id}` : String(val);

                            rawNodes.push({
                                id: `arr-${id}-${i}`,
                                type: 'treeNode',
                                position: { x: 0, y: 0 },
                                data: { label: String(i), value: valDisplay }
                            });

                            // Heap Edges
                            const left = 2 * i + 1;
                            const right = 2 * i + 2;

                            if (left < limit && arr[left] !== undefined) {
                                rawEdges.push({
                                    id: `arr-edge-${id}-${i}-${left}`,
                                    source: `arr-${id}-${i}`,
                                    target: `arr-${id}-${left}`,
                                    label: 'left',
                                    type: 'smoothstep'
                                });
                            }
                            if (right < limit && arr[right] !== undefined) {
                                rawEdges.push({
                                    id: `arr-edge-${id}-${i}-${right}`,
                                    source: `arr-${id}-${i}`,
                                    target: `arr-${id}-${right}`,
                                    label: 'right',
                                    type: 'smoothstep'
                                });
                            }

                            // Reference Edges
                            if (isRefVal && usedHeapIds.has(String(val.id))) {
                                rawEdges.push({
                                    id: `ref-edge-${id}-${i}-${val.id}`,
                                    source: `arr-${id}-${i}`,
                                    target: `obj-${val.id}`,
                                    style: { stroke: '#94a3b8', strokeDasharray: '4,2' }
                                });
                            }
                        }
                        return; // Skip default processing
                    } else if (mode === 'grid') {
                        // --- GRID / MATRIX LAYOUT ---
                        const rows = obj.value as any[];

                        // Reconstruct 2D matrix
                        const matrix: any[][] = [];
                        let maxCols = 0;

                        rows.forEach(rowRef => {
                            if (isRef(rowRef)) {
                                const rowObj = heap[rowRef.id];
                                if (rowObj && rowObj.type === 'list') {
                                    const cols = rowObj.value as any[];
                                    matrix.push(cols);
                                    maxCols = Math.max(maxCols, cols.length);
                                } else {
                                    matrix.push([]);
                                }
                            } else {
                                matrix.push([]);
                            }
                        });

                        const rowCount = matrix.length;
                        // Approximate size for Dagre (40px cell + 4px gap + padding)
                        const width = maxCols * 45 + 30;
                        const height = rowCount * 45 + 50;

                        // Create ONE node
                        rawNodes.push({
                            id: `obj-${id}`,
                            type: 'gridNode',
                            position: { x: 0, y: 0 },
                            data: { matrix, id },
                            style: { width, height }
                        });

                        // Create Edges for References within the matrix
                        matrix.forEach((row, r) => {
                            row.forEach((val, c) => {
                                if (isRef(val) && usedHeapIds.has(String(val.id))) {
                                    rawEdges.push({
                                        id: `ref-edge-${id}-${r}-${c}-${val.id}`,
                                        source: `obj-${id}`,
                                        target: `obj-${val.id}`,
                                        sourceHandle: `cell-${r}-${c}`, // Connect from specific cell handle
                                        style: { stroke: '#22d3ee', strokeDasharray: '4,2' }
                                    });
                                }
                            });
                        });
                        return;
                    } else {
                        // Linear Mode
                        const arr = obj.value as any[];
                        const limit = Math.min(arr.length, 20);

                        for (let i = 0; i < limit; i++) {
                            const val = arr[i];
                            const isRefVal = isRef(val);
                            const valDisplay = isRefVal ? `@${val.id}` : String(val);

                            rawNodes.push({
                                id: `arr-${id}-${i}`,
                                type: 'listNode',
                                position: { x: 0, y: 0 },
                                data: { label: String(i), value: valDisplay }
                            });

                            if (i < limit - 1) {
                                rawEdges.push({
                                    id: `arr-edge-${id}-${i}-${i + 1}`,
                                    source: `arr-${id}-${i}`,
                                    target: `arr-${id}-${i + 1}`,
                                    type: 'smoothstep',
                                    style: { stroke: '#475569' }
                                });
                            }

                            if (isRefVal && usedHeapIds.has(String(val.id))) {
                                rawEdges.push({
                                    id: `ref-edge-${id}-${i}-${val.id}`,
                                    source: `arr-${id}-${i}`,
                                    target: `obj-${val.id}`,
                                    style: { stroke: '#94a3b8', strokeDasharray: '4,2' }
                                });
                            }
                        }
                        return;
                    }
                }

                if (typeof obj.value === 'object') displayValue = `{...}`;
                else displayValue = String(obj.value);
            }

            rawNodes.push({
                id: `obj-${id}`,
                type: nodeType,
                position: { x: 0, y: 0 },
                data: { label: id, value: displayValue, type: obj.type }
            });

            // Edges from this object
            if (typeof obj.value === 'object' && obj.value !== null) {
                const fields = Array.isArray(obj.value)
                    ? obj.value.map((v, i) => [String(i), v])
                    : Object.entries(obj.value);

                fields.forEach(([key, val]) => {
                    // Skip Array indices processing here (handled above)
                    if (Array.isArray(obj.value)) return;

                    // 1. Handle Reference Edges
                    if (isRef(val)) {
                        if (usedHeapIds.has(String((val as any).id))) {
                            let label = '';
                            if (obj.type === 'ListNode') {
                                if (key === 'next') label = '';
                                else if (key === 'prev') label = 'prev';
                            } else if (obj.type === 'TreeNode') {
                                label = key;
                            } else {
                                label = key;
                            }

                            rawEdges.push({
                                id: `edge-${id}-${key}-${(val as any).id}`,
                                source: `obj-${id}`,
                                target: `obj-${(val as any).id}`,
                                label: label,
                                type: 'smoothstep',
                                markerEnd: { type: MarkerType.ArrowClosed },
                                style: key === 'prev'
                                    ? { stroke: '#a855f7', strokeDasharray: '4,2' }
                                    : { stroke: '#94a3b8' }
                            });
                        }
                    }
                    // 2. Handle Explicit NULL Pointers
                    else if (val === null && showNulls) {
                        if ((obj.type === 'TreeNode' && (key === 'left' || key === 'right')) ||
                            (obj.type === 'ListNode' && (key === 'next' || key === 'prev'))) {

                            const nullId = `null-${id}-${key}`;
                            rawNodes.push({
                                id: nullId,
                                type: 'nullNode',
                                position: { x: 0, y: 0 },
                                data: {}
                            });

                            rawEdges.push({
                                id: `edge-${id}-${key}-null`,
                                source: `obj-${id}`,
                                target: nullId,
                                label: key,
                                type: 'smoothstep',
                                markerEnd: { type: MarkerType.ArrowClosed },
                                style: { stroke: '#4b5563', strokeDasharray: '4,4' }
                            });
                        }
                    }
                });
            }
        });

        // 4. Create Variable Pointer Nodes
        Object.entries(variables).forEach(([name, val]) => {
            if (isRef(val)) {
                const targetId = String((val as any).id);
                if (usedHeapIds.has(targetId)) {
                    const uniqueId = `var-${name}`;
                    rawNodes.push({
                        id: uniqueId,
                        type: 'variableNode',
                        position: { x: 0, y: 0 },
                        data: { label: name }
                    });

                    rawEdges.push({
                        id: `edge-var-${name}-${targetId}`,
                        source: uniqueId,
                        target: `obj-${targetId}`,
                        type: 'default',
                        markerEnd: { type: MarkerType.ArrowClosed },
                        style: { stroke: '#22d3ee', strokeDasharray: '5,5', strokeWidth: 2 },
                    });
                }
            }
        });

        if (rawNodes.length > 0) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, layoutDirection);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } else {
            setNodes([]);
            setEdges([]);
        }

    }, [traceStep, showNulls, visualizationModes, setNodes, setEdges, onWarning]);

    if (nodes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm italic bg-gray-900 border-l border-gray-700">
                No data structures available
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                <span className="text-sm text-gray-400">🕸️ Graph View</span>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showNulls}
                            onChange={(e) => setShowNulls(e.target.checked)}
                            className="rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-offset-gray-900"
                        />
                        Show NULLs
                    </label>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypesMemo}
                    fitView
                    minZoom={0.1}
                    maxZoom={2}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        markerEnd: { type: MarkerType.ArrowClosed },
                    }}
                    proOptions={{ hideAttribution: true }}
                    connectionLineType={ConnectionLineType.SmoothStep}
                >
                    <Background color="#374151" gap={16} size={1} />
                    <Controls className="!bg-gray-800 !border-gray-700 !fill-gray-400" />
                </ReactFlow>
            </div>
        </div>
    );
}
