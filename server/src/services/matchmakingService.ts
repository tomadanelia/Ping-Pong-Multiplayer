import {
    BALL_RADIUS,
    PADDLE_OFFSET_Y,
    GAME_HEIGHT,
    GAME_WIDTH,
    PADDLE_HEIGHT,
    PADDLE_WIDTH,
} from '@shared/constants';
import { PlayerId, PlayerInfo, GameSession, GameState, Ball, Paddle, GameStateUpdatePayload } from '@shared/types';
import { Server as SocketIOServer } from 'socket.io'; // Import Server type for io instance

const GAME_TICK_RATE = 1000 / 60; // Approx 60 FPS

export class MatchmakingService {
    private waitingQueue: PlayerInfo[] = [];
    private gameSessions = new Map<string, GameSession>();
    private activeGameLoops = new Map<string, NodeJS.Timeout>();

    public addPlayerToQueue(player: PlayerInfo): GameSession | null {
        if (this.waitingQueue.some(p => p.id === player.id)) {
            console.warn(`Player ${player.id} already in queue.`);
            return null;
        }

        this.waitingQueue.push(player);
        if (this.waitingQueue.length >= 2) {
            const player1 = this.waitingQueue.shift()!;
            const player2 = this.waitingQueue.shift()!;

            // Initial Ball State - Step 4.1: Initialize session.gameState.ball
            const initialBallVelocity = { // Simple initial velocity, Step 4.2 will refine serve
                dx: Math.random() > 0.5 ? 3 : -3, // Random horizontal direction
                dy: Math.random() > 0.5 ? 3 : -3  // Random vertical direction
            };

            const initialBall: Ball = {
                position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
                velocity: initialBallVelocity,
                radius: BALL_RADIUS
            };

            const player1Paddle: Paddle = {
                id: player1.id,
                x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
                y: GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT,
                width: PADDLE_WIDTH,
                height: PADDLE_HEIGHT
            };
            const player2Paddle: Paddle = {
                id: player2.id,
                x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
                y: PADDLE_OFFSET_Y,
                width: PADDLE_WIDTH,
                height: PADDLE_HEIGHT
            };

            const currentGameState: GameState = {
                players: [player1Paddle, player2Paddle],
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
                started: false, // Will be set to true when loop starts
                createdAt: new Date(),
            };
            this.gameSessions.set(gameSession.id, gameSession);
            console.log(`MatchmakingService: Session ${gameSession.id} created for ${player1.name} and ${player2.name}.`);
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

    public getSession(sessionId: string): GameSession | undefined {
        return this.gameSessions.get(sessionId);
    }

    public removeSession(sessionId: string): boolean {
        const sessionExisted = this.gameSessions.has(sessionId);
        if (sessionExisted) {
            this.stopGameLoop(sessionId); // Stop loop before deleting session
            this.gameSessions.delete(sessionId);
            console.log(`MatchmakingService: Session ${sessionId} removed. Active sessions: ${this.gameSessions.size}`);
        } else {
            console.warn(`MatchmakingService: Attempted to remove non-existent session ${sessionId}`);
        }
        return sessionExisted;
    }

    public findSessionByPlayerId(playerId: PlayerId): GameSession | undefined {
        for (const session of this.gameSessions.values()) {
            if (session.bottomPlayerId === playerId || session.topPlayerId === playerId) {
                return session;
            }
        }
        return undefined;
    }

    // --- Game Loop Logic ---
    public startGameLoop(sessionId: string, io: SocketIOServer): void {
        const session = this.getSession(sessionId);
        if (!session) {
            console.error(`startGameLoop: Session ${sessionId} not found.`);
            return;
        }
        if (this.activeGameLoops.has(sessionId)) {
            console.warn(`startGameLoop: Loop already active for session ${sessionId}.`);
            return;
        }

        session.started = true; // Mark session as officially started
        const intervalId = setInterval(() => {
            this.gameTick(sessionId, io);
        }, GAME_TICK_RATE);

        this.activeGameLoops.set(sessionId, intervalId);
        console.log(`MatchmakingService: Game loop started for session ${sessionId}.`);
    }

    public stopGameLoop(sessionId: string): void {
        if (this.activeGameLoops.has(sessionId)) {
            clearInterval(this.activeGameLoops.get(sessionId)!);
            this.activeGameLoops.delete(sessionId);
            const session = this.getSession(sessionId);
            if (session) {
                session.started = false;
            }
            console.log(`MatchmakingService: Game loop stopped for session ${sessionId}.`);
        }
    }

    private gameTick(sessionId: string, io: SocketIOServer): void {
        const session = this.getSession(sessionId);
        if (!session || !session.started) {
            // If session is somehow gone or not marked as started, stop the loop
            console.warn(`gameTick: Session ${sessionId} not found or not started. Stopping loop.`);
            this.stopGameLoop(sessionId);
            return;
        }

        // 1. Update ball position
        session.state.ball.position.x += session.state.ball.velocity.dx;
        session.state.ball.position.y += session.state.ball.velocity.dy;

        // 2. Wall collision logic (will be expanded in Step 4.2)
        // For now, basic boundary checks without bounce for simplicity, will be added in 4.2
        // if (session.state.ball.position.y - session.state.ball.radius < 0 || 
        //     session.state.ball.position.y + session.state.ball.radius > GAME_HEIGHT) {
        //     session.state.ball.velocity.dy *= -1; 
        // }
        // if (session.state.ball.position.x - session.state.ball.radius < 0 ||
        //     session.state.ball.position.x + session.state.ball.radius > GAME_WIDTH) {
        //     // For Pong, horizontal walls are goals or side bounces depending on setup
        //     // session.state.ball.velocity.dx *= -1; // Simple side bounce for now
        // }


        // 3. Paddle collision logic (Step 5.1)
        // 4. Scoring logic (Step 5.2)

        // 5. Broadcast GameStateUpdatePayload
        const paddlesUpdate: { [pId: string]: { x: number } } = {};
        session.state.players.forEach(paddle => {
            paddlesUpdate[paddle.id] = { x: paddle.x };
        });

        const gameStateUpdatePayload: GameStateUpdatePayload = {
            ball: { ...session.state.ball }, 
            paddles: paddlesUpdate,
            scores: { ...session.state.score } 
        };

        io.to(sessionId).emit('gameStateUpdate', gameStateUpdatePayload);
    }
}

export const matchmakingService = new MatchmakingService();