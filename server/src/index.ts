/**
 * Socket.IO multiplayer server for Pong game.
 * Handles matchmaking, game session initialization, paddle movement, and disconnections.
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
    PaddleMovePayload
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
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
    res.send('Pong server is running!');
});

/**
 * Handles socket connections, including matchmaking, paddle movement, and disconnections.
 */
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    /**
     * Handles a player joining the game queue.
     * Initializes player, attempts matchmaking, and starts game session if matched.
     * @param name - The name of the joining player
     */
    socket.on('joinGame', (name: string) => {
        if (!name || typeof name !== 'string' || name.trim() === '') return;

        const playerId = randomUUID();
        const player = playerService.addPlayer(playerId, name);
        socket.data.playerId = player.id;

        const gameSession = matchmakingService.addPlayerToQueue(player);

        if (gameSession) {
            const player1Info = playerService.getPlayer(gameSession.bottomPlayerId);
            const player2Info = playerService.getPlayer(gameSession.topPlayerId);

            if (!player1Info || !player2Info) {
                matchmakingService.removePlayerFromQueue(gameSession.bottomPlayerId);
                matchmakingService.removePlayerFromQueue(gameSession.topPlayerId);
                matchmakingService.removeSession(gameSession.id);
                return;
            }

            let player1Socket: ServerSocketIo<any, any, any, SocketData> | undefined;
            let player2Socket: ServerSocketIo<any, any, any, SocketData> | undefined;

            for (const [, connectedSocket] of io.sockets.sockets) {
                if (connectedSocket.data.playerId === player1Info.id) player1Socket = connectedSocket;
                if (connectedSocket.data.playerId === player2Info.id) player2Socket = connectedSocket;
                if (player1Socket && player2Socket) break;
            }

            if (player1Socket && player2Socket) {
                player1Socket.join(gameSession.id);
                player2Socket.join(gameSession.id);

                const gameStartPayloadP1: GameStartPayload = {
                    self: { ...player1Info, isPlayerOne: true },
                    opponent: player2Info,
                    sessionId: gameSession.id
                };
                player1Socket.emit('gameStart', gameStartPayloadP1);

                const gameStartPayloadP2: GameStartPayload = {
                    self: { ...player2Info, isPlayerOne: false },
                    opponent: player1Info,
                    sessionId: gameSession.id
                };
                player2Socket.emit('gameStart', gameStartPayloadP2);

                matchmakingService.startGameLoop(gameSession.id, io);
            } else {
                matchmakingService.removePlayerFromQueue(player1Info.id);
                matchmakingService.removePlayerFromQueue(player2Info.id);
                matchmakingService.removeSession(gameSession.id);

                const notifyMatchFailure = (
                    pSocket: ServerSocketIo<any, any, any, SocketData> | undefined,
                    pInfo: PlayerInfo | undefined
                ) => {
                    if (pSocket && pInfo && pSocket.id === socket.id && pSocket.data.playerId === pInfo.id) {
                        pSocket.emit('matchFailed', {
                            message: 'Failed to connect with opponent. Please try joining again.'
                        });
                    }
                };
                notifyMatchFailure(player1Socket, player1Info);
                notifyMatchFailure(player2Socket, player2Info);
            }
        }
    });

    /**
     * Updates paddle position of the player and stores it in the session state.
     * Actual broadcasting is handled in the main game loop.
     * @param payload - Contains new x-coordinate of the paddle
     */
    socket.on('paddleMove', (payload: PaddleMovePayload) => {
        const playerId = socket.data.playerId;
        if (!playerId) return;

        const session = matchmakingService.findSessionByPlayerId(playerId);
        if (!session || !session.started) return;

        const validatedX = Math.max(0, Math.min(payload.newx, GAME_WIDTH - PADDLE_WIDTH));
        const playerPaddle = session.state.players.find(p => p.id === playerId);
        if (playerPaddle) playerPaddle.x = validatedX;
    });

    /**
     * Handles client disconnection. Cleans up queue/session and notifies opponent.
     */
    socket.on('disconnect', () => {
        const disconnectedPlayerId = socket.data.playerId;

        if (disconnectedPlayerId) {
            const disconnectedPlayerInfo = playerService.getPlayer(disconnectedPlayerId);
            const session = matchmakingService.findSessionByPlayerId(disconnectedPlayerId);

            if (session) {
                socket.to(session.id).emit('opponentDisconnected', {
                    opponentName: disconnectedPlayerInfo?.name || 'Your opponent',
                    opponentId: disconnectedPlayerId
                });
                matchmakingService.removeSession(session.id);
            }

            playerService.removePlayer(disconnectedPlayerId);
            matchmakingService.removePlayerFromQueue(disconnectedPlayerId);
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
