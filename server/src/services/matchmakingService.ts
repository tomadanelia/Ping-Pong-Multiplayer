import {
    BALL_RADIUS,
    PADDLE_OFFSET_Y,
    GAME_HEIGHT,
    GAME_WIDTH,
    PADDLE_HEIGHT,
    PADDLE_WIDTH,
    INITIAL_BALL_SPEED,
} from '@shared/constants';
import { PlayerId, PlayerInfo, GameSession, GameState, Ball, Paddle } from '@shared/types';
import { Server as SocketIOServer } from 'socket.io';

const GAME_TICK_RATE = 1000 / 60;
const MAX_SCORE = 5;

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

    /**
     * Resets the ball to the center and serves it in a direction based on the player who was scored on.
     * @param session Game session
     * @param scoredOnPlayerId Optional ID of the player who was scored on
     */
    public resetAndServeBall(session: GameSession, scoredOnPlayerId?: PlayerId): void {
        session.state.ball.position = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
        let serveToPlayer1: boolean | undefined = undefined;
        if (scoredOnPlayerId) {
            serveToPlayer1 = scoredOnPlayerId === session.bottomPlayerId;
        }
        session.state.ball.velocity = this._getInitialBallVelocity(serveToPlayer1);
    }

    /**
     * Adds a player to the matchmaking queue. If two players are available, creates a new game session.
     * @param player Player information
     * @returns GameSession or null
     */
    public addPlayerToQueue(player: PlayerInfo): GameSession | null {
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
                started: false,
                createdAt: new Date(),
            };
            this.gameSessions.set(gameSession.id, gameSession);
            this.resetAndServeBall(gameSession);
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
            this.stopGameLoop(sessionId);
            this.gameSessions.delete(sessionId);
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

    /**
     * Starts the game loop for a given session.
     * @param sessionId ID of the session
     * @param io Socket.io server instance
     */
    public startGameLoop(sessionId: string, io: SocketIOServer): void {
        const session = this.getSession(sessionId);
        if (!session || this.activeGameLoops.has(sessionId)) return;

        session.started = true;
        const intervalId = setInterval(() => {
            this.gameTick(sessionId, io);
        }, GAME_TICK_RATE);

        this.activeGameLoops.set(sessionId, intervalId);
    }

    /**
     * Stops the game loop for a given session.
     * @param sessionId ID of the session
     */
    public stopGameLoop(sessionId: string): void {
        if (this.activeGameLoops.has(sessionId)) {
            clearInterval(this.activeGameLoops.get(sessionId)!);
            this.activeGameLoops.delete(sessionId);
            const session = this.getSession(sessionId);
            if (session) {
                session.started = false;
            }
        }
    }

    private gameTick(sessionId: string, io: SocketIOServer): void {
        const session = this.getSession(sessionId);
        if (!session || !session.started || session.state.gameOver) {
            this.stopGameLoop(sessionId);
            return;
        }

        const { ball, players, score } = session.state;
        const player1Paddle = players.find(p => p.id === session.bottomPlayerId)!;
        const player2Paddle = players.find(p => p.id === session.topPlayerId)!;

        ball.position.x += ball.velocity.dx;
        ball.position.y += ball.velocity.dy;

        if (ball.position.y - ball.radius < 0 && ball.velocity.dy < 0) {
            score[session.bottomPlayerId]++;
            this.resetAndServeBall(session, session.topPlayerId);
            if (score[session.bottomPlayerId] >= MAX_SCORE) {
                this.handleWin(session, session.bottomPlayerId, io);
                return;
            }
        } else if (ball.position.y + ball.radius > GAME_HEIGHT && ball.velocity.dy > 0) {
            score[session.topPlayerId]++;
            this.resetAndServeBall(session, session.bottomPlayerId);
            if (score[session.topPlayerId] >= MAX_SCORE) {
                this.handleWin(session, session.topPlayerId, io);
                return;
            }
        }

        if ((ball.position.x - ball.radius < 0 && ball.velocity.dx < 0) ||
            (ball.position.x + ball.radius > GAME_WIDTH && ball.velocity.dx > 0)) {
            ball.velocity.dx *= -1;
            if (ball.position.x - ball.radius < 0) ball.position.x = ball.radius;
            if (ball.position.x + ball.radius > GAME_WIDTH) ball.position.x = GAME_WIDTH - ball.radius;
        }

        if (ball.velocity.dy > 0 &&
            ball.position.x + ball.radius >= player1Paddle.x &&
            ball.position.x - ball.radius <= player1Paddle.x + player1Paddle.width &&
            ball.position.y + ball.radius >= player1Paddle.y &&
            ball.position.y - ball.radius <= player1Paddle.y + player1Paddle.height) {

            ball.velocity.dy *= -1;
            ball.position.y = player1Paddle.y - ball.radius;
        } else if (ball.velocity.dy < 0 &&
            ball.position.x + ball.radius >= player2Paddle.x &&
            ball.position.x - ball.radius <= player2Paddle.x + player2Paddle.width &&
            ball.position.y - ball.radius <= player2Paddle.y + player2Paddle.height &&
            ball.position.y + ball.radius >= player2Paddle.y) {

            ball.velocity.dy *= -1;
            ball.position.y = player2Paddle.y + player2Paddle.height + ball.radius;
        }

        const payload = {
            sessionId: session.id,
            state: session.state
        };
        io.to(session.id).emit("gameStateUpdate", payload);
    }

    private handleWin(session: GameSession, winnerId: PlayerId, io: SocketIOServer): void {
        session.state.gameOver = true;
        session.state.winner = winnerId;
        const payload = {
            sessionId: session.id,
            winnerId: winnerId
        };
        io.to(session.id).emit("gameOver", payload);
        this.stopGameLoop(session.id);
    }
}
export const matchmakingService = new MatchmakingService();


