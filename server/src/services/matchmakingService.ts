import { BALL_RADIUS, PADDLE_HEIGHT, PADDLE_WIDTH } from '@shared/constants';
import { PlayerId, PlayerInfo, GameSession, GameState, Ball, Paddle } from '@shared/types';

export class MatchmakingService {
    private waitingQueue: PlayerInfo[] = [];

    public addPlayerToQueue(player: PlayerInfo): GameSession | null {
        // Don't add if player is already in queue
        if (this.waitingQueue.some(p => p.id === player.id)) {
            return null;
        }

        this.waitingQueue.push(player);
        if (this.waitingQueue.length >= 2) {
            const player1 = this.waitingQueue.shift()!;
            const player2 = this.waitingQueue.shift()!;
            const initialBall:Ball={
                position: {x:250,y:250},
                velocity: {x:0,y:10},
                radius: BALL_RADIUS
            }
            const player1Paddle:Paddle={
                id:player1.id,
                x : 250,
                y: 5,
                width:PADDLE_WIDTH,
                height: PADDLE_HEIGHT
            }
              const player2Paddle:Paddle={
                id:player2.id,
                x : 250,
                y: 5,
                width:PADDLE_WIDTH,
                height: PADDLE_HEIGHT
            }
            const currentGameState: GameState = {
                players:[player1Paddle,player2Paddle],                
                ball: initialBall,
                score: {
                    [player1.id]: 0,
                    [player2.id]: 0
                },
                gameOver: false,
                winner: undefined
            };

            const gameSession: GameSession = {
                id: crypto.randomUUID(),
                bottomPlayerId: player1.id,
                topPlayerId: player2.id,
                state: currentGameState,
                started: false,
                createdAt: new Date(),
            };

            return gameSession;
        }

        return null;
    }

    public removePlayerFromQueue(playerId: PlayerId): void {
        this.waitingQueue = this.waitingQueue.filter(p => p.id !== playerId);
    }

    public getQueueLength(): number {
        return this.waitingQueue.length;
    }
}

export const matchmakingService = new MatchmakingService();