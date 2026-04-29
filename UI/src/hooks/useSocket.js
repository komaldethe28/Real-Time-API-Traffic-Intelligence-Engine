import { useEffect, useState } from "react";
import { socket, SOCKET_STATUS } from "@/services/socket";

export function useSocketStatus() {
  const [status, setStatus] = useState(socket.status);
  useEffect(() => socket.onStatus(setStatus), []);
  return status;
}

export function useSocketEvent(handler, types) {
  useEffect(() => {
    return socket.onMessage((msg) => {
      if (!types || types.includes(msg.type)) handler(msg);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export { SOCKET_STATUS };
