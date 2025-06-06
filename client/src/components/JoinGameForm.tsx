import { useState } from "react";
import { socketService } from "../services/socketService";
import { JoinGamePayload } from "@shared/types";
import "./Paddle.css";
function JoinGameForm() {
    const [playerName, setPlayerName] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (playerName.trim() === '') {
            alert("Please enter a valid name.");
            return;
        }
        socketService.emit('joinGame',playerName);
    };

    return (
        <div className="join-game-form">
            <h1>Play Online Pig-Pong Game</h1>
        <form onSubmit={handleSubmit} className="form">
            <input className="input"
                type="text"
                id="playerName"
                placeholder="name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required 
            />
            <button type="submit">Join Game</button>
        </form>
        </div>
    );
} 

export default JoinGameForm;