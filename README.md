# nibble-hid

The host client for interfacing with a qmk keyboard's oled display over QMK with real time system information. Grabs song information from Spotify. Currently only supports Windows, however, Linux support is planned. Based on BlankSourceCode's [qmk-hid-display](https://github.com/BlankSourceCode/qmk-hid-display).

## Installation

After cloning this repo, run `npm install` and wait for all required packages to finish installing. You should also clone my fork of the Nibble library to get the OLED functionality working keyboard-side. You can see an example of how to implement this on [my firmware](https://github.com/microsockss/nibble-qmk-hid).

## Configuration

There are just a few steps to get this feature working on your Nibble. First, choose a key to toggle between screens, and call the `update_oled()` method when this key is pressed. [Example here](https://github.com/microsockss/nibble/blob/master/keymaps/microsockss/keymap.c). Make sure to change the following lines to reflect the data you plan on displaying.

```c
// Define which oled screens you want to see
#define performance true
#define media_status true

// Define which oled screen to start on
// 1: media status   2: performance info
int volatile current_screen = 1;
```

Next, set up config.js to match your keyboard's information as well as each page you would like enabled.

## Performance Data

![Performance screen](./img/performance.jpg)
Currently, the performance data module will monitor four aspects of your PC: current volume, CPU utilization, RAM utilization, and disk space utilization on the C: drive, or another drive of your choice.

## Media Data

![Media screen](./img/media.jpg)
The media screen will display information grabbed from the window title of Spotify.exe as well as your current volume.
