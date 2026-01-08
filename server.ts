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

const app = express();
const port = 3000;

// --- CONFIGURATION ---
let API_KEY = "12345678"; // Change this for production
const SERVER_IP = "192.168.2.112"; // Your Ubuntu IP
const sessions = new Map();

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
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WA API Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        <style>body { font-family: 'Inter', sans-serif; background: #f8fafc; }</style>
    </head>
    <body class="p-4 md:p-8">
        <div class="max-w-6xl mx-auto">
            <header class="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
                <div class="flex items-center gap-4">
                    <div class="bg-blue-600 p-3 rounded-2xl text-white">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                    </div>
                    <div>
                        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">WhatsApp Manager</h1>
                        <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Multi-Device API Infrastructure</p>
                    </div>
                </div>
                <div class="text-center md:text-right">
                    <span class="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-mono border border-blue-100 shadow-sm inline-block">Key: ${API_KEY}</span>
                </div>
            </header>

            <div class="grid lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1 space-y-6">
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h2 class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-tighter">Add New Session</h2>
                        <div class="flex flex-col gap-3">
                            <input id="sname" type="text" placeholder="Session ID (e.g. Sales)" class="w-full border-slate-200 border p-3 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 focus:border-blue-500 transition-all">
                            <button onclick="connectNew()" class="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95">Register Device</button>
                        </div>
                    </div>

                    <div id="session-list" class="space-y-4">
                        </div>
                </div>

                <div class="lg:col-span-2">
                    <div id="docs-panel" class="bg-slate-900 text-slate-300 p-8 rounded-[2rem] shadow-2xl min-h-[500px] border border-slate-800 transition-all">
                        <div id="docs-content" class="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50 py-20">
                            <svg class="w-16 h-16 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <p class="text-lg font-medium">Select a device to view API Documentation</p>
                        </div>
                    </div>
                </div>
            </div>

            <div id="qr-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                <div class="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full border border-white">
                    <h3 id="qr-title" class="text-2xl font-extrabold text-slate-800 mb-2">Scan QR</h3>
                    <p class="text-sm text-slate-400 mb-8">Open WhatsApp Settings > Linked Devices</p>
                    <div id="qr-target" class="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 mb-8 flex justify-center min-h-[240px] items-center">
                         <div class="animate-pulse text-slate-400 text-sm font-medium">Waiting for Secure Token...</div>
                    </div>
                    <button onclick="closeModal()" class="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all">Dismiss</button>
                </div>
            </div>
        </div>

        <script>
            let pollInterval = null;

            async function refresh() {
                const res = await fetch('/status-all?key=${API_KEY}');
                const data = await res.json();
                const container = document.getElementById('session-list');
                
                container.innerHTML = data.map(s => \`
                    <div onclick="showDocs('\${s.id}', '\${s.status}')" class="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-500 hover:shadow-md transition-all flex justify-between items-center">
                        <div class="flex items-center gap-4">
                            <div class="w-2.5 h-2.5 rounded-full \${s.status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-400'}"></div>
                            <div>
                                <h3 class="font-bold text-slate-800 text-lg">\${s.id}</h3>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">\${s.status}</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                             \${s.status !== 'connected' ? \`<button onclick="event.stopPropagation(); openQR('\${s.id}')" class="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg></button>\` : ''}
                             <button onclick="event.stopPropagation(); del('\${s.id}')" class="p-2.5 bg-slate-50 text-slate-300 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg></button>
                        </div>
                    </div>
                \`).join('');
            }

            function showDocs(id, status) {
                const docs = document.getElementById('docs-panel');
                const base = 'http://${SERVER_IP}:${port}';
                
                docs.innerHTML = \`
                    <div id="docs-content" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div class="flex items-center justify-between mb-10 border-b border-slate-800 pb-6">
                            <div>
                                <h2 class="text-white text-3xl font-extrabold tracking-tight">API Documentation</h2>
                                <p class="text-blue-400 font-bold text-xs uppercase tracking-widest mt-1">Session: \${id}</p>
                            </div>
                            <span class="px-4 py-1.5 bg-slate-800 rounded-full text-xs font-bold text-slate-400 border border-slate-700 uppercase">\${status}</span>
                        </div>

                        <div class="space-y-8">
                            <div>
                                <label class="text-white text-sm font-bold block mb-3 flex items-center gap-2">
                                    <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> 1. Send Text Message
                                </label>
                                <div class="bg-black/40 p-5 rounded-2xl border border-white/5 font-mono text-xs break-all text-slate-300 hover:text-white transition-colors cursor-all-scroll shadow-inner">
                                    GET \${base}/send-text?session=\${id}&number=91XXXXXXXXXX&msg=Hello&key=${API_KEY}
                                </div>
                            </div>

                            <div>
                                <label class="text-white text-sm font-bold block mb-3 flex items-center gap-2">
                                    <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> 2. Send PDF Document
                                </label>
                                <div class="bg-black/40 p-5 rounded-2xl border border-white/5 font-mono text-xs break-all text-slate-300 hover:text-white transition-colors cursor-all-scroll shadow-inner">
                                    GET \${base}/send-pdf?session=\${id}&number=91XXXXXXXXXX&url=YOUR_PDF_URL&key=${API_KEY}
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4 pt-4">
                                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p class="text-blue-400 text-[10px] font-bold uppercase mb-1">Status Code</p>
                                    <p class="text-white font-mono text-xs tracking-tighter">GET /get-qr?session=\${id}</p>
                                </div>
                                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p class="text-blue-400 text-[10px] font-bold uppercase mb-1">Method</p>
                                    <p class="text-white font-mono text-xs uppercase">HTTP GET REQUEST</p>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            }

            function openQR(id) {
                document.getElementById('qr-modal').classList.remove('hidden');
                document.getElementById('qr-target').innerHTML = '<div class="animate-pulse text-slate-400 text-sm">Initializing...</div>';
                fetch(\`/connect?session=\${id}&key=${API_KEY}\`);
                startPolling(id);
            }

            function closeModal() {
                document.getElementById('qr-modal').classList.add('hidden');
                clearInterval(pollInterval);
            }

            function connectNew() {
                const id = document.getElementById('sname').value;
                if(!id) return alert('Enter a session name');
                openQR(id);
            }

            function startPolling(id) {
                clearInterval(pollInterval);
                pollInterval = setInterval(async () => {
                    const res = await fetch(\`/get-qr?session=\${id}&key=${API_KEY}\`);
                    const data = await res.json();
                    if(data.qr) document.getElementById('qr-target').innerHTML = \`<img src="\${data.qr}" class="w-52 h-52 rounded-2xl shadow-2xl bg-white p-2 border border-slate-100 animate-in zoom-in-95 duration-300">\`;
                    if(data.status === 'connected') {
                        document.getElementById('qr-target').innerHTML = '<div class="text-green-500 font-bold text-xl animate-bounce">Connected!</div>';
                        setTimeout(() => { closeModal(); refresh(); showDocs(id, 'connected'); }, 1500);
                    }
                }, 3000);
            }

            async function del(id) { 
                if(confirm('Warning: This will disconnect and delete all data for session "' + id + '". Continue?')) { 
                    await fetch(\`/logout?session=\${id}&key=${API_KEY}\`); 
                    refresh(); 
                    document.getElementById('docs-panel').innerHTML = '<div class="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50"><p class="text-lg">Select a device</p></div>';
                } 
            }
            setInterval(refresh, 10000); 
            refresh();
        </script>
    </body>
    </html>
    `);
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
