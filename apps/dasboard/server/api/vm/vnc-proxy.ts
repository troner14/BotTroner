import { prisma } from '@bot/database';
import { VirtualizationManager } from '@bot/virtualization';
import { WebSocket } from 'ws';

export default defineWebSocketHandler({
    async open(peer) {
        console.log('VNC Proxy: Client connected');
        
        try {
            // Obtener parámetros de la URL
            const url = new URL(peer.request.url || '', `http://${peer.request.headers.host}`);
            const websocketUrl = url.searchParams.get('websocketUrl');
            const token = url.searchParams.get('token');
            const panelId = parseInt(url.searchParams.get('panelId') || '0');
            const guildId = url.searchParams.get('guildId');

            if (!websocketUrl || !panelId || !guildId) {
                console.error('VNC Proxy: Missing parameters');
                peer.close();
                return;
            }

            console.log('VNC Proxy: Connecting to Proxmox:', websocketUrl);
            const manager = new VirtualizationManager(prisma);

            const panel = await manager.getPanelAuthHeader(panelId);
            
            if (!panel) {
                throw new Error('Panel not found');
            }

            const authHeaders = panel.getAuthHeaders();
            console.log('VNC Proxy: Auth headers:', authHeaders);
            console.log('VNC Proxy: Ticket in URL:', websocketUrl.includes('vncticket'));

            // Crear conexión al websocket de Proxmox con headers de autenticación
            const upstream = new WebSocket(websocketUrl, {
                rejectUnauthorized: false,
                headers: authHeaders,
            });

            const ws = peer.websocket as any;
            ws.upstream = upstream;
            ws.upstreamReady = false;
            ws.messageQueue = [];

            // Eventos del upstream (Proxmox)
            upstream.on('open', () => {
                console.log('VNC Proxy: Connected to Proxmox VNC - ready');
                ws.upstreamReady = true;
                
                // Enviar mensajes en cola
                if (ws.messageQueue.length > 0) {
                    console.log(`VNC Proxy: Sending ${ws.messageQueue.length} queued messages`);
                    ws.messageQueue.forEach((msg: any) => {
                        if (upstream.readyState === WebSocket.OPEN) {
                            upstream.send(msg);
                        }
                    });
                    ws.messageQueue = [];
                } else {
                    console.log('VNC Proxy: No queued messages, waiting for client data...');
                }
            });

            upstream.on('message', (data: Buffer) => {
                // Reenviar datos de Proxmox al cliente
                peer.send(data);
            });

            upstream.on('error', (error) => {
                console.error('VNC Proxy: Upstream error:', error);
                peer.close();
            });

            upstream.on('close', (code, reason) => {
                peer.close();
            });

        } catch (error) {
            console.error('VNC Proxy: Init error:', error);
            peer.close();
        }
    },

    async message(peer, message) {
        const ws = peer.websocket as any;
        
        // Si el upstream está listo, enviar directamente; si no, poner en cola
        if (ws.upstream) {
            if (ws.upstreamReady && ws.upstream.readyState === WebSocket.OPEN) {
                ws.upstream.send(message.rawData);
            } else {
                // Poner en cola hasta que upstream esté listo
                ws.messageQueue.push(message.rawData);
            }
        }
    },

    async close(peer, event) {
        console.log('VNC Proxy: Client disconnected');
        const ws = peer.websocket as any;
        if (ws.upstream) {
            ws.upstream.close();
            ws.upstream = null;
        }
    },

    async error(peer, error) {
        console.error('VNC Proxy: Error:', error);
    }
});
