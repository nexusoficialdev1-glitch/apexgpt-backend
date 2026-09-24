const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
const prisma = new PrismaClient();

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

        // 2. Guardar o actualizar usuario en PostgreSQL
        const user = await prisma.user.upsert({
            where: { googleId },
            update: {
                email,
                name,
                picture
            },
            create: {
                googleId,
                email,
                name,
                picture
            }
        });

        // 3. Emitir token de sesión propio
        const sessionToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            sessionToken,
            user: {
                id: user.id,
                googleId: user.googleId,
                email: user.email,
                name: user.name,
                picture: user.picture
            }
        });

    } catch (error) {
        console.error('Error verificando token:', error.message);
        res.status(401).json({ error: 'Token inválido' });
    }
});

module.exports = router;