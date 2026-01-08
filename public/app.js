/**
 * WhatsApp API Dashboard - Frontend JavaScript
 * Handles all client-side interactions
 */

let pollInterval = null;
let config = { apiKey: '', serverIp: '', port: 3000 };

// Initialize configuration from embedded config or fallback
function initConfig() {
    // Get config from window.APP_CONFIG (embedded in HTML) or use defaults
    if (window.APP_CONFIG) {
        config = window.APP_CONFIG;
    } else {
        // Fallback: try to get from API (requires key, so this won't work without embedded config)
        console.warn('Config not embedded, using defaults');
        config = { apiKey: '', serverIp: 'localhost', port: 3000 };
    }
    
    // Update UI
    if (config.apiKey) {
        document.getElementById('api-key-badge').textContent = `Key: ${config.apiKey}`;
    }
}

// Refresh session list
async function refresh() {
    try {
        const res = await fetch(`/status-all?key=${config.apiKey}`);
        const data = await res.json();
        const container = document.getElementById('session-list');
        
        if (data.length === 0) {
            container.innerHTML = '<div class="text-center text-slate-400 py-8">No sessions found. Create a new session to get started.</div>';
            return;
        }
        
        container.innerHTML = data.map(s => `
            <div onclick="showDocs('${s.id}', '${s.status}')" class="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-500 hover:shadow-md transition-all flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <div class="w-2.5 h-2.5 rounded-full ${s.status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-400'}"></div>
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg">${s.id}</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${s.status}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${s.status !== 'connected' ? `
                        <button onclick="event.stopPropagation(); openQR('${s.id}')" class="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="Scan QR Code">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                            </svg>
                        </button>
                    ` : ''}
                    <button onclick="event.stopPropagation(); del('${s.id}')" class="p-2.5 bg-slate-50 text-slate-300 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all" title="Delete Session">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to refresh sessions:', error);
    }
}

// Show API documentation for a session
function showDocs(id, status) {
    const docs = document.getElementById('docs-panel');
    const base = `http://${config.serverIp}:${config.port}`;
    
    docs.innerHTML = `
        <div id="docs-content" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex items-center justify-between mb-10 border-b border-slate-800 pb-6">
                <div>
                    <h2 class="text-white text-3xl font-extrabold tracking-tight">API Documentation</h2>
                    <p class="text-blue-400 font-bold text-xs uppercase tracking-widest mt-1">Session: ${id}</p>
                </div>
                <span class="px-4 py-1.5 bg-slate-800 rounded-full text-xs font-bold text-slate-400 border border-slate-700 uppercase">${status}</span>
            </div>

            <div class="space-y-8">
                <div>
                    <label class="text-white text-sm font-bold block mb-3 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> 1. Send Text Message
                    </label>
                    <div class="bg-black/40 p-5 rounded-2xl border border-white/5 font-mono text-xs break-all text-slate-300 hover:text-white transition-colors cursor-all-scroll shadow-inner">
                        GET ${base}/send-text?session=${id}&number=91XXXXXXXXXX&msg=Hello&key=${config.apiKey}
                    </div>
                    <button onclick="copyToClipboard('${base}/send-text?session=${id}&number=91XXXXXXXXXX&msg=Hello&key=${config.apiKey}')" class="mt-2 text-xs text-blue-400 hover:text-blue-300">Copy URL</button>
                </div>

                <div>
                    <label class="text-white text-sm font-bold block mb-3 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> 2. Send PDF Document
                    </label>
                    <div class="bg-black/40 p-5 rounded-2xl border border-white/5 font-mono text-xs break-all text-slate-300 hover:text-white transition-colors cursor-all-scroll shadow-inner">
                        GET ${base}/send-pdf?session=${id}&number=91XXXXXXXXXX&url=YOUR_PDF_URL&key=${config.apiKey}
                    </div>
                    <button onclick="copyToClipboard('${base}/send-pdf?session=${id}&number=91XXXXXXXXXX&url=YOUR_PDF_URL&key=${config.apiKey}')" class="mt-2 text-xs text-blue-400 hover:text-blue-300">Copy URL</button>
                </div>

                <div class="grid grid-cols-2 gap-4 pt-4">
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p class="text-blue-400 text-[10px] font-bold uppercase mb-1">Get QR Code</p>
                        <p class="text-white font-mono text-xs tracking-tighter">GET /get-qr?session=${id}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p class="text-blue-400 text-[10px] font-bold uppercase mb-1">Method</p>
                        <p class="text-white font-mono text-xs uppercase">HTTP GET REQUEST</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('URL copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Open QR code modal
function openQR(id) {
    document.getElementById('qr-modal').classList.remove('hidden');
    document.getElementById('qr-target').innerHTML = '<div class="animate-pulse text-slate-400 text-sm">Initializing...</div>';
    fetch(`/connect?session=${id}&key=${config.apiKey}`);
    startPolling(id);
}

// Close QR modal
function closeModal() {
    document.getElementById('qr-modal').classList.add('hidden');
    clearInterval(pollInterval);
    pollInterval = null;
}

// Connect new session
function connectNew() {
    const id = document.getElementById('sname').value.trim();
    if (!id) {
        alert('Please enter a session name');
        return;
    }
    document.getElementById('sname').value = '';
    openQR(id);
}

// Start polling for QR code
function startPolling(id) {
    clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`/get-qr?session=${id}&key=${config.apiKey}`);
            const data = await res.json();
            
            if (data.qr) {
                document.getElementById('qr-target').innerHTML = `
                    <img src="${data.qr}" class="w-52 h-52 rounded-2xl shadow-2xl bg-white p-2 border border-slate-100 animate-in zoom-in-95 duration-300">
                `;
            }
            
            if (data.status === 'connected') {
                document.getElementById('qr-target').innerHTML = `
                    <div class="text-green-500 font-bold text-xl animate-bounce">Connected!</div>
                `;
                setTimeout(() => {
                    closeModal();
                    refresh();
                    showDocs(id, 'connected');
                }, 1500);
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 3000);
}

// Delete session
async function del(id) {
    if (!confirm(`Warning: This will disconnect and delete all data for session "${id}". Continue?`)) {
        return;
    }
    
    try {
        await fetch(`/logout?session=${id}&key=${config.apiKey}`);
        refresh();
        document.getElementById('docs-panel').innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                <p class="text-lg">Select a device</p>
            </div>
        `;
    } catch (error) {
        console.error('Failed to delete session:', error);
        alert('Failed to delete session. Please try again.');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initConfig();
    refresh();
    setInterval(refresh, 10000); // Refresh every 10 seconds
});
