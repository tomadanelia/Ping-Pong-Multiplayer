import React from 'react';

interface ScoreBoardProps {
  selfName: string;
  selfScore: number;
  opponentName: string;
  opponentScore: number;
  isSelfPlayerOne: boolean; 
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  selfName,
  selfScore,
  opponentName,
  opponentScore,
  isSelfPlayerOne,
}) => {
  const scoreBoardStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgb(28, 165, 245)',
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    zIndex: 10, 
  };

  return (
    <div style={scoreBoardStyle} data-testid="scoreboard">
      <span style={{color: isSelfPlayerOne ? "rgb(245, 111, 28)" : "rgb(28, 165, 245)"}}>
        {isSelfPlayerOne ? selfScore : opponentScore}
      </span>
      <span style={{ margin: '0 15px' }}>:</span>
      <span style={{color: isSelfPlayerOne ? "rgb(28, 165, 245)" : "rgb(245, 111, 28)"}}>
        {isSelfPlayerOne ? opponentScore : selfScore}
      </span>
    </div>
  );
};

export default ScoreBoard;