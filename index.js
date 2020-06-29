const fs = require('fs');
const SerialPort = require('serialport')
const Canvas = require('canvas-browserify')
const Dither = require('canvas-dither')
const Flatten = require('canvas-flatten')

const port = new SerialPort('/dev/ttyUSB0', {
  baudRate: 115200
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
    print("PORT OPEN")
    resetBuffer()
    setCharacterFont()
    setCenter()
    printRasterBitImage(__dirname + '/logo.png', 512, 128).then(() => {
	setCharacterSpacing()
        setFontSizeX(2)
        setBold()
        setLeft()
        setLeftMargin(0x30)
        setDensity(1);

        printAndFeedN(0x04)

        printNormalText("RECEIPT")
        printAndFeedN(0x02)

        setFontSizeX(1)
        printNormalText("Operator")
        printAndFeedN(0x00)
        printNormalText("https://bitxchan.ge")
        printAndFeedN(0x00)
        printNormalText("info@bitxchan.ge")
        printAndFeedN(0x00)
        printNormalText("+995 555 111 222")
        printAndFeedN(0x00)
        printNormalText("+995 3222 222 222")
        printAndFeedN(0x00)
        printAndFeedN(0x02)

        printNormalText("Customer: John Doe")
        printAndFeedN(0x00)
        printNormalText("Session:")
        printAndFeedN(0x00)
        setLeftMargin(0x50)
        printNormalText("teijgoiajoiga")
        printAndFeedN(0x02)

        setLeftMargin(0x30)
        printNormalText("Time: ")
        printAndFeedN(0x00)
        printNormalText("Direction: ")
        printAndFeedN(0x00)
        printNormalText("Fiat: ")
        printAndFeedN(0x00)
        printNormalText("Crypto: ")
        printAndFeedN(0x00)
        printNormalText("Rate: ")
        printAndFeedN(0x02)

            printNormalText("TXID:")
            printAndFeedN(0x00)
            setLeftMargin(0x50)

            printNormalText("fweoioiwejgiowejgiojweiog")
            printAndFeedN(0x00)

            printNormalText("geiwjgoijwiojgwe")
            printAndFeedN(0x02)
            setLeftMargin(0x30)			
        
        printNormalText("Address:")
        printAndFeedN(0x00)
        setLeftMargin(0x50)
        printNormalText("eiouhgoiuajhgoijaeoi")
        printAndFeedN(0x00)
        printNormalText("eiouhgoiuajhgoijaeoi")
        printAndFeedN(0x04)

        printQR("testQR")
	printAndFeedN(0x04)
        print()
        cutPaper()
        setTimeout(function(){
            closeSerialPort()
        }, 5000);
    })
})

function closeSerialPort() {
	if (port != null) {
		port.close();
	}
}

port.on('data', function(data) {
    console.log(data); 
})

port.on('readable', function () {
  console.log('Data:', port.read())
})

port.on('error', function(err) {
	console.log('Error: ', err.message)
})

function setCharacterFont(){
    write(Buffer.from([0x1B, 0x4D, 0x31]))
}

function setCharacterSpacing() {
    write(Buffer.from([0x1B, 0x20, 0x02]))
}

//0x00 - DISABLED
//0x01 - ENABLE UTF-8
//0x02 - ENABLE UTF-16
function setFontEncoding(encoding) {
    write(Buffer.from([0x1C, 0x65, encoding]))
}

function loadFont(fontName, fontPath) {
    const fileSize = getFilesizeInBytes(fontPath);
    const fileBytes = getFileByteArray(fontPath);
    // return fileBytes.then((fileBytes) => {
        write(Buffer.from([0x1D, 0xE9]))
        write(fileSize);
        write(Buffer.from([0x2C, 0x43, 0x2C]));
        write(Buffer.from(fontName));
        write(Buffer.from([0x2C]));
        write(fileBytes);
    // })
}

function getFilesizeInBytes(filePath) {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    return Buffer.from([fileSizeInBytes >> 24, fileSizeInBytes >> 16, fileSizeInBytes >> 8, fileSizeInBytes])
}

function getFileByteArray(filePath){
    return fs.readFileSync(filePath);
}

function saveAsLogo(filePath, fileName, width, height, logoNumber) {
    write(Buffer.from([0x1C, 0x94])) // Save the image from serial port command
    write(calculateHL(logoNumber)) // nH, nL. The number of logo as two byte.
    write(calculateHL(width)) // Image width as two byte.
    write(calculateHL(height)) // Imahe height as two byte.
    write(Buffer.from([0x00, 0x00])) // Two reserved byte.
    write(create16String(fileName)) // 16 Size string as name of logo.
    encodeImageForLogo(filePath, width, height)
    // write(getFileByteArray(filePath)) // File byte array
    // write(Buffer.from([0x3E])) // End byte

}

function create16String(str) {
    let buff = Buffer.alloc(16);
    buff.fill(0x00);
    buff.write(str);
    return buff;
}

function calculateHL(number) {
    let nL = Math.floor(number % 256);
    let nH = Math.floor(number / 256);
    return Buffer.from([nH, nL]);
}

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
        const command = Buffer.from([0x1D, 0x2A, width/8, height/8])
        write(Buffer.concat([command, image]))
    });
}

function printDefinedBitImage() {
    write(Buffer.from([0x1D, 0x2F, 0x30]))
}

function encodeImageForLogo(imagePath, width, height) {
    if (width % 16 !== 0) {
        throw new Error('Width must be a multiple of 8');
    }

    if (height % 16 !== 0) {
        throw new Error('Height must be a multiple of 8');
    }

    let canvas = Canvas.createCanvas(width, height);
    let context = canvas.getContext('2d');
    const background = Canvas.loadImage(imagePath);
    const result =  background.then((background) => {
        context.drawImage(background, 0, 0, width, height);
        let image = context.getImageData(0, 0, width, height);

        image = Flatten.flatten(image, [0xff, 0xff, 0xff]);

        // image = Dither.threshold(image, 128);
        // image = Dither.bayer(image, 128);
        // image = Dither.floydsteinberg(image);
        image = Dither.atkinson(image);
        
        let getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1;

        let bytes = new Uint8Array((width * height) / 8);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x = x + 8) {
                let i = (y * (width / 8)) + (x / 8);
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

        write(Buffer.from(bytes))
        write(Buffer.from([0x3E]))
    }).catch(err => {
        console.log('oh no!', err)
    })
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

        // image = Dither.threshold(image, 128);
        // image = Dither.bayer(image, 128);
        // image = Dither.floydsteinberg(image);
        image = Dither.atkinson(image);

        let getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1;

        let bytes = new Uint8Array((width * height) / 8);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x = x + 8) {
                let i = ((height - y) * (width / 8)) + (x / 8);
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
        return bytes
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
	//write(Buffer.from([0x1B, 0x4A, n]))
	write(Buffer.from([0x1B, 0x64, n]))
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
	if(n == 1) cmd = cmd = 0x00
	if(n == 2) cmd = cmd = 0x11
	if(n == 3) cmd = cmd = 0x22
	if(n == 4) cmd = cmd = 0x33
	if(n == 5) cmd = cmd = 0x44
	if(n == 6) cmd = cmd = 0x55
	if(n == 7) cmd = cmd = 0x66
	if(n == 8) cmd = cmd = 0x77
	write(Buffer.from([0x1D, 0x21, cmd]))
}

function printNormalText(str) {
	write(Buffer.from(str))
}

function cutPaper() {
    write(Buffer.from([0x1B, 0x69]))
    //write(Buffer.from([0x1C, 0x50, 0x0A, 0x01, 0x45, 0x05]))
}

function write(data) {
	console.log('SENDING: ', data)
    port.write(data)
}
