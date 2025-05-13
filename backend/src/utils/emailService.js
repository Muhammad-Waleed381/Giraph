import nodemailer from 'nodemailer';
import { logger } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

let transporter;

async function getEmailServiceConfig() {
    // Priority 1: Gmail credentials from .env
    if (process.env.EMAIL_SERVICE_PROVIDER === 'gmail' && process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        logger.info('Using Gmail SMTP configuration from .env');
        return {
            host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
            port: parseInt(process.env.EMAIL_PORT || '465', 10),
            secure: process.env.EMAIL_SECURE === 'true', // true for port 465 (SSL)
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail address
                pass: process.env.EMAIL_PASS, // Your Gmail App Password
            },
            // Recommended for Gmail to avoid self-signed certificate errors with some environments
            // tls: {
            //     rejectUnauthorized: false
            // }
        };
    }

    // Priority 2: Static Ethereal credentials from .env
    if (process.env.ETHEREAL_HOST && process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
        logger.info('Using Ethereal SMTP configuration from .env');
        return {
            host: process.env.ETHEREAL_HOST,
            port: parseInt(process.env.ETHEREAL_PORT || '587', 10),
            secure: (process.env.ETHEREAL_PORT === '465'),
            auth: {
                user: process.env.ETHEREAL_USER,
                pass: process.env.ETHEREAL_PASS,
            },
        };
    }
    
    // Priority 3: Fallback to dynamic Ethereal account creation
    logger.info('No primary email service configured, creating a dynamic Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    logger.info('Dynamic Ethereal test account created:');
    logger.info(`User: ${testAccount.user}`);
    logger.info(`Pass: ${testAccount.pass}`);
    logger.info(`Preview URL Base: ${nodemailer.getTestMessageUrl({messageId: 'temp-id'}).split('/message/')[0]}`);
    return {
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    };
}

async function getTransporter() {
    if (!transporter) {
        try {
            const emailConfig = await getEmailServiceConfig();
            transporter = nodemailer.createTransport(emailConfig);
            logger.info(`Nodemailer transporter configured using host: ${emailConfig.host}`);
        } catch (error) {
            logger.error('Failed to create Nodemailer transporter:', error);
            transporter = {
                sendMail: async (mailOptions) => {
                    logger.warn('Email transporter setup failed. Logging email to console instead:');
                    logger.info(`To: ${mailOptions.to}`);
                    logger.info(`From: ${mailOptions.from}`);
                    logger.info(`Subject: ${mailOptions.subject}`);
                    logger.info(`HTML: ${mailOptions.html}`);
                    return { messageId: `console-fallback-${Date.now()}` };
                }
            };
        }
    }
    return transporter;
}

/**
 * Sends an email.
 * @param {Object} mailOptions - Options for sending mail (to, subject, html, etc.).
 * @returns {Promise<Object>} Nodemailer info object upon success.
 * @throws {Error} If sending mail fails.
 */
export const sendEmail = async (mailOptions) => {
    try {
        const mailer = await getTransporter();
        const effectiveFrom = process.env.EMAIL_FROM || '"Giraph Platform" <no-reply@giraph.ai>';
        
        const info = await mailer.sendMail({
            from: effectiveFrom,
            ...mailOptions,
        });

        logger.info(`Email sent via ${transporter.options.host || 'configured service'}. Message ID: ${info.messageId}`);
        if (nodemailer.getTestMessageUrl(info)) {
            // This URL is primarily for Ethereal. Gmail won't provide a direct preview URL here.
            logger.info(`Ethereal Preview URL (if applicable): ${nodemailer.getTestMessageUrl(info)}`);
        }
        return info;
    } catch (error) {
        logger.error('Error sending email:', error);
        // Add more details from the error object if available
        if (error.response) {
            logger.error(`Email error response: ${error.response}`);
        }
        if (error.responseCode) {
            logger.error(`Email error response code: ${error.responseCode}`);
        }
        throw new Error('Failed to send email.');
    }
};

// Example function to send verification email
export const sendVerificationEmail = async (to, token) => {
    const verificationLink = `${process.env.BACKEND_APP_URL || 'http://localhost:3001'}/api/auth/verify-email/${token}`;
    const subject = 'Verify Your Email Address for Giraph Platform';
    const htmlContent = `
        <h1>Welcome to Giraph!</h1>
        <p>Thanks for signing up. Please verify your email address by clicking the link below:</p>
        <a href="${verificationLink}" target="_blank">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not sign up for Giraph, please ignore this email.</p>
        <br>
        <p>Best regards,</p>
        <p>The Giraph Team</p>
    `;

    return sendEmail({
        to: to,
        subject: subject,
        html: htmlContent,
    });
};
