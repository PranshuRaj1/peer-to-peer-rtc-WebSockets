import { useEffect, useRef, useState } from "react";

export const Receiver = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    // 1) Open WebSocket and identify as receiver
    const newSocket = new WebSocket("ws://localhost:8080");
    socketRef.current = newSocket;

    newSocket.onopen = () => {
      console.log("Connected to WebSocket (receiver)");
      newSocket.send(JSON.stringify({ type: "identify-as-receiver" }));
    };

    // 2) Define onmessage *once*, but refer to pcRef.current so that
    //    we always see the latest peer connection.
    newSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Receiver got:", message);

      if (message.type === "create-offer") {
        console.log("Offer arrived at Receiver");
        // Create a fresh PC and stash it in pcRef
        const newPC = new RTCPeerConnection();
        pcRef.current = newPC;

        // Send any ICE candidates from Receiver → Sender
        newPC.onicecandidate = (e) => {
          if (e.candidate) {
            socketRef.current!.send(
              JSON.stringify({
                type: "ice-candidate",
                candidate: e.candidate,
              })
            );
          }
        };

        // When a remote track arrives, stick it into our <video>
        newPC.ontrack = (e) => {
          console.log("Receiver ontrack:", e.track.kind);
          // Usually e.streams[0] exists:
          if (e.streams && e.streams[0]) {
            videoRef.current!.srcObject = e.streams[0];
            videoRef.current!.onloadedmetadata = () =>
              videoRef.current!.play().catch((err) => console.error(err));
          } else {
            // Fallback: build a new MediaStream from the single track
            const ms = new MediaStream([e.track]);
            videoRef.current!.srcObject = ms;
            videoRef.current!.onloadedmetadata = () =>
              videoRef.current!.play().catch((err) => console.error(err));
          }
        };

        // 3) Set remote SDP (the offer)
        await newPC.setRemoteDescription(
          new RTCSessionDescription(message.sdp)
        );
        console.log("Receiver: remote offer set");

        // 4) Drain any pending ICE candidates that arrived earlier
        for (const cand of pendingCandidates.current) {
          await newPC.addIceCandidate(cand);
        }
        pendingCandidates.current = [];

        // 5) Create and send Answer
        const answer = await newPC.createAnswer();
        await newPC.setLocalDescription(answer);
        newSocket.send(
          JSON.stringify({
            type: "create-answer",
            sdp: newPC.localDescription,
          })
        );
      } else if (message.type === "ice-candidate") {
        const existingPC = pcRef.current;
        if (existingPC && existingPC.remoteDescription) {
          console.log("Receiver: adding ICE candidate live");
          await existingPC.addIceCandidate(message.candidate);
        } else {
          console.log("Receiver: queuing ICE because PC not ready yet");
          pendingCandidates.current.push(message.candidate);
        }
      }
    };
  }, []); // run once on mount

  return (
    <div>
      <h2>Receiver</h2>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls
        style={{ width: "100%", maxWidth: "600px", backgroundColor: "black" }}
      />
    </div>
  );
};
