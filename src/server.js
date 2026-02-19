import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import sendMessageRouter from './routes/sendMessage.js';
import scheduleMessageRouter from './routes/scheduleMessage.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', sendMessageRouter);
app.use('/', scheduleMessageRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor WhatsApp Node rodando na porta ${PORT}`));
