const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/auth', authRoutes);
app.use('/chats', chatRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Render requiere bind a 0.0.0.0 y usar process.env.PORT
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${port}`);
});
