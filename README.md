# Custom printer library on nodejs

Custom printer library written on serialport and canvas libraries. Tested only with VKP-80III and K-80 models. K-80 is missing a lot's of features of VKP-80III.

## 1. Installation

### 1)  Install canvas pre-dependencies for using image printing on your printer.

OS | Command
----- | -----
OS X | Using [Homebrew](https://brew.sh/): `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
Ubuntu | `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
Fedora | `sudo yum install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel`
Solaris | `pkgin install cairo pango pkg-config xproto renderproto kbproto xextproto`
OpenBSD | `doas pkg_add cairo pango png jpeg giflib`
Windows | See the [wiki](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows)
Others | See the [wiki](https://github.com/Automattic/node-canvas/wiki)

**Mac OS X v10.11+:** If you have recently updated to Mac OS X v10.11+ and are experiencing trouble when compiling, run the following command: `xcode-select --install`. Read more about the problem [on Stack Overflow](http://stackoverflow.com/a/32929012/148072).
If you have xcode 10.0 or higher installed, in order to build from source you need NPM 6.4.1 or higher

### 2.) Run npm install from console

```npm
npm install
```

### 3.) Setup configuration file

Configure config file, also there is example config file, which you can copy and edit.

Type has only two argument: vkp80iii or k80.
If portConfiguration is null, only commands will be printed on console.

```json
{
    "type": "vkp80iii",
    "portConfiguration": {
        "port": "/dev/ttyUSB0",
        "baudRate": 115200
    }
}
```

## 2. Usage

```bash
node index.js
```

### Pull requests are welcome :)
