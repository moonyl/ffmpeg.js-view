import React, { useRef, useEffect } from "react";
import "./App.css";
import FFMpegView from "./ffmpegView";
import { w3cwebsocket as W3CWebSocket } from "websocket";

function App() {
  const ffmpegView = useRef();

  useEffect(() => {
    console.log("렌더링이 완료되었습니다!");
    const { hostname, protocol } = window.location;
    console.log({ protocol });
    const wsProtocol = protocol === "http:" ? "ws" : "wss";
    const id = "56f3284c-a6e8-4d92-8a17-30596c5205ce";
    const view = new FFMpegView(ffmpegView.current.id, {
      useWorker: true
    });
    setInterval(() => {
      console.log("statistics: ", view.statistics);
    }, 1000);
    console.log({ view });
    const client = new W3CWebSocket(
      `${wsProtocol}://${hostname}:5000/h264Stream/${id}`
    );
    client.onopen = () => {
      console.log("connected OK");
    };
    client.onmessage = evt => {
      evt.data.arrayBuffer().then(arrayBuffer => {
        const headerStr = new TextDecoder("utf-8").decode(
          new Uint8Array(arrayBuffer, 0, 3)
        );
        if (headerStr === "psd") {
          const show =
            new Uint8Array(arrayBuffer, 3, 1).toString() === "0" ? false : true; // 1 or 0
          //const frame = new Uint8Array(buffer, 8);
          //console.log({ show });
          //console.log({ frame });
          //console.log({ frame });
          const pktData = {
            byteOffset: 8,
            buffer: arrayBuffer,
            length: arrayBuffer.byteLength - 8
          };
          const data = { data: pktData };
          view.setData(data, show);
          //this.frameList.push({ frame, show });
        }
      });
    };
    client.onerror = error => {
      console.log({ error });
    };

    console.log("id:", ffmpegView.current.id);
  }, []);

  return <div id="ffmpeg-view" ref={ffmpegView}></div>;
}

export default App;
