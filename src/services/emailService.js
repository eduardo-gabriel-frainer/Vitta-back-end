import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function escaparHtml(valor) {
  return String(valor).replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[caractere]);
}

export async function enviarEmailConsulta(destinatario, dadosConsulta) {
  const { medico, especialidade, data, horario } = dadosConsulta;

  const mailOptions = {
    from: '"Sistema Vitta" <no-reply@vitta.com>',
    to: destinatario,
    subject: 'Confirmação de Consulta - Vitta',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">Consulta Agendada com Sucesso!</h2>
        <p>Olá! Seguem abaixo os dados do seu agendamento:</p>
        <ul style="list-style-type: none; padding: 0;">
          <li>📌 <strong>Especialidade:</strong> ${escaparHtml(especialidade)}</li>
          <li>👨‍⚕️ <strong>Profissional:</strong> ${escaparHtml(medico)}</li>
          <li>📅 <strong>Data:</strong> ${escaparHtml(data)}</li>
          <li>⏰ <strong>Horário:</strong> ${escaparHtml(horario)}</li>
        </ul>
        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">Agradecemos por utilizar o sistema Vitta.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ E-mail de confirmação enviado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao enviar o e-mail:', error);
    throw error;
  }
}