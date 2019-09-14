const express = require("express");
const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use("/public", express.static(__dirname + "/public"));
app.use("/scripts", express.static(__dirname + "/node_modules/"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

let master = "";
io.on("connection", function(socket) {
  if (io.engine.clientsCount === 1) {
    socket.emit("electedMaster");
    master = socket.id;
  }

  socket.on("play", () => {
    io.emit("play");
  });

  socket.on("pause", () => {
    io.emit("pause");
  });

  socket.on("seeked", async timestamp => {
    let test = await checkSeek();
    if (test) {
      console.log("broadcast");
      io.emit("seek", timestamp);
    }
  });

  socket.on("updateTimestamp", () => {
    checkSync(2);
  });

  socket.on("disconnect", () => {
    if (socket.id === master) {
      master = electNewMaster();
    }
  });
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});

const getTimestamps = () => {
  return Object.keys(io.sockets.clients().connected).map(id => {
    return new Promise((resolve, reject) => {
      io.to(id).sockets[id].emit("getCurrentTimestamp", data => {
        if (data < 0) {
          reject();
        }
        console.log(`id: ${id}, timestamp: ${data}`);
        resolve({
          id: id,
          timestamp: data
        });
      });
    });
  });
};

const checkSync = async time_difference => {
  let updated_connections = await Promise.all(getTimestamps());
  let latest_timestamp = Math.max(
    ...updated_connections.map(({ timestamp }) => timestamp)
  );

  let resync_elements = updated_connections.filter(connection => {
    return latest_timestamp - connection.timestamp > time_difference;
  });

  if (resync_elements.length > 0) {
    resync_elements.forEach(connection => {
      io.to(connection.id).emit("seek", latest_timestamp);
    });
  }
};

const electNewMaster = () => {
  if (io.engine.clientsCount > 0) {
    let first_socket = Object.keys(io.sockets.clients().connected)[0];
    io.to(first_socket).sockets[first_socket].emit("electedMaster");
    return first_socket;
  }
  return "";
};

const checkSeek = async () => {
  return new Promise((resolve, reject) => {
    const calculateSync = async () => {
      let currentTimestamps = await Promise.all(getTimestamps());

      if (currentTimestamps.length == 0) {
        reject();
      }
      let roundedTimestamps = new Set(
        currentTimestamps.map(result => {
          return Math.floor(result.timestamp);
        })
      );

      if (roundedTimestamps.length === 1) {
        resolve(false);
      } else {
        let timestampDifference =
          Math.max.apply(Math, Array.from(roundedTimestamps)) -
          Math.min.apply(Math, Array.from(roundedTimestamps));
        return timestampDifference > 1 ? resolve(true) : resolve(false);
      }
    };
    calculateSync();
  });
};
