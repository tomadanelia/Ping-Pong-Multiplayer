import React, { useState, useEffect } from 'react';
import Paddle from './Paddle';
import BallComponent from './Ball';
import ScoreBoard from './ScoreBoard'; // Import ScoreBoard
import { socketService } from '../services/socketService';
import {
  PaddleMovePayload,
  PlayerInfo,
  GameStateUpdatePayload as SharedGameStateUpdatePayload,
  Ball,
  PlayerId, 
} from '@shared/types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_OFFSET_Y,
  // BALL_RADIUS, // Already imported if BallComponent uses it internally
} from '@shared/constants';

interface GameScreenProps {
  sessionId: string;
  selfInfo: PlayerInfo & { isPlayerOne: boolean };
  opponentInfo: PlayerInfo;
}

const GameScreen: React.FC<GameScreenProps> = ({ sessionId, selfInfo, opponentInfo }) => {
  const [ownPaddleX, setOwnPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [opponentPaddleX, setOpponentPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [ballPosition, setBallPosition] = useState<Ball['position']>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
  });

  // useState for scores
  const [scores, setScores] = useState<{ [playerId: PlayerId]: number }>({
    [selfInfo.id]: 0,
    [opponentInfo.id]: 0,
  });

  const ownPaddleVisualY = GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT;
  const opponentPaddleVisualY = PADDLE_OFFSET_Y;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const gameArea = event.currentTarget;
    const rect = gameArea.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    let newPaddleX = mouseX - PADDLE_WIDTH / 2;

    newPaddleX = Math.max(0, newPaddleX);
    newPaddleX = Math.min(newPaddleX, GAME_WIDTH - PADDLE_WIDTH);

    setOwnPaddleX(newPaddleX);
    socketService.emit<PaddleMovePayload>('paddleMove', { newx: newPaddleX });
  };

  useEffect(() => {
    const handleGameStateUpdate = (data: SharedGameStateUpdatePayload) => {
      if (data.paddles) {
        const selfPaddleUpdate = data.paddles[selfInfo.id];
        if (selfPaddleUpdate) {
          setOwnPaddleX(selfPaddleUpdate.x);
        }
        const opponentPaddleUpdate = data.paddles[opponentInfo.id];
        if (opponentPaddleUpdate) {
          setOpponentPaddleX(opponentPaddleUpdate.x);
        }
      }

      if (data.ball) {
        setBallPosition(data.ball.position);
      }

      // On gameStateUpdate received, update local score states
      if (data.scores) {
        setScores(data.scores);
      }
    };

    socketService.on<SharedGameStateUpdatePayload>('gameStateUpdate', handleGameStateUpdate);
    console.log(`GameScreen mounted for session: ${sessionId}, Self: ${selfInfo.name} (${selfInfo.id}), Opponent: ${opponentInfo.name} (${opponentInfo.id})`);



    return () => {
      console.log(`GameScreen unmounted for session: ${sessionId}`);
    };
  }, [sessionId, selfInfo.id, opponentInfo.id, selfInfo.name, opponentInfo.name]); // Dependencies

  const gameScreenContainerStyle: React.CSSProperties = {
    position: 'relative', 
    width: `${GAME_WIDTH}px`,
    margin: 'auto',
  };

  const gameAreaStyle: React.CSSProperties = {
    width: `${GAME_WIDTH}px`,
    height: `${GAME_HEIGHT}px`,
    backgroundColor: 'black',
    position: 'relative', 
    border: '1px solid white',
    cursor: 'none',
  };

  return (
    <div> 
      <h2>Game Session: {sessionId}</h2>
      <p>Playing as: {selfInfo.name} (You) vs {opponentInfo.name}</p>
      {selfInfo.isPlayerOne ? <p>(You are defending the bottom)</p> : <p>(You are defending the top, but see it as bottom)</p>}

      <div style={gameScreenContainerStyle}> 
        <ScoreBoard
          selfName={selfInfo.name}
          selfScore={scores[selfInfo.id] || 0} 
          opponentName={opponentInfo.name}
          opponentScore={scores[opponentInfo.id] || 0} 
          isSelfPlayerOne={selfInfo.isPlayerOne}
        />
        <div style={gameAreaStyle} data-testid="game-area" onMouseMove={handleMouseMove}>
          <Paddle
            x={ownPaddleX}
            y={ownPaddleVisualY} // Visual Y
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
          />
          <Paddle
            x={opponentPaddleX}
            y={opponentPaddleVisualY} // Visual Y
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
          />
          <BallComponent
            x={ballPosition.x}
            y={ballPosition.y}
          />
        </div>
      </div>
    </div>
  );
};

export default GameScreen;