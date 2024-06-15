export class PeerConnection {
  readonly rtcConnection: RTCPeerConnection;

  constructor(configuration?: RTCConfiguration | undefined) {
    this.rtcConnection = new RTCPeerConnection(configuration);
  }

  async getOffer(): Promise<string> {
    const sessionDescription = await this.rtcConnection.createOffer();
    await this.rtcConnection.setLocalDescription(sessionDescription);
    await this.waitToCompleteIceGathering();
    return this.rtcConnection.localDescription!.sdp;
  }

  async getAnswer(): Promise<string> {
    const sessionDescription = await this.rtcConnection.createAnswer();
    await this.rtcConnection.setLocalDescription(sessionDescription);
    await this.waitToCompleteIceGathering();
    return this.rtcConnection.localDescription!.sdp;
  }

  private waitToCompleteIceGathering() {
    this.rtcConnection.restartIce();

    return new Promise((resolve) => {
      this.rtcConnection.addEventListener(
        "icegatheringstatechange",
        (event) => {
          if (
            event &&
            event.target &&
            "iceGatheringState" in event.target &&
            event.target.iceGatheringState === "complete"
          ) {
            resolve(this.rtcConnection.localDescription);
          }
        }
      );
    });
  }
}
