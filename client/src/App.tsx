// ... (imports and other state)
import "./App.css";
import { useEffect, useState } from "react";
import GameScreen from "./components/GameScreen";
import JoinGameForm from "./components/JoinGameForm";
import { socketService } from "./services/socketService";

function App() {
  const [view, setView] = useState<'joining' | 'in_game' | 'game_over'>('joining');
  const [sessionId, setSessionId] = useState<string>("");
  const [self, setSelf] = useState<{ id: string; name: string; isPlayerOne: boolean } | null>(null); // self can be null initially
  const [opponentInfo, setOpponentinfo] = useState<{ id: string; name: string }>({ id: "", name: "" });

  useEffect(() => {
    const initConnection = async () => {
      try {
        await socketService.connect();

        socketService.on('connect', () => {
          console.log('✅ Socket connected (frontend)');
        });

        socketService.on('gameStart', (data: {
          sessionId: string;
          self: { id: string; name: string; isPlayerOne: boolean };
          opponent: { id: string; name: string };
        }) => {
          setSessionId(data.sessionId);
          setSelf(data.self);
          setOpponentinfo(data.opponent);
          setView('in_game');
        });

        socketService.on('disconnect', () => {
          console.log('❌ Socket disconnected (frontend)');
          
          setView('joining'); 
          setSelf(null); 
           setSessionId(""); 
          setOpponentinfo({id:"", name:""});
        });

      } catch (error) {
        console.error('Failed to connect to socket:', error);
      }
    };

    initConnection();

    return () => {
      socketService.disconnect();
    };
  }, []);


  return (
    <div className="root">
      {view === 'joining' &&<div className="joingameform"><JoinGameForm /></div>}
      {view === "in_game" && self && ( 
        <GameScreen
          sessionId={sessionId}
          selfInfo={self} 
          opponentInfo={opponentInfo}
        />
      )}    </div>
  )
}

export default App;


