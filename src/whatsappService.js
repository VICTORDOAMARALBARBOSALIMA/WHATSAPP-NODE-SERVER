import pkg from "whatsapp-web.js";
import path from 'path';
import fs from 'fs';
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import { logMessage } from '../utils/logger.js';

if (!fs.existsSync('./sessions')) fs.mkdirSync('./sessions');

const { Client, LocalAuth } = pkg;
const clients = {};
const scheduledMessages = [];

// Inicializa sessão WhatsApp
export async function initSession(clinic_id) {
    if (clients[clinic_id]) {
        const existingClient = clients[clinic_id];

        if (existingClient.info) {
            return existingClient; // já está pronto
        }

        // espera ficar ready
        await new Promise(resolve => {
            existingClient.once('ready', resolve);
        });

        return existingClient;
    }

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: clinic_id,
            dataPath: path.resolve('./sessions')
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    clients[clinic_id] = client;

    await client.initialize();

    await new Promise(resolve => {
        client.once('ready', resolve);
    });

    return client;
}

// Envio imediato
export async function sendMessage(clinic_id, to, message, appointment_id) {
    const client = await initSession(clinic_id);

    try {
        await client.sendMessage(to, message);
        const message_id = `${clinic_id}-${Date.now()}`;
        logMessage({ clinic_id, patient_phone: to, message_content: message, status: 'sent', type: 'immediate', appointment_id });
        return { success: true, message_id };
    } catch (err) {
        logMessage({ clinic_id, patient_phone: to, message_content: message, status: 'error', type: 'immediate', appointment_id });
        return { success: false, error: err.message };
    }
}

// Agendamento
export function scheduleMessageLocal(clinic_id, to, message, send_at, appointment_id) {
    const date = new Date(send_at);
    scheduledMessages.push({ clinic_id, to, message, send_at: date, appointment_id });
    logMessage({ clinic_id, patient_phone: to, message_content: message, status: 'pending', type: 'scheduled', appointment_id });
}

// Cron para enviar mensagens agendadas
cron.schedule('* * * * *', async () => {
    const now = new Date();
    for (let i = scheduledMessages.length - 1; i >= 0; i--) {
        const msg = scheduledMessages[i];
        if (msg.send_at <= now) {
            await sendMessage(msg.clinic_id, msg.to, msg.message, msg.appointment_id);
            scheduledMessages.splice(i, 1);
        }
    }
});
