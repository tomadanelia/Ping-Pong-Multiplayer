
import { useEffect, useState } from 'react'
import './App.css'
import { socketService } from './services/socketService';
import JoinGameForm from './JoinGameForm';

function App() {
      const [view, setView] = useState<'joining' | 'in_game' | 'game_over'>('joining');
   useEffect(() => {
    const initConnection = async () => {
      try {
        await socketService.connect();
        
        socketService.on('connect', () => {
          console.log('✅ Socket connected (frontend)');
        });

        socketService.on('disconnect', () => {
          console.log('❌ Socket disconnected (frontend)');
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
    <>
      {view=='joining'&&<JoinGameForm></JoinGameForm>}
    </>
  )
}

export default App
