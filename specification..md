# Pong Multiplayer Game: Technical Specification

## 1. Project Overview

The project is to develop a real-time multiplayer Pong game. Two players connect to a central server, controlling paddles on their respective screens. A ball moves across the game area, bouncing off paddles and walls. Points are scored when an opponent misses the ball. The game state (paddle positions, ball position, score) must be synchronized across both players' browsers in real-time.

The implementation will use:
*   **Frontend:** React with TypeScript
*   **Backend:** Node.js with TypeScript
*   **Real-Time Communication:** Socket.IO

## 2. Core Requirements (from initial idea)

*   **Implement Real-Time Communication:**
    *   Successfully integrate Socket.IO on both client (React) and server (Node.js).
    *   Establish and manage WebSocket connections for multiple players.
    *   Emit and listen for custom events to synchronize critical game state (paddle movements, ball position, score updates) in real-time.
*   **Develop a Node.js Backend for Game Logic:**
    *   Create a Node.js server using TypeScript as the authoritative source for game logic.
    *   Implement basic game session/room management to pair two players.
    *   Develop core game mechanics on the server: ball movement, simple physics (bounces), collision detection (ball with paddles, ball with walls), and scoring.
*   **Build an Interactive React Frontend:**
    *   Construct a responsive game interface using React and TypeScript for game area, paddles, ball, and scores.
    *   Capture player input (mouse movement for paddle control) and communicate actions to the server.
    *   Dynamically update the UI based on real-time game state received from the server.
*   **Apply TypeScript & Full-Stack Integration:**
    *   Utilize TypeScript for type safety and code organization across frontend and backend.
    *   Integrate frontend and backend into a cohesive, playable multiplayer game.
    *   Demonstrate understanding of data flow between client, server, and across clients.

## 3. Detailed Feature Specifications

### 3.1. Joining a Game & Matchmaking

*   **Initial Screen:**
    *   Players see a div with an input field labeled "Your Name" and a "Join Game" button.
*   **Joining Process:**
    *   Player enters their name and clicks "Join Game".
    *   The client connects to the server via Socket.IO.
*   **Waiting for Opponent (First Player):**
    *   The first player to join sees the initial game screen:
        *   Their paddle is visible.
        *   The ball is stationary in the middle of the screen.
        *   Paddle movement is disabled.
    *   No explicit "Waiting for opponent..." message is displayed on this screen initially.
*   **Matchmaking Logic:**
    *   The server uses a first-come, first-served queue for matchmaking.
    *   When a second player joins, the server pairs them with the first waiting player to form a game session.
*   **Game Start Trigger:**
    *   As soon as the second player joins and is paired, the game starts automatically for both players.
    *   Player 1's paddle controls become enabled.

### 3.2. Gameplay

*   **Player Perspective & Paddle Assignment:**
    *   Both players view the game as if they are controlling the bottom paddle.
    *   The server internally assigns one player to defend the "actual" top edge and the other to defend the "actual" bottom edge of the game world. This assignment is consistent for the duration of the match (e.g., the first player to join the pair defends the bottom, the second defends the top).
*   **Paddle Control:**
    *   Players control their paddles using horizontal mouse movement.
    *   The paddle's horizontal position directly mirrors the mouse cursor's horizontal position relative to the entire browser window.
    *   Paddles are constrained and stop at the left and right edges of the playable game area.
    *   **Client-Side Prediction (Own Paddle):**
        *   The client immediately updates the player's own paddle position locally for smooth, instant feedback.
        *   The client sends the movement (new desired position or mouse coordinate) to the server.
        *   The server validates the movement and sends back the authoritative paddle position.
        *   If the server's authoritative position differs, the client smoothly corrects its local paddle position (e.g., via interpolation or a quick snap).
    *   **Opponent's Paddle:** The opponent's paddle position is rendered based solely on updates received from the server.
*   **Ball Movement & Initial State:**
    *   When the game starts (or after a point is scored), the ball begins at the center of the screen.
    *   The initial direction of the ball (towards Player 1 or Player 2, and its vertical angle) is randomized by the server. The angle should be within a reasonable range to ensure playability (e.g., not perfectly horizontal or vertical).
*   **Ball Speed:**
    *   The ball has a base speed when served.
    *   The ball's speed can increase during a rally due to the "spin" mechanic (see below).
    *   There is a maximum speed limit for the ball.
    *   The ball's speed resets to its base level after each point is scored.
*   **Ball Collision - Paddles:**
    *   **Reflection Angle:** Depends on where the ball strikes the paddle's width.
        *   Hitting the center results in a more perpendicular (direct) bounce.
        *   Hitting closer to the paddle's edges results in a sharper, more angled bounce.
    *   **"Spin" Mechanic:**
        *   If the paddle is moving horizontally at a speed exceeding a predefined threshold at the moment of impact:
            *   The ball receives an additional horizontal "push" in the direction of the paddle's movement.
            *   The ball's overall speed increases.
*   **Ball Collision - Walls:**
    *   The ball bounces off the top and bottom walls of the game area.
    *   This is a simple reflection: the angle of incidence equals the angle of reflection.
*   **Scoring:**
    *   A point is scored for the opponent if a player fails to hit the ball and it passes their baseline (i.e., hits the top edge of the game area for the player defending the top, or the bottom edge for the player defending the bottom).
    *   The score display (`[Player 1 Name] [P1 Score] VS [P2 Score] [Player 2 Name]`) updates instantly.
*   **Post-Score:**
    *   The ball resets to the center of the screen.
    *   The ball is then served automatically towards the player who was just scored upon.

### 3.3. Game End & Post-Game Options

*   **Winning Condition:**
    *   The first player to reach 5 points wins the game.
*   **Game Over Display:**
    *   A message "Winner is [Player Name]" is displayed to both players.
*   **Post-Game Options:**
    *   Two buttons appear: "Play Again" and "New Game".
*   **"Play Again" (Rematch):**
    *   If a player clicks "Play Again," they enter a state waiting for their opponent.
    *   A message "Waiting for [Opponent's Name]..." is displayed.
    *   The rematch starts only if *both* players click "Play Again".
    *   If one player clicks "Play Again" and the other clicks "New Game" (or disconnects):
        *   The player who clicked "Play Again" receives a notification: "[Opponent's Name] has left. Click 'New Game' to find another match." Their "Play Again" option may be disabled/removed.
        *   The player who clicked "New Game" returns to the initial "waiting for opponent" state (as if they just joined).
*   **"New Game":**
    *   The player is returned to the matchmaking queue to be paired with a new, available opponent (first-come, first-served). They will see the initial game screen (ball in middle, paddle disabled) while waiting.

### 3.4. Disconnections

*   **Mid-Game Disconnection:**
    *   If a player disconnects (e.g., closes tab, loses connection) during an active game:
        *   The game ends immediately.
        *   No winner is declared for that game.
        *   The remaining player is notified: "[Opponent's Name] disconnected."
        *   The remaining player is presented with a "New Game" option, allowing them to rejoin the matchmaking queue.

### 3.5. Visuals & UI Elements

*   **Game Area:**
    *   Clearly defined boundaries.
    *   A visual-only dotted center line (no impact on ball physics).
    *   **Aspect Ratio:** To be determined by the developer, ensuring a good playfield. Consider a common landscape aspect ratio.
*   **Paddles:**
    *   Approximate dimensions: 50px wide, 5px thick (can be fine-tuned).
*   **Ball:**
    *   Size comparable to paddle thickness (e.g., 5px diameter; can be fine-tuned).
*   **Score Display:**
    *   Shows `[Player 1 Name] [Player 1 Score] VS [Player 2 Score] [Player 2 Name]`.
    *   Positioned visibly on screen (e.g., top-center). Updates instantly.
*   **Colors:** (Developer can choose a suitable palette, e.g., classic arcade or modern).
    *   Game background
    *   Paddles
    *   Ball
    *   Center dotted line
    *   Score text
    *   Button styling for "Join Game", "Play Again", "New Game".

### 3.6. Audio

*   **Collision Sound:** One sound effect for when the ball hits a paddle OR a top/bottom wall.
*   **Score Sound:** A distinct sound effect when a point is scored.
*   **Game Win Sound:** A sound effect played to the winner when the game ends.
*   **Game Lose Sound:** A different sound effect played to the loser when the game ends.

## 4. Technical Architecture

*   **Frontend:**
    *   Framework: React
    *   Language: TypeScript
    *   State Management: (Developer choice, e.g., Context API, Zustand, Redux Toolkit)
    *   Real-Time Communication: Socket.IO client
*   **Backend:**
    *   Environment: Node.js
    *   Language: TypeScript
    *   Framework: (Developer choice, e.g., Express.js for handling initial HTTP and Socket.IO setup)
    *   Real-Time Communication: Socket.IO server
*   **Real-Time Communication (Socket.IO):**
    *   **Events (Client to Server):**
        *   `joinGame`: { playerName: string }
        *   `paddleMove`: { newYPosition: number } (or equivalent mouse coordinate)
        *   `requestRematch`: {}
        *   `requestNewGame`: {}
    *   **Events (Server to Client/s):**
        *   `gameStart`: { opponentName: string, playerAssignment: 'player1' | 'player2', initialBallState: {...} } // playerAssignment indicates if they are top or bottom defender
        *   `gameStateUpdate`: { ballPosition: {x, y}, player1PaddleY: number, player2PaddleY: number } // Positions are in server's coordinate system
        *   `scoreUpdate`: { player1Score: number, player2Score: number, newBallState: {...} }
        *   `gameOver`: { winnerName: string }
        *   `opponentDisconnected`: { opponentName: string }
        *   `waitingForRematchOpponent`: {}
        *   `rematchDeclined`: {} // When opponent chooses new game instead of rematch
    *   **Update Frequency:** Server emits `gameStateUpdate` for ball and paddle positions at a rate of 20-60 Hz. Clients use interpolation to smooth ball rendering between updates.

## 5. Data Flow & Synchronization

*   The Node.js server is the **authoritative source** for all game logic, including:
    *   Paddle positions (after validation).
    *   Ball position, velocity, and physics.
    *   Collision detection.
    *   Score.
    *   Game state (waiting, active, game over).
*   Client input (mouse movements for paddle) is sent to the server.
*   The server processes inputs, updates the game state, and broadcasts relevant changes to both connected clients in the game session.

## 6. Game Session/Room Management

*   The server will manage game sessions. A session consists of two paired players.
*   Basic matchmaking pairs the first available player with the next player who joins.
*   The server handles logic for initiating rematches (both players agree) or transitioning players to new games.
*   Session data includes player names, scores, and current game state.

## 7. Error Handling & Edge Cases

*   **Disconnections:** Gracefully handle player disconnections at any stage (waiting, in-game, post-game) by notifying the other player and ending the session appropriately.
*   **Simultaneous Actions:** Server logic should handle potentially near-simultaneous inputs if necessary (though for Pong, turn-based aspects are minimal beyond initial serve).
*   **Invalid Input:** Server should validate inputs (e.g., paddle movements within bounds) but primarily rely on client-side constraints.
*   **Network Latency:** Client-side prediction for own paddle and interpolation for ball/opponent paddle are key strategies to mitigate perceived latency.

## 8. Testing Plan (High-Level)

*   **Unit Tests (Backend - Node.js/TypeScript):**
    *   Game logic: Ball movement, collision detection (ball-paddle, ball-wall), bounce physics (angle, spin effect, speed changes).
    *   Scoring logic.
    *   Serve mechanics.
    *   Socket.IO event handlers on the server (mocking client events).
    *   Matchmaking logic.
*   **Unit Tests (Frontend - React/TypeScript):**
    *   React components rendering correctly based on props.
    *   Local paddle movement prediction logic.
    *   Socket.IO event handlers on the client (mocking server events).
    *   UI updates in response to game state changes.
*   **Integration Tests:**
    *   Client-server communication:
        *   Player joining and name registration.
        *   Sending paddle movements and receiving authoritative updates.
        *   Receiving game state updates (ball, opponent paddle, score).
        *   Correct handling of game start, point scored, game over events.
    *   Full game flow: Test two clients connecting, playing a full game, scoring, winning, and rematching/starting new game.
*   **End-to-End (E2E) Tests:**
    *   Use a framework like Cypress or Playwright to simulate two users interacting with the game in browsers.
    *   Verify the entire user journey from joining to game completion.
    *   Check visual synchronization between two clients.
*   **Usability & Gameplay Testing:**
    *   Responsiveness of paddle controls (impact of prediction and server correction).
    *   Smoothness of ball movement (impact of interpolation).
    *   Clarity of UI, score, and game state indicators.
    *   Fun factor and game balance (ball speed, spin effect).

## 9. Open Questions / Points for Developer Discretion

*   **Exact Playing Area Aspect Ratio:** While a landscape orientation is implied, the exact ratio (e.g., 16:9, 4:3) is for the developer to decide or prototype.
*   **Physics Tuning:**
    *   Precise formulas for how impact point on paddle translates to bounce angle.
    *   Precise formulas for how paddle speed ("spin") translates to changes in ball angle and speed.
    *   Specific values for base ball speed, maximum ball speed, and the paddle speed threshold required to activate the "spin" effect. These will likely require iteration and playtesting.
*   **Visual Styling:** Specific colors, fonts, and overall aesthetic beyond the core functional elements.
*   **Sound Asset Selection:** Specific sound files for the described audio events.

This specification should provide a solid foundation for development. Good luck!