'use client';

import { useState } from 'react';

interface InputBoxProps {
    inputs: string;
    onChange: (inputs: string) => void;
}

export default function InputBox({ inputs, onChange }: InputBoxProps) {
    const [isFocused, setIsFocused] = useState(false);

    // Count number of input lines
    const inputCount = inputs.trim() ? inputs.trim().split('\n').length : 0;

    return (
        <div className="h-full flex flex-col bg-gray-900">
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">⌨️ Input Box</span>
                    <span className="text-xs text-gray-500">(for input() calls)</span>
                </div>
                <span className="text-xs text-gray-500">
                    {inputCount} input{inputCount !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="flex-1 p-2 min-h-0">
                <textarea
                    value={inputs}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Enter inputs here, one per line.&#10;Example:&#10;50&#10;hello&#10;world"
                    className={`
            w-full h-full p-3 rounded-lg font-mono text-sm resize-none
            bg-gray-800 border-2 transition-colors duration-200
            ${isFocused
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-gray-600 hover:border-gray-500'
                        }
            text-white placeholder-gray-500
            focus:outline-none
          `}
                />
            </div>

            {/* Help text */}
            <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-500">
                💡 Each line = one input() value. First line → first input(), etc.
            </div>
        </div>
    );
}
