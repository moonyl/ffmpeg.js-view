import YUVCanvas from "./YUVCanvas";

class FFMpegView {
  constructor(divId, options) {
    this.fps = 0;
    let width = "640";
    let height = "480";
    this.divId = divId;

    this.statistics = {
      videoStartTime: 0,
      videoPictureCounter: 0,
      windowStartTime: 0,
      windowPictureCounter: 0,
      fps: 0,
      fpsMin: 1000,
      fpsMax: -1000,
      fpsSinceStart: 0
    };

    this.useWorker = false;
    this.resetCalled = true;

    if (typeof options != "undefined") {
      if (options.width) {
        width = options.width;
      }

      if (options.height) {
        height = options.height;
      }

      this.useWorker =
        typeof options.useWorker != "undefined" && options.useWorker;

      // create webGL canvas
      this.yuvCanvas = new YUVCanvas({
        width: width,
        height: height,
        contextOptions: { preserveDrawingBuffer: true }
      });
      var domNode = document.getElementById(this.divId);
      domNode.appendChild(this.yuvCanvas.canvasElement);
      //console.log("domNode: ", domNode);

      this.initFFMPEG_DECODER_WORKER();
    }
  }

  initFFMPEG_DECODER_WORKER = callback => {
    this.worker = new Worker("osh-UI-FFMPEGViewWorker.js");

    var self = this;
    this.worker.onmessage = function(e) {
      const { decodedFrame, show } = e.data;
      //console.log("show: ", show);

      if (!this.resetCalled && show) {
        self.yuvCanvas.canvasElement.drawing = true;
        self.yuvCanvas.drawNextOuptutPictureGL({
          yData: decodedFrame.frameYData,
          yDataPerRow: decodedFrame.frame_width,
          yRowCnt: decodedFrame.frame_height,
          uData: decodedFrame.frameUData,
          uDataPerRow: decodedFrame.frame_width / 2,
          uRowCnt: decodedFrame.frame_height / 2,
          vData: decodedFrame.frameVData,
          vDataPerRow: decodedFrame.frame_width / 2,
          vRowCnt: decodedFrame.frame_height / 2
        });
        self.yuvCanvas.canvasElement.drawing = false;

        self.updateStatistics();
        //self.onAfterDecoded();
      }
    }.bind(this);
  };

  /**
   *
   * @param dataSourceId
   * @param data
   * @instance
   * @memberof OSH.UI.FFMPEGView
   */
  setData = (data, show) => {
    //console.log({ data });
    var pktData = data.data;
    var pktSize = pktData.length;
    this.resetCalled = false;
    this.decodeWorker(pktSize, pktData, show);
  };

  /**
   *
   * @param pktSize
   * @param pktData
   * @instance
   * @memberof OSH.UI.FFMPEGView
   */
  decodeWorker = (pktSize, pktData, show) => {
    var transferableData = {
      pktSize: pktSize,
      pktData: pktData.buffer,
      byteOffset: pktData.byteOffset,
      show
    };
    this.worker.postMessage(transferableData, [transferableData.pktData]);
  };

  updateStatistics = () => {
    var s = this.statistics;
    s.videoPictureCounter += 1;
    s.windowPictureCounter += 1;
    var now = Date.now();
    if (!s.videoStartTime) {
      s.videoStartTime = now;
    }
    var videoElapsedTime = now - s.videoStartTime;
    s.elapsed = videoElapsedTime / 1000;
    if (videoElapsedTime < 1000) {
      return;
    }

    if (!s.windowStartTime) {
      s.windowStartTime = now;
      return;
    } else if (now - s.windowStartTime > 1000) {
      var windowElapsedTime = now - s.windowStartTime;
      const fps = (s.windowPictureCounter / windowElapsedTime) * 1000;
      s.windowStartTime = now;
      s.windowPictureCounter = 0;

      if (fps < s.fpsMin) s.fpsMin = fps;
      if (fps > s.fpsMax) s.fpsMax = fps;
      s.fps = fps;
    }

    const fps = (s.videoPictureCounter / videoElapsedTime) * 1000;
    s.fpsSinceStart = fps;
  };
}

export default FFMpegView;
