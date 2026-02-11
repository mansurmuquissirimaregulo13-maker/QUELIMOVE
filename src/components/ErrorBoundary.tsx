import * as React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 text-center">
                    <h2 className="text-xl font-bold mb-4">Ops! Algo correu mal.</h2>
                    <p className="text-sm text-[#9CA3AF] mb-6">Ocorreu um erro inesperado nesta página.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-[#FBBF24] text-black font-bold rounded-full"
                    >
                        Recarregar App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
