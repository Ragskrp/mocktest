'use client';

import React, { useEffect, useRef } from 'react';

interface CoordinateBoardProps {
  boardId: string;
  initialX?: number;
  initialY?: number;
  onChange: (x: number, y: number) => void;
}

export default function CoordinateBoard({
  boardId,
  initialX = 0,
  initialY = 0,
  onChange,
}: CoordinateBoardProps) {
  type PointLike = {
    X: () => number;
    Y: () => number;
    on: (eventName: 'drag', handler: () => void) => void;
  };
  type BoardLike = {
    create: (elementType: 'point', parents: [number, number], attributes: Record<string, unknown>) => unknown;
  };

  const boardRef = useRef<BoardLike | null>(null);
  const pointRef = useRef<PointLike | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let active = true;

    // Load JSXGraph dynamically on the client side
    import('jsxgraph').then((JXG) => {
      if (!active) return;
      if (boardRef.current) return;

      const board = JXG.default.JSXGraph.initBoard(boardId, {
        boundingbox: [-6, 6, 6, -6],
        axis: true,
        grid: true,
        keepaspectratio: true,
        showcopyright: false,
        showNavigation: false,
        pan: { enabled: false },
        zoom: { enabled: false },
      } as any);

      boardRef.current = board;

      // Add a draggable point with snapping to integers
      const point = board.create('point', [initialX, initialY], {
        name: 'P',
        color: '#06B6D4',
        face: 'cross',
        size: 5,
        strokeWidth: 3,
        snapToGrid: true,
        snapSizeX: 1,
        snapSizeY: 1,
      }) as PointLike;

      pointRef.current = point;

      // Listen to point updates (dragging)
      point.on('drag', () => {
        const x = Math.round(point.X());
        const y = Math.round(point.Y());
        onChangeRef.current(x, y);
      });

      // Call it initially
      onChangeRef.current(initialX, initialY);
    }).catch((err) => {
      console.error('Failed to initialize CoordinateBoard:', err);
    });

    return () => {
      active = false;
      if (boardRef.current) {
        import('jsxgraph').then((JXG) => {
          if (boardRef.current) {
            JXG.default.JSXGraph.freeBoard(boardRef.current as never);
            boardRef.current = null;
            pointRef.current = null;
          }
        }).catch((err) => {
          console.error('Failed to clean up CoordinateBoard board:', err);
        });
      }
    };
  }, [boardId, initialX, initialY]);

  return (
    <div className="w-full aspect-square max-w-sm mx-auto bg-space-navy/40 border border-white/10 rounded-xl overflow-hidden shadow-inner p-2">
      <div id={boardId} className="jxgbox w-full h-full rounded-lg" style={{ minHeight: '300px' }} />
    </div>
  );
}
