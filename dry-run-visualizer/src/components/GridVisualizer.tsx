import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position } from 'reactflow';
import { HeapObject } from '@/types/trace';

interface GridVisualizerProps {
    data: {
        matrix: any[][];
        id: string; // The Heap ID of the matrix object
    };
}

const isRef = (val: any) => val && typeof val === 'object' && val.type === 'ref';

export default function GridVisualizer({ data }: GridVisualizerProps) {
    const { matrix, id } = data;

    // 1. Calculate Max Value for Heatmap
    const maxValue = useMemo(() => {
        let max = 0;
        matrix.forEach(row => {
            row.forEach(val => {
                if (typeof val === 'number') {
                    max = Math.max(max, val);
                }
            });
        });
        return max > 0 ? max : 1; // Avoid division by zero
    }, [matrix]);

    // 2. Grid Dimensions
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;

    return (
        <div className="bg-gray-800/90 rounded-lg p-2 border border-gray-600 shadow-xl backdrop-blur-sm">
            {/* Header / ID Label */}
            <div className="text-[10px] text-gray-400 mb-1 px-1 font-mono uppercase">
                Grid #{id} <span className="text-gray-600">({rows}×{cols})</span>
            </div>

            <div
                className="grid gap-1"
                style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(40px, 1fr))`,
                }}
            >
                {matrix.map((row, rowIndex) => (
                    <React.Fragment key={`row-${rowIndex}`}>
                        {row.map((val: any, colIndex: number) => {
                            const isNumber = typeof val === 'number';
                            const opacity = isNumber ? 0.3 + (val / maxValue) * 0.7 : 1;
                            const isRefVal = isRef(val);

                            // Color logic: Red for numbers, Blue/Cyan for others/refs
                            const baseColor = isNumber ? `rgba(220, 38, 38, ${opacity})` : 'rgba(30, 41, 59, 0.8)';
                            const displayVal = isRefVal ? `@${val.id}` : String(val);

                            return (
                                <motion.div
                                    key={`${rowIndex}-${colIndex}-${displayVal}`} // Key changes on value change -> triggers animation
                                    initial={{ scale: 1.2, backgroundColor: '#fcd34d' }} // Flash yellow on update
                                    animate={{ scale: 1, backgroundColor: baseColor }}
                                    transition={{ duration: 0.3 }}
                                    className={`
                                        relative flex items-center justify-center p-2 rounded 
                                        border text-sm font-mono font-bold text-white
                                        ${isNumber ? 'border-red-900/50' : 'border-slate-600'}
                                    `}
                                    style={{
                                        minWidth: '40px',
                                        height: '40px',
                                    }}
                                >
                                    {displayVal}

                                    {/* Handle for References */}
                                    {isRefVal && (
                                        <Handle
                                            type="source"
                                            position={Position.Right}
                                            id={`cell-${rowIndex}-${colIndex}`}
                                            className="!bg-cyan-400 !w-1.5 !h-1.5 !-right-1"
                                        />
                                    )}

                                    {/* Handle for Incoming (optional, usually to the whole node) */}
                                    {/* We can rely on the parent node handle for incoming edges */}
                                </motion.div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            {/* Standard Target Handle for the whole grid object */}
            <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2 !h-2" />
        </div>
    );
}
