const hid = require("node-hid");
const loudness = require("loudness");
const os = require("os-utils");
const disk = require("diskusage");
const fs = require("fs");
const config = require("./config");
const windows = require("get-window-by-name");

// Choose which features to use here. This should
// match what is in your keymap file.
let showMedia = config["showMedia"];
let showPerformance = config["showPerformance"];

// Set which screen to start on. This should match
// what is in your keymap file.
// media: 1   performance: 2
let currentScreen;
if (showMedia) {
  currentScreen = 1;
} else if (showPerformance) {
  currentScreen = 2;
}

let storageDrive = config["storageDrive"];

// Define the productId and vendorId for the Nibble
const productId = config["productId"];
const vendorId = config["vendorId"];

// These are the possible usage / usagePage combinations
// I've found that 97 & 65376 works
// (6, 1), (97, 65376), (128, 1), (6, 1), (1, 12)
const usage = config["usage"];
const usagePage = config["usagePage"];

// This will hold a reference to our hid device
let keyboard = null;

// Just a helper function to wait a specified amount of time
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

var mediaMsg = [];
async function startMediaMonitor() {
  while (true) {
    var song = windows.getWindowText("Spotify.exe")[0].processTitle;
    if (song.includes("Spotify Premium")) {
      // paused
      mediaMsg[0] = 0;
    } else {
      // playing
      mediaMsg = stringToUnicodeArray(song);
      mediaMsg[0] = 1;
    }
    if (currentScreen == 1) {
      sendDataToKeyboard(mediaMsg);
    }
    await wait(10);
  }
}

// unicode encoding table
const unicode_alpha = Array.from(
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~"
);

function stringToUnicodeArray(string) {
  var arr = [];
  arr.push(1);
  for (var i = 0; i < string.length; i++)
    arr.push(unicode_alpha.indexOf(string[i]) + 64);
  return arr;
}

// Prepopulating the array to hold performance data
let perfMsg = new Array(30).fill(0);
async function startPerfMonitor() {
  function updatePerf() {
    os.cpuUsage(function (v) {
      perfMsg[2] = Math.round(v * 100) + 25; // cpu usage percent
    });
    disk.check(storageDrive, function (err, info) {
      perfMsg[3] = ((info.total - info.free) / info.total) * 100 + 25;
    });
    perfMsg[1] = 100 - Math.round(os.freememPercentage() * 100) + 25; // RAM usage
  }

  while (true) {
    updatePerf();
    const vol = await Promise.all([loudness.getVolume()]);
    perfMsg[0] = vol[0] + 25;

    if (currentScreen == 2) {
      sendDataToKeyboard(perfMsg);
    }
  }
}

// Screens are, in order: [media, performance]
let screenOptions = ["media", "performance"];
function sendDataToKeyboard(msg) {
  if (!keyboard) {
    // Try to initiate a connection with the keyboard
    const devices = hid.devices();
    for (const d of devices) {
      if (
        d.product === "NIBBLE" &&
        d.productId === 24672 &&
        d.vendorId === 28257 &&
        d.usage === usage &&
        d.usagePage === usagePage
      ) {
        keyboard = new hid.HID(d.path);
        console.log("Connection established.");

        // Log the data that the keyboard sends to the host
        keyboard.on("data", (e) => {
          if (currentScreen != e[0]) {
            currentScreen = e[0];
            console.log(`Updating screen to ${screenOptions[e[0] - 1]}`);

            // Send cached data immediately
            if (currentScreen == 1) {
              sendDataToKeyboard(mediaMsg);
            } else if (currentScreen == 2) {
              sendDataToKeyboard(perfMsg);
            }
          }
        });

        // Initiate a new connection
        // 1st byte is thrown away (see node-hid bug)
        // 2nd byte is used to initiate a new connection
        // The rest of the bytes can be discarded
        keyboard.write([0, 127, 1, 2, 3, 4, 5]);
        console.log("Sent init data.");
      }
    }
  }

  let currentScreenStatic = currentScreen;
  if (!(keyboard == null)) {
    try {
      for (let i = 0; i < 390; i = i + 30) {
        let tmp = msg.slice(i, i + 30);
        tmp.unshift(0, currentScreenStatic);
        wait(100);
        keyboard.write(tmp);
      }
    } catch (err) {
      console.log(err);
      console.log(
        "Could not connect to keyboard. Will try again on next data transfer."
      );
      keyboard = null;
    }
  } else {
    console.log("Lost connection");
  }
}

if (showPerformance) {
  startPerfMonitor();
}
if (showMedia) {
  startMediaMonitor();
}
