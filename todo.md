# Pong Multiplayer Game: TODO Checklist

## Phase 0: Project Setup & Foundational Types

### Step 0.1: Backend & Frontend Project Initialization
-   **Backend (Node.js/TypeScript):**
    -   [ ] Create `server` directory.
    -   [ ] Initialize Node.js project (`server/package.json`).
    -   [ ] Install dependencies: `express`, `socket.io`, `typescript`, `ts-node`, `@types/express`, `@types/node`, `nodemon`.
    -   [ ] Install dev dependencies: `jest`, `ts-jest`, `@types/jest`.
    -   [ ] Configure `server/tsconfig.json`.
    -   [ ] Create `server/src/index.ts` with basic Express server.
    -   [ ] Add NPM scripts (`start`, `dev`, `build`, `test`) to `server/package.json`.
    -   [ ] Create `server/jest.config.js`.
    -   [ ] Create placeholder Jest test in `server/tests/server.test.ts`.
-   **Frontend (React/TypeScript with Vite):**
    -   [ ] Create `client` directory.
    -   [ ] Initialize React project using Vite (`npm create vite@latest client -- --template react-ts`).
    -   [ ] `cd client` and install `socket.io-client`.
    -   [ ] `cd client` and install dev dependencies: `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `ts-jest`, `@types/jest`, `jest-environment-jsdom`.
    -   [ ] Configure Jest in `client/jest.config.js` (or `client/package.json`).
    -   [ ] Create placeholder Jest test in `client/src/App.test.tsx`.
-   **Shared Directory:**
    -   [ ] Create `shared` directory (root level).

### Step 0.2: Shared Types Definition
-   [ ] Create `shared/types.ts`.
-   [ ] Define `PlayerId: string` in `shared/types.ts`.
-   [ ] Define `Paddle` interface in `shared/types.ts`.
-   [ ] Define `Ball` interface in `shared/types.ts`.
-   [ ] Define `GameState` interface in `shared/types.ts`.
-   [ ] Define `GameSession` interface in `shared/types.ts`.
-   [ ] Define game constants (`GAME_WIDTH`, `GAME_HEIGHT`, etc.) in `shared/types.ts` or `shared/constants.ts`.
-   [ ] Ensure `server/tsconfig.json` can resolve paths to `shared` (e.g., using `paths` or `baseUrl`).
-   [ ] Ensure `client/tsconfig.json` can resolve paths to `shared`.

### Step 0.3: Basic Server Setup & Client Connection (Handshake)
-   **Server (`server/src/index.ts`):**
    -   [ ] Integrate Socket.IO with the Express server.
    -   [ ] Listen for `io.on('connection', (socket) => { ... })`.
    -   [ ] Log new socket connections with `socket.id`.
    -   [ ] For each connected socket, listen for `'disconnect'` event and log it.
-   **Client:**
    -   [ ] Create `client/src/services/socketService.ts`.
    -   [ ] Implement `connect()` method in `socketService.ts`.
    -   [ ] Implement `disconnect()` method in `socketService.ts`.
    -   [ ] Implement `on<T>(eventName, callback)` method in `socketService.ts`.
    -   [ ] Implement `emit<T>(eventName, data)` method in `socketService.ts`.
    -   [ ] In `client/src/App.tsx`, call `socketService.connect()` on component mount.
    -   [ ] In `client/src/App.tsx`, call `socketService.disconnect()` on component unmount.
    -   [ ] In `client/src/App.tsx`, use `socketService.on` to listen for `'connect'` and `'disconnect'` events and log to console.

## Phase 1: Player Joining & Basic Matchmaking (Server-Side)

### Step 1.1: Player Management & `joinGame` Event
-   **Shared Types (`shared/types.ts`):**
    -   [ ] Define `JoinGamePayload { playerName: string }`.
    -   [ ] Define `PlayerInfo { id: PlayerId, name: string }`.
-   **Server (`server/src/services/playerService.ts`):**
    -   [ ] Create `playerService.ts`.
    -   [ ] Implement in-memory store for `PlayerInfo` objects (e.g., `Map<PlayerId, PlayerInfo>`).
    -   [ ] Implement `addPlayer(id: PlayerId, name: string): PlayerInfo` function.
    -   [ ] Implement `getPlayer(id: PlayerId): PlayerInfo | undefined` function.
    -   [ ] Implement `removePlayer(id: PlayerId): void` function.
    -   [ ] Write unit tests for `playerService.ts` (`server/tests/playerService.test.ts`).
-   **Server (`server/src/index.ts` - Socket Connection Handler):**
    -   [ ] Listen for `joinGame` event from client.
    -   [ ] On `joinGame`, validate payload, use `playerService.addPlayer`.
    -   [ ] Log player joining.

### Step 1.2: Matchmaking Queue & Game Session Creation
-   **Shared Types (`shared/types.ts`):**
    -   [ ] Define `GameStartPayload { sessionId: string, opponent: PlayerInfo, self: PlayerInfo & { isPlayerOne: boolean } }`.
-   **Server (`server/src/services/matchmakingService.ts`):**
    -   [ ] Create `matchmakingService.ts`.
    -   [ ] Implement a queue for waiting `PlayerInfo`.
    -   [ ] Implement in-memory store for active `GameSession` objects (e.g., `Map<string, GameSession>`).
    -   [ ] Implement `addPlayerToQueue(player: PlayerInfo): GameSession | null`.
        -   [ ] If queue has >= 2 players, create `GameSession` (generate unique ID).
        -   [ ] Assign `player1Id` (e.g., first in pair) and `player2Id`.
        -   [ ] Store session, remove players from queue, return session.
    -   [ ] Implement `removePlayerFromQueue(playerId: PlayerId): void`.
    -   [ ] Write unit tests for `matchmakingService.ts` (`server/tests/matchmakingService.test.ts`).
-   **Server (`server/src/index.ts` - after `joinGame` logic):**
    -   [ ] Call `matchmakingService.addPlayerToQueue()`.
    -   [ ] If `GameSession` is formed:
        -   [ ] Make both player sockets join a Socket.IO room using `session.id`.
        -   [ ] Emit `gameStart` event to player1's socket with correct payload (`self` is P1, `opponent` is P2).
        -   [ ] Emit `gameStart` event to player2's socket with correct payload (`self` is P2, `opponent` is P1).
        -   [ ] Log session creation.
    -   [ ] Else (no session formed), log player is waiting.

### Step 1.3: Player Disconnection Handling (Basic)
-   **Server (`server/src/index.ts` - Socket Disconnect Handler):**
    -   [ ] Get `PlayerInfo` using `playerService.getPlayer(socket.id)`.
    -   [ ] Call `playerService.removePlayer(socket.id)`.
    -   [ ] Call `matchmakingService.removePlayerFromQueue(socket.id)`.
    -   [ ] Find any `GameSession` the disconnected player was in.
        -   [ ] If found, notify the other player in that session's room (e.g., emit `opponentDisconnected` event with `PlayerInfo` of disconnected player).
        -   [ ] Clean up/remove the `GameSession` from the active sessions store.
        -   [ ] (Later: handle if game loop needs stopping for this session).
    -   [ ] Log player disconnection (with name if available).

## Phase 2: Initial UI & Client-Side Join Flow

### Step 2.1: "Join Game" UI
-   **Client (`client/src/components/JoinGameForm.tsx`):**
    -   [ ] Create `JoinGameForm.tsx` component.
    -   [ ] Add an input field for player name (controlled component with `useState`).
    -   [ ] Add a "Join Game" button.
    -   [ ] On button click: prevent default, get name, if not empty, use `socketService.emit<JoinGamePayload>('joinGame', { playerName: name })`.
-   **Client (`client/src/App.tsx`):**
    -   [ ] Manage a client-side state for current view (e.g., `view: 'joining' | 'in_game' | 'game_over'`).
    -   [ ] Conditionally render `JoinGameForm` if `view === 'joining'`.

### Step 2.2: Game Screen Stub & Transition
-   **Client (`client/src/components/GameScreen.tsx`):**
    -   [ ] Create `GameScreen.tsx` placeholder component.
        -   [ ] It should accept props like `sessionId`, `selfInfo`, `opponentInfo`.
        -   [ ] Display basic info like "Game Session: [sessionId]", "Playing against: [opponentName]".
-   **Client (`client/src/App.tsx`):**
    -   [ ] Add `useState` for `sessionId`, `selfInfo`, `opponentInfo`.
    -   [ ] Listen for `gameStart` event from server using `socketService.on<GameStartPayload>`.
    -   [ ] On `gameStart` received:
        -   [ ] Store `sessionId`, `self` (from payload), `opponent` (from payload).
        -   [ ] Change `view` state to `'in_game'`.
    -   [ ] Conditionally render `GameScreen` component if `view === 'in_game'`, passing stored props.
    -   [ ] (Optional) Display a "Waiting for game to start..." or similar message if needed while `gameStart` is pending.

## Phase 3: Paddle Implementation (Core Mechanics)

### Step 3.1: Server-Side Paddle Logic & Initial State
-   **Server (Update `GameSession` in `matchmakingService` or create `GameLogicService`):**
    -   [ ] When a `GameSession` is created (Step 1.2), initialize `Paddle` states for `player1Id` and `player2Id` within `session.gameState.paddles`.
        -   [ ] Set initial X positions (e.g., `GAME_WIDTH / 2`).
        -   [ ] Set fixed Y positions based on `GAME_HEIGHT`, `PADDLE_OFFSET_Y`, `PADDLE_HEIGHT` (P1 bottom, P2 top).
        -   [ ] Set width, height, initial score (0), and name.

### Step 3.2: Client-Side Paddle Rendering
-   **Client (`client/src/components/Paddle.tsx`):**
    -   [ ] Create `Paddle.tsx` component.
    -   [ ] Props: `x`, `y`, `width`, `height`, `color` (optional).
    -   [ ] Render a `div` styled to represent the paddle at the given absolute position.
-   **Client (`client/src/components/GameScreen.tsx`):**
    -   [ ] `useState` to store current paddle positions (e.g., `ownPaddlePos`, `opponentPaddlePos`).
    -   [ ] On `gameStart` (or initial `gameStateUpdate`), set initial paddle positions received from server.
        *   Map server's `player1Id` paddle to client's "own" or "opponent" based on `selfInfo.isPlayerOne`.
        *   Client always renders its "own" paddle at the bottom visual position and "opponent" at the top.
    -   [ ] Render two `Paddle` components using these state variables.

### Step 3.3: Client-Side Paddle Input & Prediction
-   **Shared Types (`shared/types.ts`):**
    -   [ ] Define `PaddleMovePayload { newX: number }`.
-   **Client (`client/src/components/GameScreen.tsx` or custom hook `usePaddleMovement.ts`):**
    -   [ ] Add event listener for `mousemove` on the game area/window.
    -   [ ] On mouse move, calculate the desired X position for the player's own paddle.
    -   [ ] Constrain this X position within game boundaries (`0` to `GAME_WIDTH - PADDLE_WIDTH`).
    -   [ ] Update the local state for the player's own paddle X position *immediately* (client-side prediction).
    -   [ ] Use `socketService.emit<PaddleMovePayload>('paddleMove', { newX: calculatedX })`.

### Step 3.4: Server-Side Paddle Update & Broadcast
-   **Shared Types (`shared/types.ts`):**
    -   [ ] Define `GameStateUpdatePayload { ball?: Ball, paddles: { [playerId: PlayerId]: { x: number } }, scores?: { [playerId: PlayerId]: number } }`. (Define `SocketEvents` enum for event names).
-   **Server (within `GameSession` or `GameLogicService`):**
    -   [ ] Handle `paddleMove` event (ensure it's from a player in an active session).
    -   [ ] Get the `PlayerId` from the `socket.id`.
    -   [ ] Validate `payload.newX` (constrain within game boundaries: `0` to `GAME_WIDTH - PADDLE_WIDTH`).
    -   [ ] Update the authoritative X position of the paddle for `playerId` in `session.gameState.paddles`.
    -   [ ] (This will be part of the game loop broadcast, see Step 4.1/4.2 for game loop setup). For now, can broadcast `GameStateUpdatePayload` specifically on paddle move for testing.

### Step 3.5: Client-Side Paddle Synchronization
-   **Client (`client/src/components/GameScreen.tsx`):**
    -   [ ] Listen for `gameStateUpdate` event from server.
    -   [ ] When `gameStateUpdate` is received:
        -   [ ] Update the opponent's paddle X position from `payload.paddles[opponentInfo.id].x`.
        -   [ ] For the player's own paddle:
            -   Get server's authoritative X: `payload.paddles[selfInfo.id].x`.
            -   (Optional - Simple approach): Directly set local own paddle X to server's X.
            -   (Optional - Advanced): If significant difference, smoothly interpolate/correct local paddle to server's position. For Pong, direct set is often fine.

## Phase 4: Ball Implementation (Movement & Wall Collision)

### Step 4.1: Server-Side Ball Logic & Game Loop
-   **Server (within `GameSession` or `GameLogicService`):**
    -   [ ] In `GameSession` creation (Step 1.2), initialize `session.gameState.ball` (position, radius).
    -   [ ] Implement a game loop function for each active `GameSession` (e.g., using `setInterval(gameTick, 1000 / 60)`).
        -   [ ] `gameTick` function:
            -   Update ball position: `ball.x += ball.dx`, `ball.y += ball.dy`.
            -   (Wall collision logic will be in Step 4.2).
            -   (Paddle collision logic in Step 5.1).
            -   (Scoring logic in Step 5.2).
            -   Broadcast `GameStateUpdatePayload` (with updated `ball` and `paddles`) to all clients in the session's room.
    -   [ ] Start the game loop when a `GameSession` becomes active (e.g., after `gameStart` is emitted).
    -   [ ] Clear the interval (stop the loop) when the game session ends (e.g., disconnect, game over).

### Step 4.2: Server-Side Ball Wall Collision & Initial Serve
-   **Server (in `gameTick` function):**
    -   [ ] Implement collision with top wall: `if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.dy *= -1; }`.
    -   [ ] Implement collision with bottom wall: `if (ball.y + ball.radius > GAME_HEIGHT) { ball.y = GAME_HEIGHT - ball.radius; ball.dy *= -1; }`.
    -   [ ] **Initial Serve Logic** (function called on game start and after score):
        -   [ ] Reset ball position to center (`GAME_WIDTH / 2`, `GAME_HEIGHT / 2`).
        -   [ ] Randomize initial `ball.dx` and `ball.dy`.
            -   `ball.dy` should ensure it heads towards a player (e.g., positive if P1 served upon, negative if P2 served upon).
            -   `ball.dx` can be a smaller random component for angle.
            -   Normalize to `INITIAL_BALL_SPEED`.
        -   [ ] Call this serve logic when game starts for the first time.

### Step 4.3: Client-Side Ball Rendering & Interpolation
-   **Client (`client/src/components/Ball.tsx`):**
    -   [ ] Create `Ball.tsx` component. Props: `x`, `y`, `radius`, `color`. Render a styled `div`.
-   **Client (`client/src/components/GameScreen.tsx`):**
    -   [ ] `useState` to store current ball position (`ballPos`).
    -   [ ] Render `Ball` component using `ballPos`.
    -   [ ] On receiving `gameStateUpdate` with `payload.ball`:
        -   [ ] (Simple approach): Update `ballPos` directly from `payload.ball`.
        -   [ ] (Advanced - Interpolation):
            -   Store `serverBallState = payload.ball`.
            -   In a `requestAnimationFrame` loop, smoothly animate local `ballPos` towards `serverBallState.x, serverBallState.y`.
            -   This requires managing a local simulation or lerping. For Pong, direct update might be sufficient if server updates are frequent.

## Phase 5: Core Game Loop: Paddle-Ball Collision & Scoring

### Step 5.1: Server-Side Paddle-Ball Collision
-   **Server (in `gameTick` function, after ball movement):**
    -   [ ] Check collision between ball and `player1Paddle` (bottom defender).
        -   AABB: `ball.x + ball.radius > p1.x && ball.x - ball.radius < p1.x + p1.width && ball.y + ball.radius > p1.y && ball.y - ball.radius < p1.y + p1.height`.
        -   If collision: `ball.dy *= -1; ball.y = p1.y - ball.radius;` (Adjust Y to prevent sticking).
    -   [ ] Check collision between ball and `player2Paddle` (top defender).
        -   AABB: `ball.x + ball.radius > p2.x && ball.x - ball.radius < p2.x + p2.width && ball.y - ball.radius < p2.y + p2.height && ball.y + ball.radius > p2.y`.
        -   If collision: `ball.dy *= -1; ball.y = p2.y + p2.height + ball.radius;` (Adjust Y).
    -   (Refine bounce logic in Phase 6).

### Step 5.2: Server-Side Scoring Logic
-   **Server (in `gameTick` function, after wall/paddle collisions):**
    -   [ ] Check if Player 2 (top) scored (ball passed Player 1's baseline - bottom):
        `if (ball.y + ball.radius > GAME_HEIGHT)` (or `ball.y > GAME_HEIGHT` if radius handled at bounce).
        -   Increment `player2Paddle.score`.
        -   Call post-score reset logic (Step 5.3).
    -   [ ] Check if Player 1 (bottom) scored (ball passed Player 2's baseline - top):
        `if (ball.y - ball.radius < 0)` (or `ball.y < 0`).
        -   Increment `player1Paddle.score`.
        -   Call post-score reset logic (Step 5.3).
    -   [ ] After score update, check for win condition (Step 7.1).

### Step 5.3: Server-Side Post-Score Reset
-   **Server (function called after a score):**
    -   [ ] Call initial serve logic from Step 4.2 (resets ball position and serves towards player scored upon).
    -   [ ] The `GameStateUpdatePayload` broadcast by the game loop will naturally include new scores and reset ball state. (Or emit a dedicated `ScoreUpdateEvent`).

### Step 5.4: Client-Side Score Display
-   **Client (`client/src/components/ScoreBoard.tsx`):**
    -   [ ] Create `ScoreBoard.tsx` component.
    -   [ ] Props: `player1Name`, `player1Score`, `player2Name`, `player2Score`.
    -   [ ] Display scores (e.g., `${player1Name} ${player1Score} VS ${player2Score} ${player2Name}`).
-   **Client (`client/src/components/GameScreen.tsx`):**
    -   [ ] `useState` for scores.
    -   [ ] On `gameStateUpdate` received, update local score states from `payload.paddles[id].score`.
    -   [ ] Render `ScoreBoard` component, passing player names (from `selfInfo`, `opponentInfo`) and current scores.

## Phase 6: Advanced Ball Physics (Server-Side)

### Step 6.1: Angle Modification on Paddle Hit
-   **Server (paddle-ball collision logic in `gameTick`):**
    -   [ ] When ball hits a paddle:
        -   Calculate `intersectX = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);` (normalized from -1 to 1).
        -   `newAngle = intersectX * MAX_BOUNCE_ANGLE;` (e.g., `MAX_BOUNCE_ANGLE` could be Math.PI / 3 or 60 degrees).
        -   `ball.dx = ballSpeed * Math.sin(newAngle);`
        -   `ball.dy = (ball.dy > 0 ? -1 : 1) * ballSpeed * Math.cos(newAngle);` (ensure dy reverses direction towards opponent).
        -   `ballSpeed` is current speed of the ball.

### Step 6.2: "Spin" Mechanic (Paddle Movement Influence)
-   **Server (paddle-ball collision logic in `gameTick`):**
    -   [ ] (Optional: Track paddle's own `dx` if it moves, or infer from rapid `paddleMove` events. For simpler mouse control, this might be hard. Alternative: use mouse velocity if sent by client, or just apply a "push" if paddle was moving).
    -   [ ] If paddle was moving horizontally at impact (requires knowing previous paddle X or current mouse speed):
        -   `paddleVelocityEffect = detectedPaddleHorizontalSpeed * SPIN_FACTOR;`
        -   `ball.dx += paddleVelocityEffect;`
        -   Increase `ballSpeed` by a small amount, up to `MAX_BALL_SPEED`.
        -   Re-normalize `ball.dx` and `ball.dy` if speed changed, to maintain the new speed.

### Step 6.3: Ball Speed Controls
-   **Server:**
    -   [ ] Define `MIN_BALL_SPEED` (same as `INITIAL_BALL_SPEED`) and `MAX_BALL_SPEED`.
    -   [ ] After any logic that modifies `ball.dx` or `ball.dy` (spin, angle change):
        -   `currentSpeed = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy);`
        -   `if (currentSpeed > MAX_BALL_SPEED) { scale = MAX_BALL_SPEED / currentSpeed; ball.dx *= scale; ball.dy *= scale; }`
        -   `if (currentSpeed < MIN_BALL_SPEED) { scale = MIN_BALL_SPEED / currentSpeed; ball.dx *= scale; ball.dy *= scale; }`
    -   [ ] When ball is reset after a score (Step 5.3), ensure its speed magnitude is set to `INITIAL_BALL_SPEED`.

## Phase 7: Game End & Post-Game Flow

### Step 7.1: Server-Side Win Condition
-   **Shared Types (`shared/types.ts`):**
    -   [ ] Define `GameOverPayload { winnerId?: PlayerId, winnerName?: string }`. (If no winner, `winnerId` and `winnerName` are undefined/null).
-   **Server (in `gameTick`, after score update):**
    -   [ ] `if (player1Paddle.score >= MAX_SCORE || player2Paddle.score >= MAX_SCORE)`:
        -   [ ] Determine `winnerId` and `winnerName`.
        -   [ ] Update `session.gameState.status = 'finished'`.
        -   [ ] Set `session.gameState.winner = winnerId`.
        -   [ ] Stop the game loop for this session (`clearInterval`).
        -   [ ] Broadcast `gameOver` event to all clients in the room with `GameOverPayload`.

### Step 7.2: Client-Side Game Over UI
-   **Client (`client/src/App.tsx` or `GameScreen.tsx`):**
    -   [ ] Listen for `gameOver` event from server.
    -   [ ] On `gameOver` received:
        -   [ ] Update client `view` state to `'game_over'`.
        -   [ ] Store `winnerName` from payload.
    -   [ ] If `view === 'game_over'`:
        -   [ ] Display "Winner is [winnerName]!" message (or "It's a draw!" if applicable).
        -   [ ] Show "Play Again" button.
        -   [ ] Show "New Game" button.
        -   [ ] (Optional: Hide game canvas/elements or show them dimmed).

### Step 7.3: Server & Client Logic for "Play Again" / "New Game"
-   **Shared Types (`shared/types.ts`):**
    -   [ ] Define events: `ClientToServerEvents: { requestRematch: () => void; requestNewGame: () => void; }`.
    -   [ ] Define events: `ServerToClientEvents: { waitingForRematchOpponent: () => void; rematchDeclined: () => void; }`. (Rematch acceptance can reuse `gameStart`).
-   **Client (Post-Game UI):**
    -   [ ] "Play Again" button: `socketService.emit('requestRematch')`. Display "Waiting for opponent..."
    -   [ ] "New Game" button: `socketService.emit('requestNewGame')`. Transition client to 'joining' view or re-show `JoinGameForm`.
-   **Server (Socket Connection Handler):**
    -   [ ] Handle `requestRematch`:
        -   [ ] Mark player in session as wanting rematch.
        -   [ ] If both players in session want rematch:
            -   [ ] Reset game state for the session (scores to 0, call initial serve logic for ball).
            -   [ ] Set `session.gameState.status = 'active'`.
            -   [ ] Re-emit `gameStart` to both with updated (reset) initial game state.
            -   [ ] Restart game loop for the session.
        -   [ ] Else (opponent hasn't requested yet):
            -   [ ] Emit `waitingForRematchOpponent` to the requesting player.
            -   [ ] Notify other player that their opponent wants a rematch (e.g., `opponentWantsRematch` event).
    -   [ ] Handle `requestNewGame`:
        -   [ ] Find the session the player was in.
        -   [ ] If opponent in that session was waiting for rematch, emit `rematchDeclined` to opponent.
        -   [ ] Clean up player from old session / mark session as defunct if only one player left.
        -   [ ] Add player back to matchmaking queue (`matchmakingService.addPlayerToQueue`). (This will trigger new game if another player is waiting).
    -   [ ] Handle disconnection if a player disconnects while one is waiting for rematch.

## Phase 8: Refinements & Polish

### Step 8.1: Audio Integration
-   **Client:**
    -   [ ] Create/select sound assets (`.mp3`, `.wav`) for:
        -   [ ] Ball-paddle/wall collision.
        -   [ ] Point scored.
        -   [ ] Game win.
        -   [ ] Game lose.
    -   [ ] Store assets in `client/src/assets/sounds/`.
    -   [ ] Create `client/src/services/audioService.ts` (or similar).
        -   [ ] Functions to load and play sounds using Web Audio API (`AudioContext`, `AudioBufferSourceNode`).
    -   [ ] Call audio service play functions at appropriate client-side event handlers (e.g., when `gameStateUpdate` indicates a collision, or on `scoreUpdate`, `gameOver`).

### Step 8.2: Visual Polish
-   **Client:**
    -   [ ] Define and apply a consistent color scheme (CSS variables or theme).
    -   [ ] Style game area, paddles, ball, text elements.
    -   [ ] Implement visual center dotted line in `GameScreen.tsx`.
    -   [ ] Ensure UI is reasonably responsive (consider viewport units or simple media queries).
    -   [ ] (Optional) Add simple particle effects on collision.

### Step 8.3: Gameplay Tuning
-   **Server & Client (as needed):**
    -   [ ] Playtest the game extensively.
    -   [ ] Adjust constants in `shared/types.ts` or `shared/constants.ts`: `INITIAL_BALL_SPEED`, `MAX_BALL_SPEED`, paddle dimensions, `SPIN_FACTOR`, `MAX_BOUNCE_ANGLE`.
    -   [ ] Fine-tune collision detection and response for better game feel.
    -   [ ] Adjust game loop frequency if needed for performance/smoothness balance.

### Step 8.4: Robust Disconnection Handling (Revisit & Finalize)
-   **Server:**
    -   [ ] On player disconnect (`socket.on('disconnect')`):
        -   [ ] If player was in an active game session:
            -   [ ] Stop the game loop for that session.
            -   [ ] Notify the other player in the room: emit `opponentDisconnected { opponentName: string }`.
            -   [ ] Mark the session as ended/archived, remove from active sessions.
        -   [ ] If player was waiting in matchmaking queue, ensure they are removed.
        -   [ ] If player was in a post-game state (e.g., waiting for rematch decision), handle appropriately (e.g., inform other player).
-   **Client:**
    -   [ ] Listen for `opponentDisconnected` event.
    -   [ ] On `opponentDisconnected`:
        -   [ ] Display message: "[Opponent's Name] disconnected."
        -   [ ] Show "New Game" button.
        -   [ ] Transition view state to allow starting a new game (e.g., back to 'joining' or a specific 'disconnected' state).

This `todo.md` should cover all the detailed steps from the blueprint.