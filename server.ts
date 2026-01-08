/**
 * WhatsApp Multi-Device API & Control Panel
 * Powered by: @whiskeysockets/baileys
 * Features: Multi-session, Web Dashboard, Dynamic API Docs, Auto-recovery
 */

import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    ConnectionState 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import qrcode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

// --- CONFIGURATION ---
let API_KEY = "12345678"; // Change this for production
const SERVER_IP = "192.168.2.112"; // Your Ubuntu IP
const sessions = new Map();

// Serve static files from public directory
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

/**
 * Utility: Scans the session directory for existing device folders
 */
const getStoredFolders = () => {
    if (!fs.existsSync('./sessions')) fs.mkdirSync('./sessions');
    return fs.readdirSync('./sessions').filter(f => fs.lstatSync(`./sessions/${f}`).isDirectory());
};

/**
 * Core: Handles WhatsApp Socket initialization and event monitoring
 */
async function getSession(sessionId: string) {
    // Prevent duplicate connection attempts
    if (sessions.has(sessionId)) {
        const existing = sessions.get(sessionId);
        if (existing.status === 'connected' || existing.status === 'initializing') return existing.sock;
    }

    const sessionDir = `./sessions/${sessionId}`;
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
    });

    // Initialize memory state
    sessions.set(sessionId, { sock, status: 'initializing', qr: null });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        // 1. Handle QR Generation
        if (qr) {
            const qrImage = await qrcode.toDataURL(qr);
            sessions.set(sessionId, { sock, status: 'qr_ready', qr: qrImage });
        }

        // 2. Handle Successful Connection
        if (connection === 'open') {
            console.log(`✅ [${sessionId}] Connection Established`);
            sessions.set(sessionId, { sock, status: 'connected', qr: null });
        }

        // 3. Handle Disconnections
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log(`🔄 [${sessionId}] Reconnecting...`);
                setTimeout(() => getSession(sessionId), 3000);
            } else {
                console.log(`❌ [${sessionId}] Logged Out Permanently`);
                sessions.delete(sessionId);
                if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
            }
        }
    });

    return sock;
}

/**
 * Middleware: Protects routes with the API Key
 */
const validateKey = (req: any, res: any, next: any) => {
    if (req.query.key !== API_KEY) return res.status(401).send("Invalid API Key");
    next();
};

// --- WEB DASHBOARD ROUTE ---
// Serve the main HTML file with embedded config
app.get('/', (req, res) => {
    // Read the HTML file and inject configuration
    const htmlPath = path.join(publicPath, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');
    
    // Escape values to prevent XSS
    const escapeJson = (str: string) => {
        return str.replace(/\\/g, '\\\\')
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r')
                  .replace(/\t/g, '\\t');
    };
    
    // Inject configuration as a script tag before closing head
    const configScript = `
    <script>
        window.APP_CONFIG = {
            apiKey: "${escapeJson(API_KEY)}",
            serverIp: "${escapeJson(SERVER_IP)}",
            port: ${port}
        };
    </script>
    `;
    html = html.replace('</head>', configScript + '</head>');
    
    res.send(html);
});

// API endpoint to get non-sensitive configuration for frontend (protected)
app.get('/api/config', validateKey, (req, res) => {
    res.json({ 
        serverIp: SERVER_IP, 
        port: port 
    });
});

// --- API ENDPOINTS ---

/**
 * Endpoint: Returns status of all stored and active sessions
 */
app.get('/status-all', validateKey, (req, res) => {
    const stored = getStoredFolders();
    const result = stored.map(id => ({ 
        id, 
        status: sessions.get(id)?.status || 'offline' 
    }));
    res.json(result);
});

/**
 * Endpoint: Forces connection initialization for a specific session
 */
app.get('/connect', validateKey, async (req, res) => {
    getSession(req.query.session as string);
    res.send("Processing session initialization...");
});

/**
 * Endpoint: Fetches current QR or Connection Status for a session
 */
app.get('/get-qr', validateKey, (req, res) => {
    const s = sessions.get(req.query.session);
    res.json({ qr: s?.qr || null, status: s?.status || 'none' });
});

/**
 * Endpoint: Disconnects and purges a session
 */
app.get('/logout', validateKey, async (req, res) => {
    const { session } = req.query;
    if (sessions.has(session)) await sessions.get(session).sock.logout();
    else if (fs.existsSync(`./sessions/${session}`)) fs.rmSync(`./sessions/${session}`, { recursive: true });
    res.send("Session purged successfully.");
});

/**
 * Endpoint: Sending Text
 */
app.get('/send-text', validateKey, async (req, res) => {
    const { session, number, msg } = req.query;
    const s = sessions.get(session);
    if (s?.status === 'connected') {
        await s.sock.sendMessage(`${number}@s.whatsapp.net`, { text: msg as string });
        return res.send("Message sent.");
    }
    res.status(400).send("Session not active.");
});

/**
 * Endpoint: Sending PDF
 */
app.get('/send-pdf', validateKey, async (req, res) => {
    const { session, number, url } = req.query;
    const s = sessions.get(session);
    if (s?.status === 'connected') {
        await s.sock.sendMessage(`${number}@s.whatsapp.net`, { 
            document: { url: url as string }, 
            mimetype: 'application/pdf', 
            fileName: 'document.pdf'
        });
        return res.send("PDF sent.");
    }
    res.status(400).send("Session not active.");
});

/**
 * Startup: Re-link all previously connected sessions automatically
 */
const boot = async () => {
    const folders = getStoredFolders();
    for (const id of folders) {
        if (fs.existsSync(`./sessions/${id}/creds.json`)) {
            console.log(`🚀 System: Re-activating session ${id}`);
            getSession(id).catch(() => {});
        }
    }
};

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Management Dashboard: http://${SERVER_IP}:${port}`);
    boot();
});
