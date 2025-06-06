import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private readonly serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = io(this.serverUrl);

            this.socket.on('connect', () => {
                console.log('Connected to server');
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                reject(error);
            });
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('Disconnected from server');
        }
    }

    on<T>(eventName: string, callback: (data: T) => void): void {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }
        this.socket.on(eventName, callback);
    }

    emit<T>(eventName: string, data: T): void {
        if (!this.socket) {
            throw new Error('Socket not connected');
        }
        this.socket.emit(eventName, data);
    }
}

export const socketService = new SocketService();