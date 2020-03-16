const SerialPort = require('serialport')
const Canvas = require('canvas-browserify')
const Dither = require('canvas-dither')
const Flatten = require('canvas-flatten')

const port = new SerialPort('/dev/tty.usbserial-1420', {
  baudRate: 19200
})

function hex(str) {
    var arr = [];
    for (var i = 0, l = str.length; i < l; i ++) {
        var ascii = str.charCodeAt(i);
        arr.push(ascii);
    }
    arr.push(255);
    arr.push(255);
    arr.push(255);
    let result = new Buffer.from(arr);
    return result;
}

port.on('open', function() {
    setCenter()
    defineBitImage('./logo.png', 512, 128).then(() => {
        printDefinedBitImage()

        // resetBuffer()

     //    setFontSizeX(2)
     //    setBold()
     //    setLeft()
    	// setLeftMargin(0x40)
     //    setDensity(1);

     //    printAndFeedN(0x02)

     //    printNormalText("RECEIPT")
     //    printAndFeedN(0x02)

     //    setFontSizeX(1)
     //    printNormalText("Martian Moon Money")
     //    printAndFeedN(0x00)
     //    printNormalText("MartianMoonMoney.space")
     //    printAndFeedN(0x00)
     //    printNormalText("elon@martianmoonmoney.space")
     //    printAndFeedN(0x00)
     //    printNormalText("+4.603.867.5309")
     //    printAndFeedN(0x00)
     //    printNormalText("VAT No. NCC - 74656")
     //    printAndFeedN(0x02)

     //    printNormalText("Customer: + 18025853170")
     //    printAndFeedN(0x00)
     //    printNormalText("Session:")
     //    printAndFeedN(0x00)
     //    setLeftMargin(0x60)
     //    printNormalText("0f6851-7edb-4664-b2c9-496fe700a5a3")
     //    printAndFeedN(0x02)

     //    setLeftMargin(0x40)
     //    printNormalText("Time: 2020-03-13 23:40:22 UTC")
     //    printAndFeedN(0x00)
     //    printNormalText("Direction: Cash-in")
     //    printAndFeedN(0x00)
     //    printNormalText("Fiat: 50EUR")
     //    printAndFeedN(0x00)
     //    printNormalText("Crypto: 0.006306 BTC")
     //    printAndFeedN(0x00)
     //    printNormalText("Rate: 1 BTC = 7930.5135 EUR")
     //    printAndFeedN(0x02)
        
     //    printNormalText("TXID:")
     //    printAndFeedN(0x00)
     //    setLeftMargin(0x60)
     //    printNormalText("f483b2112a3966056792bf679a2202cb")
     //    printAndFeedN(0x00)
     //    printNormalText("884ed6ecfb535674c9f33cda268a0a34")
     //    printAndFeedN(0x02)
     //    setLeftMargin(0x40)
     //    printNormalText("Address:")
     //    printAndFeedN(0x00)
     //    setLeftMargin(0x60)
     //    printNormalText("1FfmbHfnpaZjKFvyi")
     //    printAndFeedN(0x00)
     //    printNormalText("1okTjJJusN455paPH")
     //    printAndFeedN(0x04)

     //    printQR("1FfmbHfnpaZjKFvyi1okTjJJusN455paPH")
     //    print()
    	cutPaper()
    })
})

port.on('data', function(data) {
    console.log(data); 
})

port.on('readable', function () {
  console.log('Data:', port.read())
})

port.on('error', function(err) {
	console.log('Error: ', err.message)
})

// normal density is 0, which in commands is 0x04.
function setDensity(density) {
	let cmd = 0x04
	if(density == -2) cmd = 0x02
	if(density == -1) cmd = 0x03
	if(density == 0) cmd = 0x04
	if(density == 1) cmd = 0x05
	if(density == 2) cmd = 0x06
	write(Buffer.from([0x1D, 0x7C, cmd]))
}

function printRasterBitImage(imagePath, width, height) {
    let imageBytes = encodeImageRaster(imagePath, width, height)
    return imageBytes.then((image)=>{
        const command = Buffer.from([
            0x1D, 0x76, 0x30, // Print raster bit image command
            0x00, // Raster bit image mode (0x00) normal mode. (DO NOT CHANGE THIS, YOU WILL REGRET :D)
            (width >> 3) & 0xff, (((width >> 3) >> 8) & 0xff), // xLow and xHigh number of data bytes in horizontal direction
            height & 0xff, ((height >> 8) & 0xff) // yLow and yHigh number of data bytes in vertical direction
        ])

        write(Buffer.concat([command, image]))
    });
}

function defineBitImage(imagePath, width, height) {
    let imageBytes = encodeImageColumns(imagePath, width, height)
    return imageBytes.then((image) => {
        const command = Buffer.from([0x1D, 0x2A, height/8, width/8])
        write(Buffer.concat([command, image]))
    });
}

function printDefinedBitImage() {
    write(Buffer.from([0x1D, 0x2F, 0x30]))
}

function encodeImageColumns(imagePath, width, height) {
    if (width % 8 !== 0) {
        throw new Error('Width must be a multiple of 8');
    }

    if (height % 8 !== 0) {
        throw new Error('Height must be a multiple of 8');
    }

    let canvas = Canvas.createCanvas(width, height);
    let context = canvas.getContext('2d');
    const background = Canvas.loadImage(imagePath);

    const result =  background.then((background) => {
        context.drawImage(background, 0, 0, width, height);
        let image = context.getImageData(0, 0, width, height);

        image = Flatten.flatten(image, [0xff, 0xff, 0xff]);

        // image = Dither.threshold(image, threshold);
        // image = Dither.bayer(image, threshold);
        image = Dither.floydsteinberg(image);
        // image = Dither.atkinson(image);

        let getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1;

        let bytes = new Uint8Array((width * height) / 8);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x = x + 8) {
                let i = ((height - y) * (width / 8)) + (x / 8);
                bytes[i] =
                    getPixel(x + 0, y) |
                    getPixel(x + 1, y) << 1 |
                    getPixel(x + 2, y) << 2 |
                    getPixel(x + 3, y) << 3 |
                    getPixel(x + 4, y) << 4 |
                    getPixel(x + 5, y) << 5 |
                    getPixel(x + 6, y) << 6 |
                    getPixel(x + 7, y) << 7;
            }
        }
        width = width/8
        let transposedArray = new Uint8Array((width * height));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let i = (y * width) + x
                let j = (width - x - 1) * height + y
                transposedArray[j] = bytes[i]
            }
        }

        // console.log(bytes.length)
        return transposedArray
    }).catch(err => {
        console.log('oh no!', err)
    })

    return result
}

function encodeImageRaster(imagePath, width, height) {
    if (width % 8 !== 0) {
        throw new Error('Width must be a multiple of 8');
    }

    if (height % 8 !== 0) {
        throw new Error('Height must be a multiple of 8');
    }

    let canvas = Canvas.createCanvas(width, height);
    let context = canvas.getContext('2d');
    const background = Canvas.loadImage(imagePath);

    const result =  background.then((background) => {
        context.drawImage(background, 0, 0, width, height);
        let image = context.getImageData(0, 0, width, height);

        image = Flatten.flatten(image, [0xff, 0xff, 0xff]);

        // image = Dither.threshold(image, threshold);
        // image = Dither.bayer(image, threshold);
        image = Dither.floydsteinberg(image);
        // image = Dither.atkinson(image);

        let getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1;

        let bytes = new Uint8Array((width * height) >> 3);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x = x + 8) {
                let i = (y * (width >> 3)) + (x >> 3);
                bytes[i] =
                    getPixel(x + 0, y) << 7 |
                    getPixel(x + 1, y) << 6 |
                    getPixel(x + 2, y) << 5 |
                    getPixel(x + 3, y) << 4 |
                    getPixel(x + 4, y) << 3 |
                    getPixel(x + 5, y) << 2 |
                    getPixel(x + 6, y) << 1 |
                    getPixel(x + 7, y);
            }
        }
        console.log(bytes.length)
        return bytes
    }).catch(err => {
        console.log('oh no!', err)
    })

    return result
}

function printQR(str) {
	resetBuffer()

	setCenter() //To center QR Code.

	let store_len = str.length + 3;
    let store_pL = Math.floor(store_len % 256);
    let store_pH = Math.floor(store_len / 256);

    write(Buffer.from([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])) //Set Encoding Scheme to: QRCode Model 2 (0x32)
    write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x42, 0x0A])) //Set QRCode Version
    write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06])) //Set QRCode Dot size to 6 (0x06)
    write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30])) //Set Error Correction to: AUTO (0x30)
    write(Buffer.from([0x1D, 0x28, 0x6B, store_pL, store_pH, 0x31, 0x50, 0x31])) //Set data before putting actual data from string.
    write(Buffer.from(str)) // Actual data to print
    write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x31]))
}

function resetBuffer() {
	write(Buffer.from([0x1B, 0x40]))
}

function setLeft() {
	write(Buffer.from([0x1B, 0x61, 0x00]))
}

function setCenter() {
	write(Buffer.from([0x1B, 0x61, 0x01]))
}

function setRight() {
	write(Buffer.from([0x1B, 0x61, 0x02]))
}

function setLeftMargin(length) {
	write(Buffer.from([0x1D, 0x4C, length, 0x00]))
}

function printAndFeedN(n) {
	write(Buffer.from([0x1B, 0x4A, n]))
}

function print() {
    write(Buffer.from([0x1B, 0x64, 0x00]))
}

function setBold() {
	write(Buffer.from([0x1B, 0x45, 0x01])) 
}

function cancelBold() {
	write(Buffer.from([0x1B, 0x45, 0x00])) 
}

function setFontSizeX(n) {
	let cmd = 0x66
	if(n == 1) cmd = 0x00
	if(n == 2) cmd = 0x11
	if(n == 3) cmd = 0x22
	if(n == 4) cmd = 0x33
	if(n == 5) cmd = 0x44
	if(n == 6) cmd = 0x55
	if(n == 7) cmd = 0x66
	if(n == 8) cmd = 0x77
	write(Buffer.from([0x1D, 0x21, cmd]))
}

function printNormalText(str) {
	write(Buffer.from(str))
}

function cutPaper() {
	write(Buffer.from([0x1C, 0x50, 0x0A, 0x01, 0x45, 0x05]))
}

function write(data) {
	console.log('SENDING: ', data)
    port.write(data)
}