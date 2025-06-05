import { useEffect, useRef, useState } from "react";

export const Sender = () => {
  const [started, setStarted] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const newSocket = new WebSocket("ws://localhost:8080");
    socketRef.current = newSocket;

    newSocket.onopen = () => {
      console.log("🔌 Connected to WebSocket (sender)");
      newSocket.send(JSON.stringify({ type: "identify-as-sender" }));
    };

    // Define onmessage once, but use pcRef.current
    newSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Sender got:", message);

      if (message.type === "create-answer") {
        const existingPC = pcRef.current;
        if (existingPC) {
          console.log("Sender: setting remote answer…");
          await existingPC.setRemoteDescription(
            new RTCSessionDescription(message.sdp)
          );
        }
      } else if (message.type === "ice-candidate") {
        const existingPC = pcRef.current;
        if (existingPC && existingPC.remoteDescription) {
          console.log("Sender: adding ICE candidate");
          await existingPC.addIceCandidate(message.candidate);
        }
      }
    };
  }, []); // run once

  const startSendingVideo = async () => {
    if (started) return;
    setStarted(true);

    // 1) Create a new RTCPeerConnection and stash it in ref
    const newPC = new RTCPeerConnection();
    pcRef.current = newPC;

    // 2) When ICE candidate is found at Sender → send to Receiver
    newPC.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current!.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
          })
        );
      }
    };

    // 3) (Optional) Log connection state changes
    newPC.onconnectionstatechange = () => {
      console.log("Sender connection state:", newPC.connectionState);
    };

    // 4) Get local camera stream & add tracks
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    // Show local preview
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    // Add each track to the newPC
    stream.getTracks().forEach((track) => newPC.addTrack(track, stream));

    // 5) Create Offer, set local SDP, send Offer→Receiver
    const offer = await newPC.createOffer();
    await newPC.setLocalDescription(offer);

    socketRef.current!.send(
      JSON.stringify({
        type: "create-offer",
        sdp: newPC.localDescription,
      })
    );
  };

  return (
    <div>
      <h2>🎥 Sender</h2>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls
        style={{ width: "100%", maxWidth: "600px" }}
      />
      <button onClick={startSendingVideo} disabled={started}>
        {started ? "Streaming…" : "Start Sending"}
      </button>
    </div>
  );
};
