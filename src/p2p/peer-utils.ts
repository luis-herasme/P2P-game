export async function getOffer(
  rtcConnection: RTCPeerConnection
): Promise<string> {
  const sessionDescription = await rtcConnection.createOffer();
  await rtcConnection.setLocalDescription(sessionDescription);
  await waitToCompleteIceGathering(rtcConnection);
  return rtcConnection.localDescription!.sdp;
}

export async function getAnswer(
  rtcConnection: RTCPeerConnection
): Promise<string> {
  const sessionDescription = await rtcConnection.createAnswer();
  await rtcConnection.setLocalDescription(sessionDescription);
  await waitToCompleteIceGathering(rtcConnection);
  return rtcConnection.localDescription!.sdp;
}

function waitToCompleteIceGathering(rtcConnection: RTCPeerConnection) {
  rtcConnection.restartIce();

  return new Promise((resolve) => {
    rtcConnection.addEventListener("icegatheringstatechange", (event) => {
      if (
        event &&
        event.target &&
        "iceGatheringState" in event.target &&
        event.target.iceGatheringState === "complete"
      ) {
        resolve(rtcConnection.localDescription);
      }
    });
  });
}
