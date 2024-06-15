export class PeerConnection {
  readonly rtcConnection: RTCPeerConnection;
  channel: RTCDataChannel | undefined;

  constructor(configuration?: RTCConfiguration | undefined) {
    this.rtcConnection = new RTCPeerConnection(configuration);

    this.rtcConnection.ondatachannel = (event) => {
      event.channel.onmessage = (e) => console.log("Messsage:" + e.data);
      event.channel.onopen = () => console.log("Data channel open");
      event.channel.onclose = () => console.log("Data channel closed");
      this.channel = event.channel;
    };
  }

  getChannel(): RTCDataChannel {
    const dataChannel = this.rtcConnection.createDataChannel("channel");
    dataChannel.onmessage = (e) => console.log("Messsage received:" + e.data);
    dataChannel.onopen = () => console.log("Data channel open");
    dataChannel.onclose = () => console.log("Data channel closed");
    return dataChannel;
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
