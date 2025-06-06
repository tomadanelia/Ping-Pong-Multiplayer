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
  const player1Display = isSelfPlayerOne ? { name: selfName, score: selfScore } : { name: opponentName, score: opponentScore };
  const player2Display = isSelfPlayerOne ? { name: opponentName, score: opponentScore } : { name: selfName, score: selfScore };

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
      <span style={{color:"rgb(245, 111, 28)"}}>{player1Display.score}</span>
      <span style={{ margin: '0 15px' }}>:</span>
      <span style={{color:"rgb(28, 165, 245)"}}>{player2Display.score}</span>
    </div>
  );
};

export default ScoreBoard;