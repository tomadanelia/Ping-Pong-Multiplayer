import React, { useState, useEffect } from 'react';
import Paddle from './Paddle';
import { socketService } from '../services/socketService';
import {
  PaddleMovePayload,
  PlayerInfo,
  GameStateUpdatePayload as SharedGameStateUpdatePayload, 
} from '@shared/types';
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

/**
 * Game screen component for a 2-player paddle game.
 * Handles local paddle movement and synchronization with server game state.
 */
const GameScreen: React.FC<GameScreenProps> = ({ sessionId, selfInfo, opponentInfo }) => {
  const [ownPaddleX, setOwnPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [opponentPaddleX, setOpponentPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);

  // Visual Y position for player's paddle (bottom or top depending on player role)
  const ownPaddleVisualY = selfInfo.isPlayerOne
    ? GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT 
    : PADDLE_OFFSET_Y;

  // Visual Y position for opponent's paddle
  const opponentPaddleVisualY = selfInfo.isPlayerOne
    ? PADDLE_OFFSET_Y
    : GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT;

  /**
   * Handles mouse movement within the game area.
   * Updates own paddle position and emits it to the server.
   * 
   * @param event - React mouse event with position info
   */
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

  /**
   * Subscribes to game state updates from the server and updates paddle positions accordingly.
   * Runs once on mount and cleans up on unmount.
   */
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
    };

    socketService.on<SharedGameStateUpdatePayload>('gameStateUpdate', handleGameStateUpdate);
    console.log(`GameScreen mounted for session: ${sessionId}, Self: ${selfInfo.name} (${selfInfo.id}), Opponent: ${opponentInfo.name} (${opponentInfo.id})`);

    return () => {
      console.log(`GameScreen unmounted for session: ${sessionId}`);
    };
  }, [sessionId, selfInfo.id, opponentInfo.id, selfInfo.name, opponentInfo.name]);

  const gameAreaStyle: React.CSSProperties = {
    width: `${GAME_WIDTH}px`,
    height: `${GAME_HEIGHT}px`,
    backgroundColor: 'black',
    position: 'relative',
    margin: 'auto',
    border: '1px solid white',
    cursor: 'none',
  };

  return (
    <div>
      <h2>Game Session: {sessionId}</h2>
      <p>Playing as: {selfInfo.name} (You) vs {opponentInfo.name}</p>
      {selfInfo.isPlayerOne ? <p>(You are defending the bottom)</p> : <p>(You are defending the top, but see it as bottom)</p>}

      <div style={gameAreaStyle} data-testid="game-area" onMouseMove={handleMouseMove}>
        {/* Player's own paddle - always rendered at the "bottom" from their perspective */}
        <Paddle
          x={ownPaddleX}
          y={GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT} // Always at bottom visually
          width={PADDLE_WIDTH}
          height={PADDLE_HEIGHT}
        />
        {/* Opponent's paddle - always rendered at the "top" from player's perspective */}
        <Paddle
          x={opponentPaddleX}
          y={PADDLE_OFFSET_Y} 
          width={PADDLE_WIDTH}
          height={PADDLE_HEIGHT}
        />
        {/* Ball will be rendered here later */}
      </div>
    </div>
  );
};

export default GameScreen;
