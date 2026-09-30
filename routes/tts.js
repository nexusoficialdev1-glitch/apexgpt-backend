const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware de auth (mismo que chats)
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// POST /tts — convierte texto a audio con ElevenLabs
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Texto requerido' });
        }

        // Limitar longitud (ElevenLabs cobra por caracteres)
        const textLimited = text.substring(0, 800);

        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'nPczCjzI2devNBz1zQrb';
        const apiKey = process.env.ELEVENLABS_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'ELEVENLABS_API_KEY no configurada' });
        }

        // Llamar a ElevenLabs
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: textLimited,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs error:', errorText);
            return res.status(response.status).json({
                error: 'Error de ElevenLabs',
                details: errorText
            });
        }

        // Devolver el audio como stream
        res.setHeader('Content-Type', 'audio/mpeg');
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));

    } catch (e) {
        console.error('Error en POST /tts:', e);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
