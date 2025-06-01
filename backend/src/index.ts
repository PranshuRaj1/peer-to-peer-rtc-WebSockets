import { WebSocketServer, WebSocket } from "ws";

/*
 ---> This code handles different message types (sender, receiver,
      createOffer, createAnswer, iceCandidate) and 
      forwards the messages to the appropriate sockets. 
*/

const ws = new WebSocketServer({ port: 8080 });

let senderSocket: null | WebSocket = null;
let receiverSocket: null | WebSocket = null;

/*
    The server handles different types of messages:
        sender: Stores the sender socket.
        receiver: Stores the receiver socket.
        createOffer: Forwards the offer SDP from the sender to the receiver.
        createAnswer: Forwards the answer SDP from the receiver to the sender.
        iceCandidate: Forwards the ICE candidate from the sender to the receiver, or vice versa. 
*/

ws.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", function message(data: any) {
    const message = JSON.parse(data);
    //console.log(message);

    /*
    1) identify as sender
    2) identify as receiver
    3) create offer
    4) create answer
    5) add ice candidate
     */

    if (message.type === "identify-as-sender") {
      senderSocket = ws;
    } else if (message.type === "identify-as-receiver") {
      receiverSocket = ws;
    } else if (message.type === "create-offer") {
      receiverSocket?.send(
        JSON.stringify({ type: "offer", sdp: message.offer })
      );
    } else if (message.type === "create-answer") {
      senderSocket?.send(JSON.stringify({ type: "offer", sdp: message.offer }));
    } else if (message.type === "ice-candidate") {
      if (ws === senderSocket) {
        receiverSocket?.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: message.candidate,
          })
        );
      } else if (ws === receiverSocket) {
        senderSocket?.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: message.candidate,
          })
        );
      }
    }
  });

  //   ws.send("somethingg");
});
