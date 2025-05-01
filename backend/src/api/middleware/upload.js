import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../../utils/logger.js';

/**
 * Configure multer for file uploads
 * @param {string} uploadsDir - Directory path for uploads
 */
export function configureFileUpload(uploadsDir) {
    // Ensure uploads directory exists
    if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
    }

    // Configure multer for file uploads
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            // Create a unique filename with original extension
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const cleanFilename = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            cb(null, `${cleanFilename}-${uniqueSuffix}${ext}`);
        }
    });

    // File filter to accept only CSV and Excel files
    const fileFilter = (req, file, cb) => {
        // Accept csv, xls, xlsx files
        if (
            file.mimetype === 'text/csv' || 
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            // Handle other common csv/excel mime types that some clients might send
            file.mimetype === 'application/csv' ||
            file.mimetype === 'text/x-csv' ||
            file.mimetype === 'application/x-csv' ||
            file.mimetype === 'application/excel' ||
            file.mimetype === 'application/x-excel' ||
            file.originalname.endsWith('.csv') ||
            file.originalname.endsWith('.xls') ||
            file.originalname.endsWith('.xlsx')
        ) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Only CSV and Excel files are allowed. Got: ${file.mimetype}`), false);
        }
    };

    return multer({ 
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB limit
            files: 1 // Only allow one file at a time
        }
    });
}

/**
 * Handle multer errors
 */
export function handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large',
                message: 'The uploaded file exceeds the 50MB size limit.'
            });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Unexpected file',
                message: 'Please upload only one file at a time.'
            });
        }
    }
    next(err);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}