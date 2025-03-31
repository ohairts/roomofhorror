// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());

// Constants
const maxGroups = 16;
let groupCount = 0;

// Store scores only for active groups
let scores = {};  // e.g., { group1: 0, group2: 0, ... }

app.use(express.static(path.join(__dirname, 'public')));

// Assign next available group
app.get('/getGroup', (req, res) => {
  if (groupCount >= maxGroups) return res.status(403).send("All groups are full");
  groupCount++;
  const groupName = `group${groupCount}`;
  scores[groupName] = 0;
  res.redirect(`/${groupName}.html`);
});

// Reset the game state
app.get('/reset', (req, res) => {
  groupCount = 0;
  for (const group in scores) {
    delete scores[group];
  }
  io.emit('scoreUpdate', scores); // Clear scores on connected leaderboards
  res.send('Game has been reset.');
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Send current scores to the newly connected client
  socket.emit('scoreUpdate', scores);

  // Receive score updates from any group
  socket.on('updateScore', ({ group, score }) => {
    if (!group || typeof score !== 'number') return;
    scores[group] = score;
    io.emit('scoreUpdate', scores); // Broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚪 Room of Horror running at http://localhost:${PORT}`));
