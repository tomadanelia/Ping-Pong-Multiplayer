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
    color: 'white',
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    zIndex: 10, 
  };

  return (
    <div style={scoreBoardStyle} data-testid="scoreboard">
      <span>{player1Display.name}: {player1Display.score}</span>
      <span style={{ margin: '0 15px' }}>VS</span>
      <span>{player2Display.name}: {player2Display.score}</span>
    </div>
  );
};

export default ScoreBoard;