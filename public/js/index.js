const options = {
  controls: true,
  preload: "auto",
  sources: [
    {
      src: "public/bbb_sunflower_1080p_30fps_normal.mp4",
      type: "video/mp4"
    }
  ]
};

document.addEventListener("DOMContentLoaded", function() {
  const socket = io();
  var player = videojs("my-player", options, () => {
    console.log("Playing the video!");
  });

  const electedMaster = () => {
    setInterval(() => {
      socket.emit("updateTimestamp");
      console.log("sent my timestamp!");
    }, 5000);
  };

  player.on("play", () => {
    socket.emit("play");
  });

  player.on("pause", () => {
    socket.emit("pause");
  });

  player.on("seeked", () => {
    console.log(`Seeked time: ${player.currentTime()}`);
    socket.emit("seeked", player.currentTime());
  });

  player.on("seeking", () => {
    console.log(`Seeking timestamp: ${player.currentTime()}`);
  });

  socket.on("play", () => {
    player.play();
  });

  socket.on("pause", () => {
    player.pause();
  });

  socket.on("getCurrentTimestamp", fn => {
    fn(player.currentTime());
  });

  socket.on("seek", timestamp => {
    console.log(`Seeking to: ${timestamp}`);
    player.currentTime(timestamp);
  });

  socket.on("electedMaster", () => {
    electedMaster();
  });
});
