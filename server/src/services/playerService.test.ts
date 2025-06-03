import { PlayerService } from './playerService';
import { PlayerInfo } from '@shared/types';

describe('PlayerService', () => {
    let service: PlayerService;

    beforeEach(() => {
        service = new PlayerService();
    });

    describe('addPlayer', () => {
        it('should add a new player and return player info', () => {
            const result = service.addPlayer('player1', 'John');
            const expected: PlayerInfo = { id: 'player1', name: 'John' };
            
            expect(result).toEqual(expected);
            expect(service.getPlayer('player1')).toEqual(expected);
        });
    });

    describe('getPlayer', () => {
        it('should return undefined for non-existent player', () => {
            expect(service.getPlayer('nonexistent')).toBeUndefined();
        });

        it('should return player info for existing player', () => {
            const player = service.addPlayer('player1', 'John');
            expect(service.getPlayer('player1')).toEqual(player);
        });
    });

    describe('getAllPlayers', () => {
        it('should return empty array when no players exist', () => {
            expect(service.getAllPlayers()).toEqual([]);
        });

        it('should return all players in an array', () => {
            const player1 = service.addPlayer('player1', 'John');
            const player2 = service.addPlayer('player2', 'Jane');

            const allPlayers = service.getAllPlayers();
            
            expect(allPlayers).toHaveLength(2);
            expect(allPlayers).toContainEqual(player1);
            expect(allPlayers).toContainEqual(player2);
        });
    });

    describe('removePlayer', () => {
        it('should remove an existing player', () => {
            service.addPlayer('player1', 'John');
            service.removePlayer('player1');
            
            expect(service.getPlayer('player1')).toBeUndefined();
        });

        it('should not throw when removing non-existent player', () => {
            expect(() => service.removePlayer('nonexistent')).not.toThrow();
        });
    });
});