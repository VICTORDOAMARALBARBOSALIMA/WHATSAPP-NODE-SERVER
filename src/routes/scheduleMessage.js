import express from 'express';
import { scheduleMessageLocal } from '../whatsappService.js';

const router = express.Router();

router.post('/schedule-message', (req, res) => {
    const { token, clinic_id, patient_phone, message_content, send_at, appointment_id } = req.body;

    if (token !== process.env.API_TOKEN) return res.status(403).json({ success: false, error: 'Token inválido' });
    if (!clinic_id || !patient_phone || !message_content || !send_at) return res.status(400).json({ success: false, error: 'Campos obrigatórios' });

    scheduleMessageLocal(clinic_id, patient_phone, message_content, send_at, appointment_id);
    return res.json({ success: true, scheduled: true });
});

export default router;
