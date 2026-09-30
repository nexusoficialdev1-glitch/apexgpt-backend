const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware de autenticación
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

// GET /chats — lista todos los chats del usuario
router.get('/', authMiddleware, async (req, res) => {
    try {
        const chats = await prisma.chat.findMany({
            where: { userId: req.userId },
            include: { messages: { orderBy: { timestamp: 'asc' } } },
            orderBy: { updatedAt: 'desc' }
        });

        const formatted = chats.map(chat => ({
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt.getTime(),
            updatedAt: chat.updatedAt.getTime(),
            messages: chat.messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.getTime(),
                attachmentUri: m.attachmentUri,
                attachmentType: m.attachmentType,
                attachmentName: m.attachmentName
            }))
        }));

        res.json(formatted);
    } catch (e) {
        console.error('Error en GET /chats:', e);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// POST /chats — crear o actualizar un chat completo
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { id, title, messages } = req.body;

        if (!id || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        const chat = await prisma.chat.upsert({
            where: { id },
            update: { title, updatedAt: new Date() },
            create: { id, title, userId: req.userId }
        });

        await prisma.message.deleteMany({ where: { chatId: chat.id } });

        await prisma.message.createMany({
            data: messages.map(m => ({
                id: m.id,
                chatId: chat.id,
                role: m.role,
                content: m.content,
                attachmentUri: m.attachmentUri || null,
                attachmentType: m.attachmentType || null,
                attachmentName: m.attachmentName || null,
                timestamp: new Date(m.timestamp)
            }))
        });

        res.json({ ok: true, id: chat.id });
    } catch (e) {
        console.error('Error en POST /chats:', e);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// DELETE /chats/:id — borrar un chat
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const chat = await prisma.chat.findFirst({
            where: { id, userId: req.userId }
        });
        if (!chat) {
            return res.status(404).json({ error: 'Chat no encontrado' });
        }
        await prisma.chat.delete({ where: { id } });
        res.json({ ok: true });
    } catch (e) {
        console.error('Error en DELETE /chats/:id:', e);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// PATCH /chats/:id — renombrar un chat
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const chat = await prisma.chat.findFirst({
            where: { id, userId: req.userId }
        });
        if (!chat) {
            return res.status(404).json({ error: 'Chat no encontrado' });
        }

        await prisma.chat.update({
            where: { id },
            data: { title, updatedAt: new Date() }
        });
        res.json({ ok: true });
    } catch (e) {
        console.error('Error en PATCH /chats/:id:', e);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
