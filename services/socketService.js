const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const initSocket = (httpServer, allowedOrigins = []) => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Socket CORS origin not allowed'));
            },
            credentials: true,
            methods: ['GET', 'POST'],
        },
        pingTimeout: 30000,
        pingInterval: 25000,
    });

    // ── Admin-Only Authentication Middleware ────────────────────────────────
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }

            const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
            const decoded = jwt.verify(cleanToken, process.env.ADMIN_JWT_SECRET);

            const adminId = decoded?.adminId || decoded?.id;
            if (!decoded || !adminId) {
                return next(new Error('Authentication error: Invalid admin token'));
            }

            socket.adminUser = {
                id: adminId,
                email: decoded.email || null,
                roleId: decoded.roleId || null,
            };

            next();
        } catch (err) {
            console.warn('[Socket.IO Auth] Connection rejected:', err.message);
            next(new Error('Authentication error: ' + err.message));
        }
    });

    io.on('connection', (socket) => {
        const admin = socket.adminUser;
        if (!admin) {
            socket.disconnect(true);
            return;
        }

        // Join global admin broadcast room and private admin user room
        socket.join('admin:all');
        socket.join(`admin:${admin.id}`);
        console.log(`[Socket.IO] Admin ${admin.email} (ID: ${admin.id}) connected [Socket: ${socket.id}]`);

        socket.on('disconnect', (reason) => {
            console.log(`[Socket.IO] Admin ${admin.email} disconnected (${reason})`);
        });
    });

    return io;
};

const getIO = () => io;

const emitAdminNewOrder = (orderData) => {
    if (!io) {
        console.warn('[Socket.IO] Cannot emit new order: Socket.IO not initialized');
        return false;
    }

    try {
        const payload = {
            orderId: orderData.orderId || orderData.id,
            orderNumber: orderData.orderNumber || (orderData.id ? `#${String(orderData.id).padStart(6, '0')}` : '#000000'),
            customerName: orderData.customerName || 'Customer',
            totalAmount: Number(orderData.totalAmount || 0),
            paymentMethod: orderData.paymentMethod || 'Online',
            createdAt: orderData.createdAt || new Date().toISOString(),
        };

        io.to('admin:all').emit('admin:new-order', payload);
        console.log(`[Socket.IO] Emitted 'admin:new-order' to 'admin:all' for Order ${payload.orderNumber}`);
        return true;
    } catch (error) {
        console.error('[Socket.IO] Error emitting new order event:', error.message);
        return false;
    }
};

module.exports = {
    initSocket,
    getIO,
    emitAdminNewOrder,
};
