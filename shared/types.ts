export type PlayerId = string;
export interface PlayerInfo {
  id: PlayerId;
  name: string;
}
export interface JoinGamePayload { 
    playerName: string;
}

export interface Paddle {
    id: PlayerId;
    x: number;
    y: number; 
    width: number;
    height: number;
}
export interface Ball {
    position: { x: number; y: number };
    velocity: { dx: number; dy: number };
    radius: number;
}
export interface GameState {
    players: Paddle[];
    ball: Ball;
    score: { [playerId: PlayerId]: number }; 
    gameOver: boolean;
    winner?: PlayerId;
}
export interface GameSession {
 id: string;
 bottomPlayerId: PlayerId;
 topPlayerId: PlayerId;
    state: GameState;
    started: boolean;
    createdAt: Date;
}
export interface GameStartPayload{
    sessionId: string;
    opponent: PlayerInfo;
    self: PlayerInfo & { isPlayerOne: boolean };

}
export interface GameStateUpdatePayload {
     ball?: Ball,
      paddles: { [playerId: PlayerId]: { x: number } },
       scores?: { [playerId: PlayerId]: number } }
export enum SocketEvents {
    'gameStart',
    'gameStateUpdate',
    'paddleMove',
};
export interface PaddleMovePayload{
newx:number;
}