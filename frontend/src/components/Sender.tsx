import { useEffect, useState } from "react";

export const Sender = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [pc, setPC] = useState<RTCPeerConnection | null>(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    setSocket(socket);
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "identify-as-sender",
        })
      );
    };
  }, []);

  const startSendingVideo = async () => {
    if (!socket) {
      return;
    }
    // create an offer
    const pc = new RTCPeerConnection();

    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.send(
        JSON.stringify({
          type: "create-offer",
          sdp: pc.localDescription,
        })
      );
    };
    const offer = await pc.createOffer(); // -->  sdp

    await pc.setLocalDescription(offer);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
          })
        );
      }
    };

    socket?.send(
      JSON.stringify({ type: "create-offer", sdp: pc.localDescription })
    );

    socket?.send(
      JSON.stringify({
        type: "create-offer",
        sdp: pc.localDescription,
      })
    );

    // trickle ice

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "create-offer") {
        pc.setRemoteDescription(data.sdp);
      } else if (data.type === "ice-candidate") {
        pc.addIceCandidate(data.candidate);
      }
    };
  };

  const getCameraStreamAndSend = (pc: RTCPeerConnection) => {
    // implement 2
  };

  return (
    <div>
      Sender
      <button onClick={startSendingVideo}> Send data </button>
    </div>
  );
};
