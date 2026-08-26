import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let currentToken = null;
let activeGroupRooms = new Set(); // Track joined rooms for reconnection

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity, // Never stop trying during a live session
      timeout: 20000,
    });
  }
  return socket;
};

export const connectSocket = (token) => {
  currentToken = token;
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  // If already connected, authenticate immediately
  if (s.connected && token) {
    s.emit('authenticate', token);
  }
  // Authenticate on (re)connect
  s.off('connect');
  s.on('connect', () => {
    console.log('🔌 Socket connected:', s.id);
    if (currentToken) s.emit('authenticate', currentToken);
    // Re-join all active group rooms on reconnect
    activeGroupRooms.forEach(groupId => {
      s.emit('join-group-room', { groupId });
    });
  });
  s.off('disconnect');
  s.on('disconnect', (reason) => {
    console.log('🔥 Socket disconnected:', reason);
  });
  s.off('connect_error');
  s.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });
  return s;
};

export const disconnectSocket = () => {
  activeGroupRooms.clear();
  currentToken = null;
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const joinGroupRoom = (groupId) => {
  if (!groupId) return;
  activeGroupRooms.add(groupId); // Track for reconnection
  const s = getSocket();
  if (s.connected) {
    s.emit('join-group-room', { groupId });
  } else {
    s.once('connect', () => {
      s.emit('join-group-room', { groupId });
    });
  }
};

export const leaveGroupRoom = (groupId) => {
  if (!groupId) return;
  activeGroupRooms.delete(groupId);
  const s = getSocket();
  if (s.connected) s.emit('leave-group-room', { groupId });
};

export default getSocket;
