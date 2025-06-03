
import { useEffect } from 'react'
import './App.css'
import { socketService } from './services/socketService';

function App() {
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
      
    </>
  )
}

export default App
