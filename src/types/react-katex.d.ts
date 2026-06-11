declare module 'react-katex' {
  import type { ComponentType } from 'react';

  export interface MathComponentProps {
    math: string;
  }

  export const InlineMath: ComponentType<MathComponentProps>;
  export const BlockMath: ComponentType<MathComponentProps>;
}
