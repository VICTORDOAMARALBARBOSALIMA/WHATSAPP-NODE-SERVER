import express from 'express';
import { sendMessage } from '../whatsappService.js';

const router = express.Router();

router.post('/send-message', async (req, res) => {
    const { token, clinic_id, patient_phone, message_content, appointment_id } = req.body;

    if (token !== process.env.API_TOKEN) return res.status(403).json({ success: false, error: 'Token inválido' });
    if (!clinic_id || !patient_phone || !message_content) return res.status(400).json({ success: false, error: 'Campos obrigatórios' });

    const result = await sendMessage(clinic_id, patient_phone, message_content, appointment_id);
    return res.json(result);
});

export default router;
