import { io, Socket } from 'socket.io-client';
import { saveResponse } from '../db';
import { Response } from '../types';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (socket?.connected) return;

  socket = io(import.meta.env.VITE_SERVER_URL, {
    auth: { token },          // sends JWT so server knows it's the owner
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[socket] connected');
  });

  // Server pushes a new response when a respondent submits
  socket.on('new_response', async (response: Response) => {
    console.log('[socket] new response received', response.id);
    await saveResponse({ ...response, synced: true });
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected');
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}