import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { playerService } from './services/playerService';
import { randomUUID } from 'crypto';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // Vite's default port
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
    res.send('Pong server is running!');
});
import { JoinGamePayload } from '@shared/types';
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Handle join game event for this specific socket/player
    socket.on('joinGame', (name: string) => {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.error('Invalid player name:', name);
            return;
        }
        const id = randomUUID();
        playerService.addPlayer(id, name);
        console.log(`Player joined: ${name} with ID: ${id}`);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});


httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});