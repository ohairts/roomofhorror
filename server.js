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

// Data stores
let scores = {};  // e.g., { group1: 0, group2: 0, ... }
let selectionCounts = {}; // { group1: { plusOneSet: 0, minusHalfSet: 0 }, ... }

// Values to use in scoring logic (customize as needed)
const plusOneSetValues = ['value1', 'value2', 'value3'];       // <-- add real values
const minusHalfSetValues = ['bad1', 'bad2', 'bad3'];           // <-- add real values

app.use(express.static(path.join(__dirname, 'public')));

// Assign next available group
app.get('/getGroup', (req, res) => {
  if (groupCount >= maxGroups) return res.status(403).send("All groups are full");
  groupCount++;
  const groupName = `group${groupCount}`;
  scores[groupName] = 0;
  selectionCounts[groupName] = { plusOneSet: 0, minusHalfSet: 0 };
  res.redirect(`/${groupName}.html`);
});

// Reset the game state
app.get('/reset', (req, res) => {
  groupCount = 0;
  for (const group in scores) {
    delete scores[group];
    delete selectionCounts[group];
  }
  io.emit('scoreUpdate', scores);
  io.emit('selectionData', selectionCounts);
  res.send('Game has been reset.');
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Send current data
  socket.emit('scoreUpdate', scores);
  socket.emit('selectionData', selectionCounts);

  // Receive direct score updates
  socket.on('updateScore', ({ group, score }) => {
    if (!group || typeof score !== 'number') return;
    scores[group] = score;
    io.emit('scoreUpdate', scores);
  });

  // Receive dropdown selection info from client
  socket.on('selectionMade', ({ group, value }) => {
    if (!group || !scores[group]) return;

    if (!selectionCounts[group]) {
      selectionCounts[group] = { plusOneSet: 0, minusHalfSet: 0 };
    }

    if (plusOneSetValues.includes(value)) {
      scores[group] += 1;
      selectionCounts[group].plusOneSet += 1;
    } else if (minusHalfSetValues.includes(value)) {
      scores[group] -= 0.5;
      selectionCounts[group].minusHalfSet += 1;
    }

    io.emit('scoreUpdate', scores);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Emit selection data every 2 seconds to all connected clients
setInterval(() => {
  io.emit('selectionData', selectionCounts);
}, 2000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚪 Room of Horror running at http://localhost:${PORT}`));
