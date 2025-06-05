import {
    BALL_RADIUS,
    PADDLE_OFFSET_Y,
    GAME_HEIGHT,
    GAME_WIDTH,
    PADDLE_HEIGHT,
    PADDLE_WIDTH,
    INITIAL_BALL_SPEED,
} from '@shared/constants';
import { PlayerId, PlayerInfo, GameSession, GameState, Ball, Paddle, GameStateUpdatePayload } from '@shared/types';
import { Server as SocketIOServer } from 'socket.io';

const GAME_TICK_RATE = 1000 / 60;
const MAX_SCORE = 5; // Define MAX_SCORE for win condition (Step 7.1 will use this)

export class MatchmakingService {
    private waitingQueue: PlayerInfo[] = [];
    private gameSessions = new Map<string, GameSession>();
    private activeGameLoops = new Map<string, NodeJS.Timeout>();

    private _getInitialBallVelocity(serveToPlayer1?: boolean): { dx: number; dy: number } {
        let angle = Math.random() * (Math.PI / 2) - (Math.PI / 4);
        let dx = INITIAL_BALL_SPEED * Math.sin(angle);
        let dy = INITIAL_BALL_SPEED * Math.cos(angle);

        if (serveToPlayer1 === undefined) {
            dy = Math.random() > 0.5 ? dy : -dy;
        } else if (serveToPlayer1) {
            dy = Math.abs(dy);
        } else {
            dy = -Math.abs(dy);
        }
        dx = Math.random() > 0.5 ? dx : -dx;
        return { dx, dy };
    }

    // Step 5.3: Server-Side Post-Score Reset (already mostly here, just ensure it's called correctly)
    public resetAndServeBall(session: GameSession, scoredOnPlayerId?: PlayerId): void {
        session.state.ball.position = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
        let serveToPlayer1: boolean | undefined = undefined; // True if serving to P1 (bottom), False if serving to P2 (top)
        if (scoredOnPlayerId) {
            serveToPlayer1 = scoredOnPlayerId === session.bottomPlayerId;
        }
        session.state.ball.velocity = this._getInitialBallVelocity(serveToPlayer1);
    }


    public addPlayerToQueue(player: PlayerInfo): GameSession | null {
        // ... (no changes to this part from previous step)
        if (this.waitingQueue.some(p => p.id === player.id)) {
            return null;
        }

        this.waitingQueue.push(player);
        if (this.waitingQueue.length >= 2) {
            const player1 = this.waitingQueue.shift()!;
            const player2 = this.waitingQueue.shift()!;

            const initialBall: Ball = {
                position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
                velocity: { dx: 0, dy: 0 },
                radius: BALL_RADIUS
            };
            const player1Paddle: Paddle = { id: player1.id, x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
            const player2Paddle: Paddle = { id: player2.id, x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: PADDLE_OFFSET_Y, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
            console.log("--- INITIAL GAME STATE SETUP ---");
            console.log("CONSTANTS:", { GAME_WIDTH, GAME_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS, PADDLE_OFFSET_Y, INITIAL_BALL_SPEED });

            console.log("Player 1 (Bottom) Paddle Initial:", {
                id: player1Paddle.id,
                x: player1Paddle.x,
                y: player1Paddle.y, // This is its TOP edge
                width: player1Paddle.width,
                height: player1Paddle.height,
                calculatedBottomEdge: player1Paddle.y + player1Paddle.height
            });
            console.log("Player 2 (Top) Paddle Initial:", {
                id: player2Paddle.id,
                x: player2Paddle.x,
                y: player2Paddle.y, // This is its TOP edge
                width: player2Paddle.width,
                height: player2Paddle.height,
                calculatedBottomEdge: player2Paddle.y + player2Paddle.height
            });
            console.log("Ball Initial:", {
                posX: initialBall.position.x,
                posY: initialBall.position.y,
                radius: initialBall.radius,
                velDX: initialBall.velocity.dx, // Velocity will be set by resetAndServeBall
                velDY: initialBall.velocity.dy
            });
            console.log("---------------------------------");
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
                started: false,
                createdAt: new Date(),
            };
            this.gameSessions.set(gameSession.id, gameSession);
            this.resetAndServeBall(gameSession); // Initial serve

            return gameSession;
        }
        return null;
    }

    // ... (removePlayerFromQueue, getQueueLength, getSession, removeSession, findSessionByPlayerId, startGameLoop, stopGameLoop remain the same) ...
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
            this.stopGameLoop(sessionId);
            this.gameSessions.delete(sessionId);
        } else {
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
    public startGameLoop(sessionId: string, io: SocketIOServer): void {
        const session = this.getSession(sessionId);
        if (!session) {
            return;
        }
        if (this.activeGameLoops.has(sessionId)) {
            return;
        }

        session.started = true;
        const intervalId = setInterval(() => {
            this.gameTick(sessionId, io);
        }, GAME_TICK_RATE);

        this.activeGameLoops.set(sessionId, intervalId);
    }

    public stopGameLoop(sessionId: string): void {
        if (this.activeGameLoops.has(sessionId)) {
            clearInterval(this.activeGameLoops.get(sessionId)!);
            this.activeGameLoops.delete(sessionId);
            const session = this.getSession(sessionId);
            if (session) {
                session.started = false; // Mark session as not actively running its loop
            }
        }
    }

    private gameTick(sessionId: string, io: SocketIOServer): void {
        const session = this.getSession(sessionId);
        if (!session || !session.started || session.state.gameOver) { // Also check gameOver flag
            if (session && session.state.gameOver) {
                // Game is over, loop should be stopped by win condition logic
            } else {
                this.stopGameLoop(sessionId);
            }
            return;
        }

        const { ball, players, score } = session.state;
        const player1Paddle = players.find(p => p.id === session.bottomPlayerId)!; // Assumes P1 is bottom
        const player2Paddle = players.find(p => p.id === session.topPlayerId)!;   // Assumes P2 is top
 if (Math.abs(ball.position.y - player1Paddle.y) < 50 || Math.abs(ball.position.y - (player2Paddle.y + player2Paddle.height)) < 50) {
        }

        // 1. Update ball position
        ball.position.x += ball.velocity.dx;
        ball.position.y += ball.velocity.dy;

        // 2. Wall collision (Horizontal walls - top/bottom of screen)
        if (ball.position.y - ball.radius < 0 && ball.velocity.dy < 0) { // Hit top wall, moving up
            // This is a point for Player 1 (bottom defender)
            score[session.bottomPlayerId]++;
            this.resetAndServeBall(session, session.topPlayerId); // Serve to P2 (top player)
            // Check for win condition immediately after score
            if (score[session.bottomPlayerId] >= MAX_SCORE) {
                this.handleWin(session, session.bottomPlayerId, io);
                return; // Stop further processing in this tick
            }
        } else if (ball.position.y + ball.radius > GAME_HEIGHT && ball.velocity.dy > 0) { // Hit bottom wall, moving down
            // This is a point for Player 2 (top defender)
            score[session.topPlayerId]++;
            this.resetAndServeBall(session, session.bottomPlayerId); // Serve to P1 (bottom player)
            // Check for win condition immediately after score
            if (score[session.topPlayerId] >= MAX_SCORE) {
                this.handleWin(session, session.topPlayerId, io);
                return; // Stop further processing in this tick
            }
        }

        // Side wall bounces (left/right walls)
        if ((ball.position.x - ball.radius < 0 && ball.velocity.dx < 0) ||
            (ball.position.x + ball.radius > GAME_WIDTH && ball.velocity.dx > 0)) {
            ball.velocity.dx *= -1;
            // Ensure ball is within bounds after bounce
            if (ball.position.x - ball.radius < 0) ball.position.x = ball.radius;
            if (ball.position.x + ball.radius > GAME_WIDTH) ball.position.x = GAME_WIDTH - ball.radius;
        }


        // Step 5.1: Server-Side Paddle-Ball Collision
        // Check collision with player1's paddle (bottom)
        if (ball.velocity.dy > 0 && // Ball moving downwards
            ball.position.x + ball.radius >= player1Paddle.x &&
            ball.position.x - ball.radius <= player1Paddle.x + player1Paddle.width &&
            ball.position.y + ball.radius >= player1Paddle.y &&
            ball.position.y - ball.radius <= player1Paddle.y + player1Paddle.height) {
            
            ball.velocity.dy *= -1;
            ball.position.y = player1Paddle.y - ball.radius; // Adjust Y to prevent sticking
            // console.log(Session ${sessionId}: Ball hit P1 paddle.);
            // Phase 6 will refine bounce angle here
        }

        // Check collision with player2's paddle (top)
        else if (ball.velocity.dy < 0 && // Ball moving upwards
            ball.position.x + ball.radius >= player2Paddle.x &&
            ball.position.x - ball.radius <= player2Paddle.x + player2Paddle.width &&
            ball.position.y - ball.radius <= player2Paddle.y + player2Paddle.height && // ball bottom edge below paddle top edge
            ball.position.y + ball.radius >= player2Paddle.y) { // ball top edge above paddle bottom edge
            
            ball.velocity.dy *= -1;
            ball.position.y = player2Paddle.y + player2Paddle.height + ball.radius; // Adjust Y
            // console.log(Session ${sessionId}: Ball hit P2 paddle.);
            // Phase 6 will refine bounce angle here
        }


        // Broadcast GameStateUpdatePayload
        const paddlesUpdate: { [pId: string]: { x: number } } = {};
        players.forEach(paddle => {
            paddlesUpdate[paddle.id] = { x: paddle.x };
        });

        const gameStateUpdatePayload: GameStateUpdatePayload = {
            ball: { ...ball },
            paddles: paddlesUpdate,
            scores: { ...score }
        };

        io.to(sessionId).emit('gameStateUpdate', gameStateUpdatePayload);
    }

    // Helper for win condition (related to Step 7.1 but needed by 5.2)
    private handleWin(session: GameSession, winnerId: PlayerId, io: SocketIOServer) {
        session.state.gameOver = true;
        session.state.winner = winnerId;
        this.stopGameLoop(session.id); // Stop the game loop

        const winnerInfo = session.state.players.find(p => p.id === winnerId);


        // Step 7.1 will define the GameOverPayload and emit 'gameOver' event
        // For now, we just log and stop the loop. The final GameStateUpdate will show final scores.
        // io.to(session.id).emit('gameOver', { winnerId: winnerId, winnerName: winnerInfo?.name });
        
        // Send one final state update that might include the gameOver flag or winner
        // Or rely on a separate 'gameOver' event from Step 7.1
        const finalPaddlesUpdate: { [pId: string]: { x: number } } = {};
        session.state.players.forEach(paddle => {
            finalPaddlesUpdate[paddle.id] = { x: paddle.x };
        });
        const finalGameStateUpdate: GameStateUpdatePayload = {
            ball: { ...session.state.ball },
            paddles: finalPaddlesUpdate,
            scores: { ...session.state.score },
            // You might add gameOver and winner to this payload if your client expects it
            // or handle it via a dedicated 'gameOver' event in Step 7.1
        };
        io.to(session.id).emit('gameStateUpdate', finalGameStateUpdate); // Send final state

        // In a full Step 7.1, you'd emit a specific 'gameOver' event.
        // For now, stopping the loop and updating scores is the main effect for Phase 5.
    }
}

export const matchmakingService = new MatchmakingService();


