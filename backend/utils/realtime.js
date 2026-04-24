let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitRealtimeEvent = (eventName, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
};

module.exports = {
  setSocketServer,
  emitRealtimeEvent,
};
