# Pong Multiplayer Game: Development Blueprint

This blueprint outlines the iterative development process for the Pong Multiplayer game, breaking the project into manageable phases and steps. Each step aims for incremental progress and testability.

## Phase 0: Project Setup & Foundational Types

*   **Step 0.1: Backend & Frontend Project Initialization.**
    *   **Backend:** Node.js with TypeScript, Express, Socket.IO.
        *   Initialize project (`package.json`), install dependencies (`express`, `socket.io`, `typescript`, `ts-node`, `@types/express`, `@types/node`, `nodemon`, `jest`, `ts-jest`, `@types/jest`).
        *   Configure `tsconfig.json`.
        *   Basic `src/index.ts` for server setup.
        *   NPM scripts for `start`, `dev`, `build`, `test`.
        *   Placeholder Jest test.
    *   **Frontend:** React with TypeScript (using Vite).
        *   Initialize project (`npm create vite@latest client -- --template react-ts`).
        *   Install dependencies (`socket.io-client`, `jest`, `@testing-library/react`, `@testing-library/jest-dom`, `ts-jest`, `@types/jest`).
        *   Configure Jest.
        *   Placeholder Jest test.
    *   **Shared Directory:**
        *   Create `shared/` for common types.

*   **Step 0.2: Shared Types Definition.**
    *   In `shared/types.ts`, define core data structures:
        *   `PlayerId`, `Paddle`, `Ball`, `GameState`, `GameSession`.
        *   Game constants: `GAME_WIDTH`, `GAME_HEIGHT`, `PADDLE_WIDTH`, `PADDLE_HEIGHT`, `BALL_RADIUS`, `PADDLE_OFFSET_Y` (for horizontal paddles, this would be paddle X offset or boundary), `INITIAL_BALL_SPEED`, `MAX_SCORE`.
    *   Ensure `server/tsconfig.json` and `client/tsconfig.json` can resolve paths to the `shared` directory.

*   **Step 0.3: Basic Server Setup & Client Connection (Handshake).**
    *   **Server (`server/src/index.ts`):**
        *   Integrate Socket.IO with Express server.
        *   Listen for new socket connections (`io.on('connection', ...)`) and log connection/disconnection with socket ID.
    *   **Client (`client/src/App.tsx` and `client/src/services/socketService.ts`):**
        *   Create `socketService.ts` to manage client-side Socket.IO instance (`connect`, `disconnect`, `on`, `emit` methods).
        *   In `App.tsx`, connect to the server on mount and disconnect on unmount using `socketService`. Log connection status.

## Phase 1: Player Joining & Basic Matchmaking (Server-Side)

*   **Step 1.1: Player Management & `joinGame` Event.**
    *   **Shared Types (`shared/types.ts`):**
        *   `JoinGamePayload { playerName: string }`.
        *   `PlayerInfo { id: PlayerId, name: string }`.
    *   **Server (`server/src/services/playerService.ts`):**
        *   Manage a list/map of connected `PlayerInfo` objects.
        *   Functions: `addPlayer`, `getPlayer`, `removePlayer`.
        *   Unit tests for `playerService`.
    *   **Server (`server/src/index.ts`):**
        *   Handle `joinGame` event: receive `playerName`, use `playerService` to store player info.

*   **Step 1.2: Matchmaking Queue & Game Session Creation.**
    *   **Shared Types (`shared/types.ts`):**
        *   `GameStartPayload { sessionId: string, opponent: PlayerInfo, self: PlayerInfo & { isPlayerOne: boolean } }` (isPlayerOne indicates who defends bottom/top).
    *   **Server (`server/src/services/matchmakingService.ts`):**
        *   Maintain a queue of waiting `PlayerInfo`.
        *   Function `addPlayerToQueue(player: PlayerInfo): GameSession | null`:
            *   If queue has 2 players, create a `GameSession` (from `shared/types.ts`, assign `player1Id`, `player2Id`), pair them, store the session, and return it.
        *   Function `removePlayerFromQueue(playerId: PlayerId)`.
        *   Unit tests for `matchmakingService`.
    *   **Server (`server/src/index.ts`):**
        *   After `joinGame`, add player to matchmaking queue.
        *   If a session is formed, emit `gameStart` to both players with appropriate payloads (identifying self and opponent, and who is P1/P2). Socket.IO rooms will be useful here (`socket.join(sessionId)`).

*   **Step 1.3: Player Disconnection Handling (Basic).**
    *   **Server (`server/src/index.ts`):**
        *   On socket `disconnect` event:
            *   Remove player using `playerService`.
            *   Remove player from matchmaking queue if they were waiting.
            *   If player was in an active `GameSession`:
                *   Notify the other player in the session (e.g., `opponentDisconnected` event).
                *   Clean up the `GameSession`.

## Phase 2: Initial UI & Client-Side Join Flow

*   **Step 2.1: "Join Game" UI.**
    *   **Client (`client/src/components/JoinGameForm.tsx`):**
        *   Input for player name, "Join Game" button.
        *   On submit, emit `joinGame` event to server with `JoinGamePayload`.
    *   **Client (`client/src/App.tsx`):**
        *   Conditionally render `JoinGameForm` if not in a game.

*   **Step 2.2: Game Screen Stub & Transition.**
    *   **Client (`client/src/components/GameScreen.tsx`):**
        *   Create a basic placeholder component for the game view.
    *   **Client (`client/src/App.tsx`):**
        *   Manage game state (e.g., `'idle'`, `'waiting'`, `'in_game'`, `'game_over'`).
        *   On receiving `gameStart` from server:
            *   Store session ID, self, and opponent info.
            *   Transition to rendering `GameScreen`.
            *   Pass necessary props (e.g., opponent name, own player role) to `GameScreen`.
        *   Display a "Waiting for opponent..." message if applicable or directly show game elements.

## Phase 3: Paddle Implementation (Core Mechanics)

*   **Step 3.1: Server-Side Paddle Logic & Initial State.**
    *   **Server (within `GameSession` or a new `GameLogicService`):**
        *   Initialize paddle positions for `player1Id` (bottom defender) and `player2Id` (top defender) when a `GameSession` starts. Paddles are centered horizontally initially.
        *   Use constants from `shared/types.ts` for paddle dimensions and Y positions (e.g., `player1Paddle.y = GAME_HEIGHT - PADDLE_OFFSET_Y - PADDLE_HEIGHT / 2`, `player2Paddle.y = PADDLE_OFFSET_Y + PADDLE_HEIGHT / 2`).
        *   The game state within `GameSession` should now track paddle X positions.

*   **Step 3.2: Client-Side Paddle Rendering.**
    *   **Client (`client/src/components/Paddle.tsx`):**
        *   A simple component to render a paddle (a `div`) at given X, Y coordinates with specified width/height.
    *   **Client (`client/src/components/GameScreen.tsx`):**
        *   Receive initial paddle states from the server (via `gameStart` or an initial `gameStateUpdate`).
        *   Render two `Paddle` components: one for the player (always visually at the bottom) and one for the opponent (always visually at the top). The server's `isPlayerOne` flag in `GameStartPayload` helps determine which server paddle data maps to the client's "own" vs "opponent" paddle.

*   **Step 3.3: Client-Side Paddle Input & Prediction.**
    *   **Shared Types (`shared/types.ts`):**
        *   `PaddleMovePayload { newX: number }`.
    *   **Client (`client/src/components/GameScreen.tsx` or a custom hook):**
        *   Listen for horizontal mouse movement within the game area (or window).
        *   Update the player's own paddle X position locally *immediately* (client-side prediction). Constrain movement within `GAME_WIDTH`.
        *   Emit `paddleMove` event to server with the new X position.

*   **Step 3.4: Server-Side Paddle Update & Broadcast.**
    *   **Shared Types (`shared/types.ts`):**
        *   `GameStateUpdatePayload { ball?: Ball, paddles: { [playerId: PlayerId]: { x: number } }, scores?: { [playerId: PlayerId]: number } }`. (Paddles only need to send X if Y is fixed).
    *   **Server (within `GameSession` or `GameLogicService`):**
        *   Handle `paddleMove` event from client.
        *   Validate the new X position (within `GAME_WIDTH` boundaries).
        *   Update the authoritative X position of the corresponding player's paddle in the `GameSession`'s state.
        *   Broadcast the `GameStateUpdatePayload` (containing updated paddle positions) to all clients in the game session's room at a regular interval (e.g., 20-60Hz game loop, or on change).

*   **Step 3.5: Client-Side Paddle Synchronization.**
    *   **Client (`client/src/components/GameScreen.tsx`):**
        *   Listen for `gameStateUpdate` from server.
        *   Update the opponent's paddle X position based on server data.
        *   For the player's own paddle:
            *   Compare local predicted X with server's authoritative X.
            *   If different, smoothly correct/interpolate the local paddle to the server's position (reconciliation).

## Phase 4: Ball Implementation (Movement & Wall Collision)

*   **Step 4.1: Server-Side Ball Logic & Game Loop.**
    *   **Server (within `GameSession` or `GameLogicService`):**
        *   In the `GameSession`'s state, initialize the `Ball` (position, velocity, radius). On game start, position at center.
        *   Implement a game loop (e.g., using `setInterval`) that runs, say, 60 times per second for each active `GameSession`.
        *   Inside the loop:
            *   Update ball position: `ball.x += ball.dx`, `ball.y += ball.dy`.

*   **Step 4.2: Server-Side Ball Wall Collision & Initial Serve.**
    *   **Server (game loop):**
        *   Collision with top/bottom walls (these are the horizontal walls in our top/bottom paddle setup): If `ball.y - ball.radius < 0` or `ball.y + ball.radius > GAME_HEIGHT`, then `ball.dy *= -1`.
        *   **Initial Serve:** When a game starts (or after a score), set the ball's initial `dx` and `dy`. The direction (towards P1 or P2) should be randomized. The vertical angle component should also be randomized within a playable range.
    *   The `gameStateUpdate` broadcast from Step 3.4 should now include the `ball` state.

*   **Step 4.3: Client-Side Ball Rendering & Interpolation.**
    *   **Client (`client/src/components/Ball.tsx`):**
        *   A simple component to render the ball (a `div`) at given X, Y coordinates.
    *   **Client (`client/src/components/GameScreen.tsx`):**
        *   Render the `Ball` component.
        *   On receiving `gameStateUpdate` with ball data:
            *   Store the target ball position/velocity.
            *   Implement client-side interpolation (e.g., using `requestAnimationFrame`) to smoothly animate the ball towards the target state received from the server, rather than just snapping it. This mitigates visual stutter due to network latency/update frequency.

## Phase 5: Core Game Loop: Paddle-Ball Collision & Scoring

*   **Step 5.1: Server-Side Paddle-Ball Collision.**
    *   **Server (game loop):**
        *   Implement collision detection between the ball and both paddles. (AABB collision detection is suitable: check if ball's bounding box intersects with paddle's bounding box).
        *   If collision with a paddle occurs:
            *   Reverse ball's Y velocity (`ball.dy *= -1`). (This is the simple bounce for now).
            *   To prevent sticking, ensure the ball is moved slightly out of the paddle after collision.

*   **Step 5.2: Server-Side Scoring Logic.**
    *   **Server (game loop):**
        *   Detect when ball passes a player's baseline (the "goal" areas):
            *   If `ball.x - ball.radius < 0` (Player 2 on the right scores against Player 1 on the left, for classic Pong).
            *   **For our top/bottom paddle setup:**
                *   If `ball.y - ball.radius < 0` (past top edge): Player defending bottom (P1) scores.
                *   If `ball.y + ball.radius > GAME_HEIGHT` (past bottom edge): Player defending top (P2) scores.
        *   Increment the appropriate player's score in the `GameSession`'s state.
        *   Check for win condition (Step 7.1 will handle game over).

*   **Step 5.3: Server-Side Post-Score Reset.**
    *   **Server:**
        *   When a point is scored:
            *   Reset ball to center (`GAME_WIDTH / 2`, `GAME_HEIGHT / 2`).
            *   Serve the ball towards the player who was just scored upon (randomized angle).
            *   The `gameStateUpdate` or a dedicated `scoreUpdate` event should include the new scores and the reset ball state.

*   **Step 5.4: Client-Side Score Display.**
    *   **Client (`client/src/components/ScoreBoard.tsx`):**
        *   Component to display player names and their scores (e.g., `[Player 1 Name] [P1 Score] VS [P2 Score] [Player 2 Name]`).
    *   **Client (`client/src/components/GameScreen.tsx`):**
        *   Render `ScoreBoard`.
        *   Update scores in `ScoreBoard` when `gameStateUpdate` or `scoreUpdate` is received from the server.

## Phase 6: Advanced Ball Physics (Server-Side)

*   **Step 6.1: Angle Modification on Paddle Hit.**
    *   **Server (paddle-ball collision logic):**
        *   Instead of a simple `ball.dy *= -1`:
            *   Calculate the relative intersection point of the ball on the paddle's width. (e.g., a value from -1 for far left edge to +1 for far right edge of the paddle).
            *   Use this value to influence the outgoing `ball.dx`. A hit on the center might result in a more vertical reflection of `dx` (or small `dx`), while hits on edges create a sharper horizontal angle.
            *   The `ball.dy` will still reverse, but its magnitude might also be affected to maintain overall speed or be part of the spin.

*   **Step 6.2: "Spin" Mechanic (Paddle Movement Influence).**
    *   **Server (paddle-ball collision logic):**
        *   Before collision, track the paddle's horizontal velocity (how fast it was moving when the ball hit). This might require client to send paddle velocity or server to infer it from rapid position changes. *Simpler: just use current paddle X movement direction if an explicit velocity is too complex to track.*
        *   If the paddle is moving horizontally (e.g., `paddle.dx !== 0` if we track that, or if current mouse X is different from previous tick's mouse X) above a certain threshold at the moment of impact:
            *   Add a component of the paddle's horizontal velocity to the ball's `dx`.
            *   Increase the ball's overall speed (magnitude of `sqrt(dx^2 + dy^2)`).

*   **Step 6.3: Ball Speed Controls.**
    *   **Server (game loop & post-score reset):**
        *   Implement a maximum speed for the ball. If speed increase (from spin or other mechanics) exceeds this, cap it.
        *   When ball is reset after a score (Step 5.3), ensure its speed is reset to `INITIAL_BALL_SPEED`.

## Phase 7: Game End & Post-Game Flow

*   **Step 7.1: Server-Side Win Condition.**
    *   **Shared Types (`shared/types.ts`):**
        *   `GameOverPayload { winnerId?: PlayerId, winnerName?: string }`. (`winnerId` could be null for draws/disconnects if supported, but spec says winner declared on disconnects for opponent). *Spec update: disconnect means no winner declared.*
    *   **Server (after score update):**
        *   If a player's score reaches `MAX_SCORE`:
            *   Update `GameSession.status` to `'finished'`.
            *   Set `GameSession.winner` to the `PlayerId` of the winning player.
            *   Stop the game loop for this session.
            *   Broadcast `gameOver` event to both clients in the room with `GameOverPayload`.

*   **Step 7.2: Client-Side Game Over UI.**
    *   **Client (`client/src/components/GameScreen.tsx` or `client/src/App.tsx`):**
        *   Listen for `gameOver` event.
        *   Display "Winner is [Player Name]" message.
        *   Show "Play Again" and "New Game" buttons. Hide game elements or overlay the message.

*   **Step 7.3: Server & Client Logic for "Play Again" / "New Game".**
    *   **Shared Types (`shared/types.ts`):**
        *   Events: `requestRematch`, `requestNewGame`.
        *   Server responses: `waitingForRematchOpponent`, `rematchDeclined`, `rematchAccepted` (or reuse `gameStart`).
    *   **Client:**
        *   "Play Again" button emits `requestRematch`.
        *   "New Game" button emits `requestNewGame`.
    *   **Server:**
        *   On `requestRematch`:
            *   Notify other player. If both request rematch, reset game state for the session and emit `gameStart` (or a `rematchAccepted` then `gameStart`).
            *   If one requests rematch and is waiting, inform them with `waitingForRematchOpponent`.
        *   On `requestNewGame`:
            *   Move player back to matchmaking queue (Step 1.2).
            *   If their previous opponent was waiting for a rematch, notify that opponent with `rematchDeclined`.
        *   Handle cases where one player requests rematch and the other disconnects or requests new game.

## Phase 8: Refinements & Polish

*   **Step 8.1: Audio Integration.**
    *   **Client:**
        *   Select/create sound assets (`.mp3`, `.wav`) for:
            *   Ball-paddle/wall collision.
            *   Point scored.
            *   Game win.
            *   Game lose.
        *   Use Web Audio API (`AudioContext`) to play sounds at appropriate times (e.g., on receiving specific events or detecting local collisions if prediction is involved).

*   **Step 8.2: Visual Polish.**
    *   **Client:**
        *   Implement chosen color scheme for game area, paddles, ball, text.
        *   Add any other visual elements (e.g., center line styling, simple particle effects on collision).
        *   Ensure UI is responsive and looks good.

*   **Step 8.3: Gameplay Tuning.**
    *   **Server & Client:**
        *   Playtest extensively.
        *   Adjust constants: ball speeds, paddle speeds (if applicable), spin effect strength, game dimensions, paddle sizes.
        *   Fine-tune collision response for satisfying gameplay feel.

*   **Step 8.4: Robust Disconnection Handling (Revisit).**
    *   Ensure all disconnection scenarios (in queue, in game, post-game) are handled gracefully on both server (cleaning up sessions, notifying others) and client (displaying appropriate messages, offering next steps).
    *   If a player disconnects mid-game, the spec says the game ends, no winner is declared, and the remaining player sees "[Opponent's Name] disconnected" with "New Game" option. Implement this server-side (stop game, emit specific event) and client-side (handle this event).

This blueprint provides a structured approach to building the Pong game, ensuring that each phase builds logically on the previous one.