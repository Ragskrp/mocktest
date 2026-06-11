import { useEffect, useRef } from 'react';

export function useJSXGraph(boardId: string, config: Record<string, unknown> = {}) {
  const boardRef = useRef<unknown | null>(null);

  useEffect(() => {
    let active = true;

    // Dynamically import to prevent SSR/Node.js hydration issues
    import('jsxgraph').then((JXG) => {
      if (!active) return;
      if (boardRef.current) return; // Already initialized

      // We handle default configuration values and merge with custom ones
      boardRef.current = JXG.default.JSXGraph.initBoard(boardId, {
        boundingbox: [-5, 5, 5, -5],
        axis: true,
        grid: true,
        keepaspectratio: true,
        showCopyright: false,
        showNavigation: false,
        ...config
      });
    }).catch((err) => {
      console.error('Failed to load JSXGraph:', err);
    });

    return () => {
      active = false;
      if (boardRef.current) {
        import('jsxgraph').then((JXG) => {
          if (boardRef.current) {
            JXG.default.JSXGraph.freeBoard(boardRef.current as never);
            boardRef.current = null;
          }
        }).catch((err) => {
          console.error('Failed to free JSXGraph board:', err);
        });
      }
    };
  }, [boardId, config]);

  return boardRef;
}
