import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import { logMessage } from '../utils/logger.js';

if (!fs.existsSync('./sessions')) {
    fs.mkdirSync('./sessions');
}

const clients = {};
const scheduledMessages = [];

/*
|--------------------------------------------------------------------------
| Inicializa sessão por clínica
|--------------------------------------------------------------------------
*/
export async function initSession(clinic_id) {

    if (clients[clinic_id]) {
        const existingClient = clients[clinic_id];

        if (existingClient.info) {
            return existingClient;
        }

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
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  }
});

    clients[clinic_id] = client;

    client.on('qr', qr => {
        console.log(`QR CODE clínica ${clinic_id}:`);
        console.log(qr);
    });

    client.on('ready', () => {
        console.log(`WhatsApp pronto para clínica ${clinic_id}`);
    });

    client.on('auth_failure', msg => {
        console.error(`Falha na autenticação ${clinic_id}`, msg);
    });

    client.on('disconnected', reason => {
        console.log(`Cliente ${clinic_id} desconectado:`, reason);
        delete clients[clinic_id];
    });

    await client.initialize();

    await new Promise(resolve => {
        client.once('ready', resolve);
    });

    return client;
}

/*
|--------------------------------------------------------------------------
| Envio imediato
|--------------------------------------------------------------------------
*/
export async function sendMessage(clinic_id, to, message, appointment_id) {

    try {
        const client = await initSession(clinic_id);

        await client.sendMessage(to, message);

        const message_id = `${clinic_id}-${Date.now()}`;

        logMessage({
            clinic_id,
            patient_phone: to,
            message_content: message,
            status: 'sent',
            type: 'immediate',
            appointment_id
        });

        return { success: true, message_id };

    } catch (err) {

        console.error("Erro envio:", err);

        logMessage({
            clinic_id,
            patient_phone: to,
            message_content: message,
            status: 'error',
            type: 'immediate',
            appointment_id
        });

        return { success: false, error: err.message };
    }
}

/*
|--------------------------------------------------------------------------
| Agendamento local
|--------------------------------------------------------------------------
*/
export function scheduleMessageLocal(clinic_id, to, message, send_at, appointment_id) {

    const date = new Date(send_at);

    scheduledMessages.push({
        clinic_id,
        to,
        message,
        send_at: date,
        appointment_id
    });

    logMessage({
        clinic_id,
        patient_phone: to,
        message_content: message,
        status: 'pending',
        type: 'scheduled',
        appointment_id
    });
}

/*
|--------------------------------------------------------------------------
| Cron para envio de mensagens agendadas
|--------------------------------------------------------------------------
*/
cron.schedule('* * * * *', async () => {

    const now = new Date();

    for (let i = scheduledMessages.length - 1; i >= 0; i--) {

        const msg = scheduledMessages[i];

        if (msg.send_at <= now) {

            await sendMessage(
                msg.clinic_id,
                msg.to,
                msg.message,
                msg.appointment_id
            );

            scheduledMessages.splice(i, 1);
        }
    }
});
