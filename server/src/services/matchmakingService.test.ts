import { MatchmakingService } from './matchmakingService';
import { PlayerInfo, GameSession, Paddle } from '@shared/types';
import { 
    GAME_HEIGHT, 
    GAME_WIDTH, 
    PADDLE_HEIGHT, 
    PADDLE_OFFSET_Y, 
    PADDLE_WIDTH, 
    BALL_RADIUS, 
    INITIAL_BALL_SPEED
} from '@shared/constants';

const mockRandomUUID = jest.fn();
global.crypto = {
    ...global.crypto,
    randomUUID: mockRandomUUID,
};

describe('MatchmakingService', () => {
    let service: MatchmakingService;
    
    beforeEach(() => {
        service = new MatchmakingService();
        mockRandomUUID.mockClear();
    });

    const createPlayer = (id: string, name: string): PlayerInfo => ({ 
        id, 
        name 
    });

    describe('addPlayerToQueue', () => {
        it('should add player to queue', () => {
            const player = createPlayer('1', 'Test Player');
            service.addPlayerToQueue(player);
            expect(service.getQueueLength()).toBe(1);
        });

        it('should not add the same player to the queue twice', () => {
            const player1 = createPlayer('p1', 'Alice');
            service.addPlayerToQueue(player1);
            const result = service.addPlayerToQueue(player1);

            expect(result).toBeNull();
            expect(service.getQueueLength()).toBe(1);
        });

        it('should create and return a game session when two players are added', () => {
            mockRandomUUID.mockReturnValue('session-123');
            const player1 = createPlayer('p1', 'Alice');
            const player2 = createPlayer('p2', 'Bob');

            service.addPlayerToQueue(player1);
            const gameSession = service.addPlayerToQueue(player2);

            expect(gameSession).toBeTruthy();
            expect(gameSession?.id).toBe('session-123');
            expect(gameSession?.bottomPlayerId).toBe(player1.id);
            expect(gameSession?.topPlayerId).toBe(player2.id);
            expect(gameSession?.started).toBe(false);
            
            // Ball verification
            const ball = gameSession?.state.ball;
            expect(ball?.position).toEqual({ 
                x: GAME_WIDTH / 2, 
                y: GAME_HEIGHT / 2 
            });
            // Verify ball velocity is within expected ranges
            expect(Math.abs(ball!.velocity.dx)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
            expect(Math.abs(ball!.velocity.dy)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
            expect(ball?.radius).toBe(BALL_RADIUS);

            // Score verification
            expect(gameSession?.state.score[player1.id]).toBe(0);
            expect(gameSession?.state.score[player2.id]).toBe(0);
        });
    });

    describe('removePlayerFromQueue', () => {
        it('should remove player from queue', () => {
            const player = createPlayer('1', 'Test');
            service.addPlayerToQueue(player);
            service.removePlayerFromQueue(player.id);
            expect(service.getQueueLength()).toBe(0);
        });

        it('should handle non-existent player removal', () => {
            service.removePlayerFromQueue('nonexistent');
            expect(service.getQueueLength()).toBe(0);
        });
    });

    describe('getSession', () => {
        it('should return session by id', () => {
            mockRandomUUID.mockReturnValue('test-session');
            const p1 = createPlayer('1', 'Alice');
            const p2 = createPlayer('2', 'Bob');
            
            service.addPlayerToQueue(p1);
            const session = service.addPlayerToQueue(p2);
            
            expect(service.getSession('test-session')).toEqual(session);
        });

        it('should return undefined for non-existent session', () => {
            expect(service.getSession('fake-id')).toBeUndefined();
        });
    });

    describe('findSessionByPlayerId', () => {
        it('should find session by player id', () => {
            mockRandomUUID.mockReturnValue('test-session');
            const p1 = createPlayer('1', 'Alice');
            const p2 = createPlayer('2', 'Bob');
            
            service.addPlayerToQueue(p1);
            const session = service.addPlayerToQueue(p2);
            
            expect(service.findSessionByPlayerId(p1.id)).toEqual(session);
            expect(service.findSessionByPlayerId(p2.id)).toEqual(session);
        });

        it('should return undefined for non-existent player', () => {
            expect(service.findSessionByPlayerId('fake-id')).toBeUndefined();
        });
    });
    describe("resetandserveball",()=>{
        it('should serve ball with correct velocity when serving to Player 1', () => {
            // Setup
            const player1 = createPlayer('p1', 'Alice');
            const player2 = createPlayer('p2', 'Bob');
            service.addPlayerToQueue(player1);
            const session = service.addPlayerToQueue(player2)!;
            
            // Test serving to Player 1
            service.resetAndServeBall(session, session.topPlayerId);
            
            // Verify
            const ball = session.state.ball;
            expect(ball.velocity.dy).toBeLessThan(0); // Should move down
            expect(Math.abs(ball.velocity.dx)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
            expect(Math.abs(ball.velocity.dy)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
        });
        it('should serve ball with correct velocity when serving to Player 2', () => {
            const player1 = createPlayer('p1', 'Alice');
            const player2 = createPlayer('p2', 'Bob');
            service.addPlayerToQueue(player1);
            const session = service.addPlayerToQueue(player2)!;
            service.resetAndServeBall(session,session.bottomPlayerId);
            expect(session.state.ball.velocity.dy).toBeGreaterThan(0);
            expect(Math.abs(session.state.ball.velocity.dx)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
            expect(Math.abs(session.state.ball.velocity.dy)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
        });

        // Test initial serve (undefined case)
        it('should serve ball with random direction when no player is specified', () => {
            const player1 = createPlayer('p1', 'Alice');
            const player2 = createPlayer('p2', 'Bob');
            service.addPlayerToQueue(player1);
            const session = service.addPlayerToQueue(player2)!;
            
            // Initial serve (no scoredOnPlayerId)
            service.resetAndServeBall(session);
            
            const ball = session.state.ball;
            // dy can be positive or negative
            expect(Math.abs(ball.velocity.dy)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
            // dx can be positive or negative
            expect(Math.abs(ball.velocity.dx)).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
            // Total velocity should not exceed INITIAL_BALL_SPEED
            const totalVelocity = Math.sqrt(
                ball.velocity.dx * ball.velocity.dx + 
                ball.velocity.dy * ball.velocity.dy
            );
            expect(totalVelocity).toBeLessThanOrEqual(INITIAL_BALL_SPEED);
        });
    });
    
    

});