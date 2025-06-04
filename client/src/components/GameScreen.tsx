function GameScreen({
  sessionId,
  selfInfo,
  opponentInfo,
}: {
  sessionId: string;
  selfInfo: { id: string; name: string; isPlayerOne: boolean };
  opponentInfo: { id: string; name: string };
}) {
  return (
    <div className="game-screen">
      <h1>Ping Pong Game</h1>
      <p>Game Session: {sessionId}</p>
      <p>Playing against: {opponentInfo.name}</p>
    </div>
  );
}
export default GameScreen;