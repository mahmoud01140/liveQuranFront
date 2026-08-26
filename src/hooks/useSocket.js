import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

/**
 * useSocket — registers socket event listeners using refs
 * to avoid stale closures. Handlers always see fresh state.
 */
export default function useSocket(events = {}) {
  const socketRef = useRef(null);
  const eventsRef = useRef(events);

  // Keep eventsRef always up-to-date so handlers use fresh state
  eventsRef.current = events;

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Build wrapper functions that delegate to the latest handler in eventsRef
    const wrappers = {};
    Object.keys(events).forEach((event) => {
      wrappers[event] = (...args) => {
        if (eventsRef.current[event]) {
          eventsRef.current[event](...args);
        }
      };
      socket.on(event, wrappers[event]);
    });

    return () => {
      // Cleanup: remove the wrapper listeners
      Object.entries(wrappers).forEach(([event, wrapper]) => {
        socket.off(event, wrapper);
      });
    };
  }, []); // mount/unmount only

  return socketRef.current;
}
