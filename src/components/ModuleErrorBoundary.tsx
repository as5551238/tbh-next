import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Per-module error boundary: isolates crashes to individual modules
 * so one failing module doesn't blank out the entire page shell.
 */
export default class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[ModuleErrorBoundary] ${this.props.moduleName || 'unknown'} crashed:`, error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-sm text-text-2 mb-1">模块渲染出错</p>
          <p className="text-xs text-text-3 mb-4">
            {this.props.moduleName ? `${this.props.moduleName} 加载失败` : '此模块遇到了问题'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary-2 hover:bg-primary/20 transition-colors"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}