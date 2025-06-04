import { BALL_RADIUS, PADDLE_OFFSET_Y,GAME_HEIGHT, GAME_WIDTH, PADDLE_HEIGHT, PADDLE_WIDTH } from '@shared/constants';
import { PlayerId, PlayerInfo, GameSession, GameState, Ball, Paddle } from '@shared/types';

export class MatchmakingService {
    private waitingQueue: PlayerInfo[] = [];
    private gameSessions= new Map<string,GameSession>
    
    /**
     * Adds a player to the matchmaking queue and starts a game session if two players are available.
     * @param {PlayerInfo} player - The player to be added to the queue.
     * @returns {GameSession | null} A new game session if two players are matched, or null otherwise.
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
            velocity: { dx: 0, dy: 10 }, 
            radius: BALL_RADIUS
};
            const player1Paddle:Paddle={
                id:player1.id,
                x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
               y: GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT,
                width:PADDLE_WIDTH,
                height: PADDLE_HEIGHT
            }
              const player2Paddle:Paddle={
                id:player2.id,
                x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, // Centered
                y: PADDLE_OFFSET_Y, // Top paddle
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
            this.gameSessions.set(gameSession.id,gameSession);
            return gameSession;
        }

        return null;
    }
 /**
     * Removes a player from the matchmaking queue.
     * @param {PlayerId} playerId - The ID of the player to remove.
     */
    public removePlayerFromQueue(playerId: PlayerId): void {
        this.waitingQueue = this.waitingQueue.filter(p => p.id !== playerId);
    }
/**
     * Returns the number of players currently in the matchmaking queue.
     * @returns {number} The length of the queue.
     */
    public getQueueLength(): number {
        return this.waitingQueue.length;
    }
    /**
     * Retrieves a game session by its ID.
     * @param {string} sessionId - The ID of the session to retrieve.
     * @returns {GameSession | undefined} The game session if found, or undefined.
     */
    public getSession(sessionId: string): GameSession | undefined {
        return this.gameSessions.get(sessionId);
    }
      /**
     * Removes a game session by its ID.
     * @param {string} sessionId - The ID of the session to remove.
     * @returns {boolean} True if the session existed and was removed, false otherwise.
     */

    public removeSession(sessionId: string): boolean {
        const sessionExisted = this.gameSessions.has(sessionId);
        if (sessionExisted) {
            this.gameSessions.delete(sessionId);
            console.log(`MatchmakingService: Session ${sessionId} removed. Active sessions: ${this.gameSessions.size}`);
        } else {
            console.warn(`MatchmakingService: Attempted to remove non-existent session ${sessionId}`);
        }
        return sessionExisted; 

    }
      /**
     * Finds a game session that includes the given player ID.
     * @param {PlayerId} playerId - The ID of the player to look for.
     * @returns {GameSession | undefined} The game session the player is part of, or undefined if not found.
     */
    public findSessionByPlayerId(playerId: PlayerId): GameSession | undefined {
        for (const session of this.gameSessions.values()) {
            if (session.bottomPlayerId === playerId || session.topPlayerId === playerId) {
                return session;
            }
        }
        return undefined;
    }

}

export const matchmakingService = new MatchmakingService();