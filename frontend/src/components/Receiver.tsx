import { useEffect } from "react";

export const Receiver = () => {
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    let pc: RTCPeerConnection | null = null;
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "identify-as-receiver",
        })
      );
    };
    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "create-offer") {
        if (!pc) {
          pc = new RTCPeerConnection();

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.send(
                JSON.stringify({
                  type: "ice-candidate",
                  candidate: event.candidate,
                })
              );
            }
          };

          pc.ontrack = (event) => {
            console.log("📺 Received track:", event.streams[0]);
            const video = document.getElementById("remote") as HTMLVideoElement;
            if (video) {
              video.srcObject = event.streams[0];
              video.play();
            }
          };
        }

        await pc.setRemoteDescription(message.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.send(
          JSON.stringify({
            type: "create-answer",
            sdp: pc.localDescription,
          })
        );
      } else if (message.type === "ice-candidate" && pc) {
        await pc.addIceCandidate(message.candidate);
      }
    };
  }, []);

  return <div>RR</div>;
};
