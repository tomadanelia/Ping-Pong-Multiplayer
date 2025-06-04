import React, { useState, useEffect } from 'react';
import Paddle from './Paddle';
import { socketService } from '../services/socketService';
import { GameState, Paddle as PaddleType, PlayerInfo } from '@shared/types'; // Renamed Paddle type to avoid conflict
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_OFFSET_Y,
} from '@shared/constants';

interface GameScreenProps {
  sessionId: string;
  selfInfo: PlayerInfo & { isPlayerOne: boolean }; 
  opponentInfo: PlayerInfo;
}

interface GameStateUpdatePayload extends GameState {}


const GameScreen: React.FC<GameScreenProps> = ({ sessionId, selfInfo, opponentInfo }) => {
  const [ownPaddleX, setOwnPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [opponentPaddleX, setOpponentPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const ownPaddleVisualY = GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT;
  const opponentPaddleVisualY = PADDLE_OFFSET_Y;

  useEffect(() => {
    const handleGameStateUpdate = (data: GameStateUpdatePayload) => {
      const serverSelfPaddle = data.players.find(p => p.id === selfInfo.id);
      const serverOpponentPaddle = data.players.find(p => p.id === opponentInfo.id);

      if (serverSelfPaddle) {
        setOwnPaddleX(serverSelfPaddle.x);
      
      }
      if (serverOpponentPaddle) {
        setOpponentPaddleX(serverOpponentPaddle.x);
      }
      // Ball position would also be updated here: setBallPosition(data.ball.position)
    };

    socketService.on<GameStateUpdatePayload>('gameStateUpdate', handleGameStateUpdate);
    console.log(`GameScreen mounted for session: ${sessionId}, Self: ${selfInfo.name}, Opponent: ${opponentInfo.name}`);

    return () => {
      console.log(`GameScreen unmounted for session: ${sessionId}`);
    };
  }, [sessionId, selfInfo.id, opponentInfo.id]); 

  const gameAreaStyle: React.CSSProperties = {
    width: `${GAME_WIDTH}px`,
    height: `${GAME_HEIGHT}px`,
    backgroundColor: 'black',
    position: 'relative', 
    margin: 'auto', 
    border: '1px solid white',
  };

  return (
    <div>
      <h2>Game Session: {sessionId}</h2>
      <p>Playing as: {selfInfo.name} (You) vs {opponentInfo.name}</p>
      {selfInfo.isPlayerOne ? <p>(You are defending the bottom)</p> : <p>(You are defending the top)</p>}

      <div style={gameAreaStyle} data-testid="game-area">
        <Paddle
          x={ownPaddleX}
          y={ownPaddleVisualY}
          width={PADDLE_WIDTH}
          height={PADDLE_HEIGHT}
        />
        <Paddle
          x={opponentPaddleX}
          y={opponentPaddleVisualY}
          width={PADDLE_WIDTH}
          height={PADDLE_HEIGHT}
        />
      </div>
    </div>
  );
};

export default GameScreen;