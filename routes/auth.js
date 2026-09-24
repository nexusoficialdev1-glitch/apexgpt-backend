const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

// POST /auth/google
router.post('/google', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'Falta idToken' });
    }

    try {
        // 1. Verificar token con Google
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_WEB_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // 2. TODO: buscar o crear usuario en tu DB
        // const user = await db.findOrCreate({ googleId, email, name });

        // 3. Emitir TU propio token de sesión
        const sessionToken = jwt.sign(
            { userId: googleId, email, name },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            sessionToken,
            user: { googleId, email, name, picture }
        });

    } catch (error) {
        console.error('Error verificando token:', error.message);
        res.status(401).json({ error: 'Token inválido' });
    }
});

module.exports = router;