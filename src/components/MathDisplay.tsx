import React, { Component, ErrorInfo, ReactNode } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackText: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MathErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KaTeX rendering error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <span className="font-mono text-lavender-grey">{this.props.fallbackText}</span>;
    }
    return this.props.children;
  }
}

interface MathDisplayProps {
  text: string;
}

export function MathDisplay({ text }: MathDisplayProps) {
  if (!text) return null;

  // Split on $$ first for block math, then $ for inline math
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return (
    <span>
      {parts.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const rawMath = part.slice(2, -2);
          return (
            <MathErrorBoundary key={idx} fallbackText={part}>
              <BlockMath math={rawMath} />
            </MathErrorBoundary>
          );
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const rawMath = part.slice(1, -1);
          return (
            <MathErrorBoundary key={idx} fallbackText={part}>
              <InlineMath math={rawMath} />
            </MathErrorBoundary>
          );
        } else {
          return <span key={idx}>{part}</span>;
        }
      })}
    </span>
  );
}
