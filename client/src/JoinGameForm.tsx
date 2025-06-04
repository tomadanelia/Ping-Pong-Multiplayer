import { useState } from "react";
import { socketService } from "./services/socketService";
import { JoinGamePayload } from "@shared/types";
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
        <form onSubmit={handleSubmit} >
            <input 
                type="text"
                id="playerName"
                placeholder="Write name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required 
            />
            <button type="submit">Join Game</button>
        </form>
    );
} 

export default JoinGameForm;