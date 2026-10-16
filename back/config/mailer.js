const nodemailer = require('nodemailer');

function getMailConfig() {
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
    return { user, pass };
}

function createTransporter() {
    const { user, pass } = getMailConfig();
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
    });
}

function describeMailError(error) {
    const code = error && error.code;
    const responseCode = error && error.responseCode;

    if (code === 'EAUTH' || responseCode === 535) {
        return 'No pudimos enviar el correo porque Gmail rechazó el usuario o la contraseña del sistema. La contraseña de aplicación debe tener 16 caracteres, sin espacios.';
    }
    if (code === 'EENVELOPE') {
        return 'El correo ingresado no puede recibir el mensaje.';
    }
    if (code === 'ESOCKET' || code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'EDNS') {
        return 'No pudimos conectar con el servicio de correo. Inténtalo de nuevo en unos minutos.';
    }
    return 'No pudimos enviar el correo de recuperación. Inténtalo de nuevo.';
}

module.exports = { createTransporter, getMailConfig, describeMailError };
