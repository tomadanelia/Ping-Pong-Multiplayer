import React, { useState, useEffect } from 'react';
import Paddle from './Paddle';
import BallComponent from './Ball';
import ScoreBoard from './ScoreBoard'; // Import ScoreBoard
import { socketService } from '../services/socketService';
import './GameScreen.css';
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
} from '@shared/constants';
import './GameScreen.css';

interface GameScreenProps {
  sessionId: string;
  selfInfo: PlayerInfo & { isPlayerOne: boolean };
  opponentInfo: PlayerInfo;
}

const GameScreen: React.FC<GameScreenProps> = ({ sessionId, selfInfo, opponentInfo }) => {
  const [ownPaddleX, setOwnPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [opponentPaddleX, setOpponentPaddleX] = useState<number>(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const player1Display = selfInfo.isPlayerOne ? { name: selfInfo.name} : { name: opponentInfo.name};
  const player2Display = selfInfo.isPlayerOne ? { name: opponentInfo.name} : { name: selfInfo.name};
  const [ballPosition, setBallPosition] = useState<Ball['position']>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
  });
  const [ballVelocity, setBallVelocity] = useState<Ball['velocity']>({ dx: 0, dy: 0 });

  // useState for scores
  const [scores, setScores] = useState<{ [playerId: PlayerId]: number }>({
    [selfInfo.id]: 0,
    [opponentInfo.id]: 0,
  });

  const ownPaddleVisualY = GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT;
  const opponentPaddleVisualY = PADDLE_OFFSET_Y;

  const transformX = (x: number) => {
    if (selfInfo.isPlayerOne) return x;
    return GAME_WIDTH - x - PADDLE_WIDTH; 
  };

  const getTransformedBallState = (ball: Ball) => {
    if (selfInfo.isPlayerOne) {
      return ball;
    }
    
    return {
      position: {
        x: GAME_WIDTH - ball.position.x,
        y: GAME_HEIGHT - ball.position.y
      },
      velocity: {
        dx: -ball.velocity.dx,
        dy: -ball.velocity.dy
      },
      radius: ball.radius
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const gameArea = event.currentTarget;
    const rect = gameArea.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    let newPaddleX = mouseX - PADDLE_WIDTH / 2;

    newPaddleX = Math.max(0, newPaddleX);
    newPaddleX = Math.min(newPaddleX, GAME_WIDTH - PADDLE_WIDTH);

    // For Player 2, we need to transform the X coordinate before sending to server
    const serverX = selfInfo.isPlayerOne ? newPaddleX : GAME_WIDTH - newPaddleX - PADDLE_WIDTH;
    
    setOwnPaddleX(newPaddleX);
    socketService.emit<PaddleMovePayload>('paddleMove', { newx: serverX });
  };

  useEffect(() => {
    // Set CSS custom properties
    document.documentElement.style.setProperty('--game-width', `${GAME_WIDTH}px`);
    document.documentElement.style.setProperty('--game-height', `${GAME_HEIGHT}px`);

    const handleGameStateUpdate = (data: SharedGameStateUpdatePayload) => {
      if (data.paddles) {
        const selfPaddleUpdate = data.paddles[selfInfo.id];
        if (selfPaddleUpdate) {
          // Transform the X coordinate for display
          setOwnPaddleX(transformX(selfPaddleUpdate.x));
        }
        const opponentPaddleUpdate = data.paddles[opponentInfo.id];
        if (opponentPaddleUpdate) {
          // Transform the X coordinate for display
          setOpponentPaddleX(transformX(opponentPaddleUpdate.x));
        }
      }

      if (data.ball) {
        const transformedBall = getTransformedBallState(data.ball);
        setBallPosition(transformedBall.position);
        setBallVelocity(transformedBall.velocity);
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

  return (
    <div className="outer-container"> 
      <div style={{ 
        position: 'relative',
        width: '100%',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{
          color: "rgb(10, 82, 112)",
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          margin: 0,
          padding: 0
        }}>
          <span className='player1-name' >{player1Display.name}</span>
          <span className='vs-text' >VS</span>
          <span className='player2-name'>{player2Display.name}</span>
        </h1>
      </div>
      <div className="game-screen-container"> 
        <ScoreBoard
          selfName={selfInfo.name}
          selfScore={scores[selfInfo.id] || 0} 
          opponentName={opponentInfo.name}
          opponentScore={scores[opponentInfo.id] || 0} 
          isSelfPlayerOne={selfInfo.isPlayerOne}
        />
        <div className="game-area" data-testid="game-area" onMouseMove={handleMouseMove}>
          <Paddle
            x={ownPaddleX}
            y={ownPaddleVisualY}
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
            color="rgb(245, 111, 28)"
          />
          <Paddle
            x={opponentPaddleX}
            y={opponentPaddleVisualY}
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
            color="rgb(28, 165, 245)"
          />
          <BallComponent
            x={ballPosition.x}
            y={ballPosition.y}
          />
        </div>
      </div>
      <h2>You are defending the bottom</h2>

    </div>
  );
};

export default GameScreen;