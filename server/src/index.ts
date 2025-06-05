// server/src/index.ts
/**
 * Socket.IO multiplayer server for Pong game.
 * Handles player connections, matchmaking, game session creation, and disconnection logic.
 *
 * Key events:
 * - `joinGame`: Player joins matchmaking queue.
 * - `paddleMove`: Player moves their paddle. // New
 * - `disconnect`: Handles player leaving the game or queue.
 *
 * Matchmaking is managed via `matchmakingService`, and player tracking via `playerService`.
 */
import express from 'express';
import { createServer } from 'http';
import { Server, Socket as ServerSocketIo } from 'socket.io';
import { playerService } from './services/playerService';
import { matchmakingService } from './services/matchmakingService';
import { randomUUID } from 'crypto';

import {
    GameStartPayload,
    PlayerInfo,
    PaddleMovePayload,         
    GameStateUpdatePayload     
} from '@shared/types';
import {
    GAME_WIDTH,                
    PADDLE_WIDTH               
} from '@shared/constants';

interface SocketData {
    playerId?: string;
}

const app = express();
const httpServer = createServer(app);

const io = new Server<any, any, any, SocketData>(httpServer, {
    cors: {
        origin: "http://localhost:5173", // Vite's default port
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
    res.send('Pong server is running!');
});

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinGame', (name: string) => {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.error(`Invalid player name received from socket ${socket.id}: '${name}'`);
            return;
        }

        const playerId = randomUUID(); 
        const player = playerService.addPlayer(playerId, name); 
        socket.data.playerId = player.id;

        console.log(`Player ${player.name} (ID: ${player.id}, Socket: ${socket.id}) trying to join game.`);

        const gameSession = matchmakingService.addPlayerToQueue(player);

        if (gameSession) {
            console.log(`Match found. Session ID: ${gameSession.id}. Attempting to start game.`);

            const player1Info = playerService.getPlayer(gameSession.bottomPlayerId);
            const player2Info = playerService.getPlayer(gameSession.topPlayerId);

            if (!player1Info || !player2Info) {
                console.error(`Critical error: Player info not found for game session ${gameSession.id}. P1_ID: ${gameSession.bottomPlayerId}, P2_ID: ${gameSession.topPlayerId}. This session will be aborted.`);
                matchmakingService.removePlayerFromQueue(gameSession.bottomPlayerId);
                matchmakingService.removePlayerFromQueue(gameSession.topPlayerId);
                matchmakingService.removeSession(gameSession.id);
                return;
            }

            let player1Socket: ServerSocketIo<any, any, any, SocketData> | undefined;
            let player2Socket: ServerSocketIo<any, any, any, SocketData> | undefined;

            for (const [, connectedSocket] of io.sockets.sockets) {
                if (connectedSocket.data.playerId === player1Info.id) {
                    player1Socket = connectedSocket;
                }
                if (connectedSocket.data.playerId === player2Info.id) {
                    player2Socket = connectedSocket;
                }
                if (player1Socket && player2Socket) {
                    break;
                }
            }

            if (player1Socket && player2Socket) {
                player1Socket.join(gameSession.id);
                player2Socket.join(gameSession.id);
                console.log(`Sockets ${player1Socket.id} (P1: ${player1Info.name}) and ${player2Socket.id} (P2: ${player2Info.name}) joined room ${gameSession.id}.`);

                const gameStartPayloadP1: GameStartPayload = {
                    sessionId: gameSession.id,
                    opponent: player2Info,
                    self: { ...player1Info, isPlayerOne: true }
                };
                player1Socket.emit('gameStart', gameStartPayloadP1);

                const gameStartPayloadP2: GameStartPayload = {
                    sessionId: gameSession.id,
                    opponent: player1Info,
                    self: { ...player2Info, isPlayerOne: false }
                };
                player2Socket.emit('gameStart', gameStartPayloadP2);

               
            } else {
                console.error(`Could not find active sockets for one or both players in session ${gameSession.id}. Player1 Found: ${!!player1Socket}, Player2 Found: ${!!player2Socket}. Aborting session.`);
                matchmakingService.removePlayerFromQueue(player1Info.id);
                matchmakingService.removePlayerFromQueue(player2Info.id);
                matchmakingService.removeSession(gameSession.id);
                console.log(`Cleaned up session ${gameSession.id} and associated players from queue due to missing sockets.`);
                
                const notifyMatchFailure = (pSocket: ServerSocketIo<any, any, any, SocketData> | undefined, pInfo: PlayerInfo | undefined) => {
                    if (pSocket && pInfo && pSocket.id === socket.id && pSocket.data.playerId === pInfo.id) { 
                        pSocket.emit('matchFailed', { message: 'Failed to connect with opponent. Please try joining again.' });
                    }
                };
                notifyMatchFailure(player1Socket, player1Info);
                notifyMatchFailure(player2Socket, player2Info);
            }
        } else {
            console.log(`Player ${player.name} (ID: ${player.id}) was added to the matchmaking queue. Waiting for an opponent.`);
        }
    });

    socket.on('paddleMove', (payload: PaddleMovePayload) => {
        const playerId = socket.data.playerId;

        if (!playerId) {
            console.error(`paddleMove event from socket ${socket.id} without associated playerId.`);
            socket.emit('gameError', { message: 'Player ID not found, cannot process paddle move.' });
            return;
        }

        const session = matchmakingService.findSessionByPlayerId(playerId);

        if (!session) {
            console.warn(`paddleMove event from player ${playerId} (socket ${socket.id}) but player not in an active session. They might have disconnected or session ended.`);
            socket.emit('gameError', { message: 'Not in an active game session.' });
            return;
        }

        const validatedX = Math.max(0, Math.min(payload.newx, GAME_WIDTH - PADDLE_WIDTH));
        const playerPaddle = session.state.players.find(p => p.id === playerId);

        if (playerPaddle) {
            playerPaddle.x = validatedX;
        } else {
            console.error(`Critical: Could not find paddle for player ${playerId} in session ${session.id} during paddleMove.`);
            return;
        }
        const paddlesUpdate: { [pId: string]: { x: number } } = {};
        session.state.players.forEach(paddle => {
            paddlesUpdate[paddle.id] = { x: paddle.x };
        });

        const gameStateUpdatePayload: GameStateUpdatePayload = {
            paddles: paddlesUpdate,
        };

        io.to(session.id).emit('gameStateUpdate', gameStateUpdatePayload);
    });

    socket.on('disconnect', () => {
        const disconnectedPlayerId = socket.data.playerId;

        if (disconnectedPlayerId) {
            const disconnectedPlayerInfo = playerService.getPlayer(disconnectedPlayerId);
            const playerName = disconnectedPlayerInfo ? disconnectedPlayerInfo.name : 'Unknown Player';
            
            console.log(`Player ${playerName} (ID: ${disconnectedPlayerId}, Socket: ${socket.id}) disconnected.`);

            playerService.removePlayer(disconnectedPlayerId);
            matchmakingService.removePlayerFromQueue(disconnectedPlayerId);
            const gameSession = matchmakingService.findSessionByPlayerId(disconnectedPlayerId); // This might not find it if player1/2Id are stale after one disconnects

            if (gameSession) {
                console.log(`${playerName} (ID: ${disconnectedPlayerId}) was in active game session ${gameSession.id}. Notifying opponent and cleaning up session.`);
                
                const otherPlayerId = gameSession.bottomPlayerId === disconnectedPlayerId
                    ? gameSession.topPlayerId
                    : gameSession.bottomPlayerId;

                // Notify the other player
                // We use io.to(gameSession.id) which will reach the other player if they are still in the room
                // The client will handle the 'opponentDisconnected' event.
                socket.to(gameSession.id).emit('opponentDisconnected', { // Emit to others in the room
                    opponentName: disconnectedPlayerInfo ? disconnectedPlayerInfo.name : 'Your opponent',
                    opponentId: disconnectedPlayerId
                });
                
                console.log(`Notified other player in session ${gameSession.id} about ${playerName}'s disconnection.`);
                
                // Clean up the session
                matchmakingService.removeSession(gameSession.id);
            } else {
                console.log(`${playerName} (ID: ${disconnectedPlayerId}) was not in an active game session at time of full disconnect processing (or session already cleaned up).`);
            }
        } else {
            console.log(`Client (Socket: ${socket.id}) disconnected. No playerId was associated, so no specific player cleanup performed.`);
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});