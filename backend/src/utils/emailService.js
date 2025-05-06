import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

// Configure the email transport using environment variables
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // Use service name (e.g., 'gmail') OR host/port for generic SMTP
    host: process.env.EMAIL_HOST,       // Required if service is not specified or is 'smtp'
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined, // Required if service is not specified or is 'smtp'
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports (like 587 with STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Optional: Add TLS configuration if needed, e.g., for self-signed certs
    // tls: {
    //     rejectUnauthorized: false
    // }
});

/**
 * Sends an email.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject line.
 * @param {string} text - Plain text body of the email.
 * @param {string} [html] - HTML body of the email (optional).
 * @returns {Promise<boolean>} - True if email was sent successfully, false otherwise.
 */
export const sendEmail = async (to, subject, text, html) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM, // Sender address (e.g., '"Your App Name" <noreply@example.com>')
        to: to,                       // List of receivers
        subject: subject,             // Subject line
        text: text,                   // Plain text body
        html: html                    // HTML body (optional)
    };

    try {
        await transporter.verify(); // Verify connection configuration
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        logger.error(`Error sending email to ${to}:`, error);
        // Log specific details if available
        if (error.response) {
            logger.error(`Email error response: ${error.response}`);
        }
        if (error.responseCode) {
            logger.error(`Email error code: ${error.responseCode}`);
        }
        return false;
    }
};
