'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const CoordinateBoard = dynamic(
  () => import('./CoordinateBoard'),
  { ssr: false } // Avoid Server Side Rendering (SSR) issues
);

interface CoordinateQuestionProps {
  boardId: string;
  initialX?: number;
  initialY?: number;
  onChange: (x: number, y: number) => void;
}

export function CoordinateQuestion({
  boardId,
  initialX = 0,
  initialY = 0,
  onChange,
}: CoordinateQuestionProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <CoordinateBoard
        boardId={boardId}
        initialX={initialX}
        initialY={initialY}
        onChange={onChange}
      />
    </div>
  );
}
export default CoordinateQuestion;
