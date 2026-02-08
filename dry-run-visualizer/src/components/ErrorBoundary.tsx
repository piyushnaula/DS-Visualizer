import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-900 border border-red-800 rounded text-center">
                    <div className="text-red-400 mb-2 font-semibold">⚠️ Visualization Error</div>
                    <p className="text-gray-400 text-sm mb-4">
                        {this.props.fallbackMessage || 'Something went wrong with this component.'}
                    </p>
                    <div className="text-xs text-gray-500 font-mono mb-4 max-w-xs break-words">
                        {this.state.error?.message}
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                    >
                        Reset Component
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
