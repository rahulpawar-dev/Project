import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

const resolveSocketServerUrl = () => {
  const normalizedBaseUrl = String(API_BASE_URL || '').trim();
  if (!normalizedBaseUrl || normalizedBaseUrl.startsWith('/')) {
    return window.location.origin;
  }

  try {
    const parsed = new URL(normalizedBaseUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return 'http://localhost:5000';
  }
};

let socketInstance = null;

export const getRealtimeSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketServerUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
  }

  return socketInstance;
};

export const subscribeToRealtimeEvents = (handlers = {}) => {
  const socket = getRealtimeSocket();
  const registeredHandlers = [
    ['queue-updated', handlers.onQueueUpdated],
    ['queue-status-changed', handlers.onQueueStatusChanged],
    ['patient-checked-in', handlers.onPatientCheckedIn],
    ['appointment-updated', handlers.onAppointmentUpdated],
  ].filter(([, handler]) => typeof handler === 'function');

  registeredHandlers.forEach(([eventName, handler]) => {
    socket.on(eventName, handler);
  });

  return () => {
    registeredHandlers.forEach(([eventName, handler]) => {
      socket.off(eventName, handler);
    });
  };
};
