export function logMessage({ clinic_id, patient_phone, message_content, status, type, appointment_id }) {
    console.log(`[${new Date().toISOString()}] [${status}] [${type}] Clinic: ${clinic_id}, To: ${patient_phone}, Msg: ${message_content}, Appointment: ${appointment_id || 'N/A'}`);
}
