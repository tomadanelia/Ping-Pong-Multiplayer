import React from 'react';
import { BALL_RADIUS } from '@shared/constants';

interface BallProps {
  x: number;
  y: number;
}

const BallComponent: React.FC<BallProps> = ({ x, y }) => {
  const simpleBallStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x - BALL_RADIUS}px`,
    top: `${y - BALL_RADIUS}px`,
    width: `${BALL_RADIUS * 2}px`,
    height: `${BALL_RADIUS * 2}px`,
    backgroundColor: 'white',
    borderRadius: '50%',
  };


  return (
    <div style={simpleBallStyle} data-testid="ball"></div>
  );
};

export default BallComponent;