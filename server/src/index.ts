/**
 * Socket.IO multiplayer server for Pong game.
 * Handles player connections, matchmaking, game session creation, and disconnection logic.
 * 
 * Key events:
 * - `joinGame`: Player joins matchmaking queue.
 * - `disconnect`: Handles player leaving the game or queue.
 * 
 * Matchmaking is managed via `matchmakingService`, and player tracking via `playerService`.
 */
import express from 'express';
import { createServer } from 'http';
import { Server, Socket as ServerSocketIo } from 'socket.io'; // Renamed Socket to avoid conflict if needed
import { playerService } from './services/playerService';
import { matchmakingService } from './services/matchmakingService';
import { randomUUID } from 'crypto';
import { GameStartPayload, PlayerInfo } from '@shared/types'; 

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
 /**
     * Fired when a new client connects.
     * Sets up listeners for 'joinGame' and 'disconnect'.
     * 
     * @param {Socket} socket - The connected client socket.
     */
io.on('connection', (socket) => { 
    console.log(`Client connected: ${socket.id}`);
 /**
         * Adds the player to the matchmaking queue and starts a game if a match is found.
         * 
         * @event joinGame
         * @param {string} name - The player's chosen display name.
         * 
         * Emits:
         * - 'gameStart': when a match is successfully created.
         * - 'matchFailed': if an opponent disconnects before the game starts.
         */
    socket.on('joinGame', (name: string) => {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.error(`Invalid player name received from socket ${socket.id}: '${name}'`);
            // socket.emit('joinGameError', { message: 'Invalid player name provided.' });
            return;
        }

        const playerId = randomUUID();
        const player = playerService.addPlayer(playerId, name);
        socket.data.playerId = player.id; // Associate this socket instance with the player ID

        console.log(`Player ${player.name} (ID: ${player.id}, Socket: ${socket.id}) trying to join game.`);

        const gameSession = matchmakingService.addPlayerToQueue(player);

        if (gameSession) {
            console.log(`Match found. Session ID: ${gameSession.id}. Attempting to start game.`);

            const player1Info = playerService.getPlayer(gameSession.bottomPlayerId);
            const player2Info = playerService.getPlayer(gameSession.topPlayerId);

            if (!player1Info || !player2Info) {
                console.error(`Critical error: Player info not found for game session ${gameSession.id}. P1_ID: ${gameSession.bottomPlayerId}, P2_ID: ${gameSession.topPlayerId}. This session will be aborted.`);
                // Cleanup attempt: remove players from queue and the session itself
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
                    self: { ...player1Info, isPlayerOne: true } // bottomPlayer is considered Player One
                };
                player1Socket.emit('gameStart', gameStartPayloadP1);

                const gameStartPayloadP2: GameStartPayload = {
                    sessionId: gameSession.id,
                    opponent: player1Info,
                    self: { ...player2Info, isPlayerOne: false } 
                };
                player2Socket.emit('gameStart', gameStartPayloadP2);
            } else {
                console.error(`Could not find active sockets for one or both players in session ${gameSession.id}. Player1 Found: ${!!player1Socket}, Player2 Found: ${!!player2Socket}. This can happen if a player disconnects just as a match is being formed. Aborting session.`);
               
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
/**
         * Handles player disconnection.
         * Removes player from queue or active game session.
         * Notifies opponent if one existed.
         * 
         * @event disconnect
         * 
         * Emits (to opponent):
         * - 'opponentDisconnected': if the disconnected player was in a session.
         */
    socket.on('disconnect', () => {
        const disconnectedPlayerId = socket.data.playerId;

        if (disconnectedPlayerId) {
            const disconnectedPlayerInfo = playerService.getPlayer(disconnectedPlayerId);
            const playerName = disconnectedPlayerInfo ? disconnectedPlayerInfo.name : 'Unknown Player';
            playerService.removePlayer(disconnectedPlayerId);
            matchmakingService.removePlayerFromQueue(disconnectedPlayerId);
            const gameSession = matchmakingService.findSessionByPlayerId(disconnectedPlayerId);

            if (gameSession) {
                console.log(`${playerName} (ID: ${disconnectedPlayerId}) was in active game session ${gameSession.id}.`);
                const otherPlayerId = gameSession.bottomPlayerId === disconnectedPlayerId
                    ? gameSession.topPlayerId
                    : gameSession.bottomPlayerId;

                const otherPlayerInfo = playerService.getPlayer(otherPlayerId); // Get info for the remaining player

                if (otherPlayerInfo) {
                    let otherPlayerSocket: ServerSocketIo<any, any, any, SocketData> | undefined;
                    for (const [, connectedSocket] of io.sockets.sockets) {
                        if (connectedSocket.data.playerId === otherPlayerId) {
                            otherPlayerSocket = connectedSocket;
                            break;
                        }
                    }

                    if (otherPlayerSocket) {
                        // Notify the other player
                        otherPlayerSocket.emit('opponentDisconnected', {
                            opponentName: disconnectedPlayerInfo ? disconnectedPlayerInfo.name : 'Your opponent',
                            opponentId: disconnectedPlayerId
                        });
                        console.log(`Notified ${otherPlayerInfo.name} (ID: ${otherPlayerId}) in session ${gameSession.id} about opponent disconnection.`);
                    } else {
                        console.log(`Could not find socket for the remaining player ${otherPlayerInfo.name} (ID: ${otherPlayerId}) in session ${gameSession.id}. They might have disconnected simultaneously.`);
                    }
                } else {
                     console.warn(`Could not find PlayerInfo for the remaining player (ID: ${otherPlayerId}) in session ${gameSession.id}.`);
                }


                matchmakingService.removeSession(gameSession.id);
            } else {
                console.log(`${playerName} (ID: ${disconnectedPlayerId}) was not found in an active game session.`);
            }
        } else {
            console.log(`Client (Socket: ${socket.id}) disconnected. No playerId was associated with this socket, so no specific player cleanup performed.`);
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});