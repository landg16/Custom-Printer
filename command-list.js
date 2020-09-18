const fs = require('fs')
const Canvas = require('canvas-browserify')
const Dither = require('canvas-dither')
const Flatten = require('canvas-flatten')

const type = {
    VPK80III: "vkp80iii",
    K80: "k80"
}

let printer = null
let port = null

/**
 * This method initializes command list of this printer.
 * @param {String} printer type of printer as string, currently (vkp80-iii or k80).
 * @param {SerialPort} port SerialPort object to send bytes from this method.
 */
const Printer = function init(printer, port) {
    console.log("Printer Initialized")
    if(printer == type.VPK80III) {
        this.printer = type.VPK80III
    } else if(printer == type.K80) {
		this.printer = type.K80
	} else {
		this.printer = "test"
	}
    this.port = port
}

/**
 * Writes data to printer buffer.
 * @param {ByteBuffer} data of byte buffer
 */
Printer.prototype.write = function write(data) {
    console.log('SENDING: ', data)
    if(this.port != null) {
        port.write(data)
    }
}

/**
 * This method sets character font
 * 0x00, 0x30 - Font 11 cpi (18x24)
 * 0x01, 0x31 - Font 15 cpi (14x24)
 * @param {byte} size of font
 */
Printer.prototype.setCharacterFont = function setCharacterFont(size){
	this.write(Buffer.from([0x1B, 0x4D, 0x31]))
}

/**
 * This method sets character spacing of font to 0x02.
 * Range of spacing [0x00 ≤ n ≤ 0xFF]
 * @param {byte} spacing of characters
 */
Printer.prototype.setCharacterSpacing = function setCharacterSpacing(spacing) {
    this.write(Buffer.from([0x1B, 0x20, 0x02]))
}

/**
 * This method just sets font encoding
 * 0x00 - Disabled
 * 0x01 - Enable UTF-8
 * 0x02 - Enable UTF-16
 * @param {byte} encoding Sets encoding to printer
 */
Printer.prototype.setFontEncoding = function setFontEncoding(encoding) {
	this.write(Buffer.from([0x1C, 0x65, encoding]))
}

/**
 * This method should load font into the printer (Not working :()
 * @param {String} fontName Font name to write on device
 * @param {String} fontPath Font path to get file contents and write to printer
 */
Printer.prototype.loadFont = function loadFont(fontName, fontPath) {
	const fileSize = getFilesizeInBytes(fontPath)
	const fileBytes = getFileByteArray(fontPath)
	return fileBytes.then((fileBytes) => {
		this.write(Buffer.from([0x1D, 0xE9]))
		this.write(fileSize)
		this.write(Buffer.from([0x2C, 0x43, 0x2C]))
		this.write(Buffer.from(fontName))
		this.write(Buffer.from([0x2C]))
		this.write(fileBytes)
	})
}

/**
 * This method returns file size in bytes.
 * @param {String} filePath path to count bytes
 */
function getFilesizeInBytes(filePath) {
	const stats = fs.statSync(filePath)
	const fileSizeInBytes = stats.size
	return Buffer.from([fileSizeInBytes >> 24, fileSizeInBytes >> 16, fileSizeInBytes >> 8, fileSizeInBytes])
}

/**
 * This method returns byte array of given file
 * @param {String} filePath path to get byte array
 */
function getFileByteArray(filePath){
	return fs.readFileSync(filePath)
}

/**
 * This method saves logo on printer eeprom (maybe do not work)
 * @param {String} filePath Image path to save on device
 * @param {String} fileName Image name for futher retrieving from printer
 * @param {Int} width Integer of image width
 * @param {Int} height Integer of image height
 * @param {int} logoNumber Number of image, to overwrite on printer memory
 */
Printer.prototype.saveAsLogo = function saveAsLogo(filePath, fileName, width, height, logoNumber) {
	this.write(Buffer.from([0x1C, 0x94])) // Save the image from serial port command
	this.write(calculateHL(logoNumber)) // nH, nL. The number of logo as two byte.
	this.write(calculateHL(width)) // Image width as two byte.
	this.write(calculateHL(height)) // Imahe height as two byte.
	this.write(Buffer.from([0x00, 0x00])) // Two reserved byte.
	this.write(create16String(fileName)) // 16 Size string as name of logo.
	this.encodeImageForLogo(filePath, width, height)
	this.write(getFileByteArray(filePath)) // File byte array
	this.write(Buffer.from([0x3E])) // End byte
}

/**
 * This method creates 16 length byte buffer, receives string and fill it to 16 length with 0x00
 * @param {String} str String to create 16 length byte array
 */
function create16String(str) {
	let buff = Buffer.alloc(16)
	buff.fill(0x00)
	buff.this.write(str)
	return buff
}

/**
 * This method calculates High and low bytes.
 * @param {Int} number to calculate high and low bytes
 */
function calculateHL(number) {
	let nL = Math.floor(number % 256)
	let nH = Math.floor(number / 256)
	return Buffer.from([nH, nL])
}

/**
 * This method sets density of font. Normal density is 0.
 * @param {Int} density from -2 to 2
 */
Printer.prototype.setDensity = function setDensity(density) {
	let cmd = 0x04
	if(density == -2) cmd = 0x02
	if(density == -1) cmd = 0x03
	if(density == 0) cmd = 0x04
	if(density == 1) cmd = 0x05
	if(density == 2) cmd = 0x06
	this.write(Buffer.from([0x1D, 0x7C, cmd]))
}

/**
 * This method prints image from buffer and as raster
 * @param {String} imagePath Image path for retrieving file
 * @param {Int} width Image width as int
 * @param {Int} height Image height as int
 */
Printer.prototype.printRasterBitImage = function printRasterBitImage(imagePath, width, height) {
	let imageBytes = encodeImageRaster(imagePath, width, height)
	return imageBytes.then((image)=>{
		const command = Buffer.from([
			0x1D, 0x76, 0x30, // Print raster bit image command
			0x00, // Raster bit image mode (0x00) normal mode. (DO NOT CHANGE THIS, YOU WILL REGRET :D)
			(width >> 3) & 0xff, (((width >> 3) >> 8) & 0xff), // xLow and xHigh number of data bytes in horizontal direction
			height & 0xff, ((height >> 8) & 0xff) // yLow and yHigh number of data bytes in vertical direction
		])

		this.write(Buffer.concat([command, image]))
	})
}

/**
 * This method gives image in bit to printer and waits for print command to print
 * @param {String} imagePath Image path for retrieving file
 * @param {Int} width Image width as int
 * @param {Int} height Image height as int
 */
Printer.prototype.defineBitImage = function defineBitImage(imagePath, width, height) {
	let imageBytes = encodeImageColumns(imagePath, width, height)
	return imageBytes.then((image) => {
		const command = Buffer.from([0x1D, 0x2A, width/8, height/8])
		this.write(Buffer.concat([command, image]))
	})
}

/**
 * This method prints defined bit image
 */
Printer.prototype.printDefinedBitImage = function printDefinedBitImage() {
	this.write(Buffer.from([0x1D, 0x2F, 0x30]))
}

/**
 * This method encodes image for logo, width and height must be a multiple of 16
 * @param {String} imagePath Image path for retrieving file
 * @param {Int} width Image width as int (must be multiple of 16)
 * @param {Int} height Image height as int (must be multiple of 16)
 */
Printer.prototype.encodeImageForLogo = function encodeImageForLogo(imagePath, width, height) {
	if (width % 16 !== 0) {
		throw new Error('Width must be a multiple of 16')
	}

	if (height % 16 !== 0) {
		throw new Error('Height must be a multiple of 16')
	}

	let canvas = Canvas.createCanvas(width, height)
	let context = canvas.getContext('2d')
	const background = Canvas.loadImage(imagePath)
	background.then((background) => {
		context.drawImage(background, 0, 0, width, height)
		let image = context.getImageData(0, 0, width, height)

		image = Flatten.flatten(image, [0xff, 0xff, 0xff])
		image = Dither.atkinson(image)
		
		let getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1

		let bytes = new Uint8Array((width * height) / 8)

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x = x + 8) {
				let i = (y * (width / 8)) + (x / 8)
				bytes[i] =
					getPixel(x + 0, y) << 7 |
					getPixel(x + 1, y) << 6 |
					getPixel(x + 2, y) << 5 |
					getPixel(x + 3, y) << 4 |
					getPixel(x + 4, y) << 3 |
					getPixel(x + 5, y) << 2 |
					getPixel(x + 6, y) << 1 |
					getPixel(x + 7, y)
			}
		}

		this.write(Buffer.from(bytes))
		this.write(Buffer.from([0x3E]))
	}).catch(err => {
		console.log('oh no!', err)
	})
}

/**
 * This method encodes image colums to define bit image 
 * @param {String} imagePath Image path for retrieving file
 * @param {Int} width Image width as int (must be multiple of 8)
 * @param {Int} height Image height as int (must be multiple of 8)
 */
function encodeImageColumns(imagePath, width, height) {
	if (width % 8 !== 0) {
		throw new Error('Width must be a multiple of 8')
	}

	if (height % 8 !== 0) {
		throw new Error('Height must be a multiple of 8')
	}

	let canvas = Canvas.createCanvas(width, height)
	let context = canvas.getContext('2d')
	const background = Canvas.loadImage(imagePath)
	const result =  background.then((background) => {
		context.drawImage(background, 0, 0, width, height)
		let image = context.getImageData(0, 0, width, height)

		image = Flatten.flatten(image, [0xff, 0xff, 0xff])
		image = Dither.atkinson(image)

		let getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1

		let bytes = new Uint8Array((width * height) / 8)

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x = x + 8) {
				let i = ((height - y) * (width / 8)) + (x / 8)
				bytes[i] =
					getPixel(x + 0, y) << 7 |
					getPixel(x + 1, y) << 6 |
					getPixel(x + 2, y) << 5 |
					getPixel(x + 3, y) << 4 |
					getPixel(x + 4, y) << 3 |
					getPixel(x + 5, y) << 2 |
					getPixel(x + 6, y) << 1 |
					getPixel(x + 7, y)
			}
		}
		return bytes
	}).catch(err => {
		console.log('oh no!', err)
	})

	return result
}

/**
 * This method encodes image for raster printing.
 * @param {String} imagePath Image path for retrieving file
 * @param {Int} width Image width as int (must be multiple of 8)
 * @param {Int} height Image height as int (must be multiple of 8)
 */
function encodeImageRaster(imagePath, width, height) {
	if (width % 8 !== 0) {
		throw new Error('Width must be a multiple of 8')
	}

	if (height % 8 !== 0) {
		throw new Error('Height must be a multiple of 8')
	}

	let canvas = Canvas.createCanvas(width, height)
	let context = canvas.getContext('2d')
	const background = Canvas.loadImage(imagePath)

	const result =  background.then((background) => {
		context.drawImage(background, 0, 0, width, height)
		let image = context.getImageData(0, 0, width, height)

		image = Flatten.flatten(image, [0xff, 0xff, 0xff])
		image = Dither.floydsteinberg(image)

		let getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1

		let bytes = new Uint8Array((width * height) >> 3)

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x = x + 8) {
				let i = (y * (width >> 3)) + (x >> 3)
				bytes[i] =
					getPixel(x + 0, y) << 7 |
					getPixel(x + 1, y) << 6 |
					getPixel(x + 2, y) << 5 |
					getPixel(x + 3, y) << 4 |
					getPixel(x + 4, y) << 3 |
					getPixel(x + 5, y) << 2 |
					getPixel(x + 6, y) << 1 |
					getPixel(x + 7, y)
			}
		}
		return bytes
	}).catch(err => {
		console.log('oh no!', err)
	})

	return result
}

/**
 * This method just resets buffer, sets center, and print QR.
 * @param {String} str To generate QR of following string
 */
Printer.prototype.printQR = function printQR(str) {
	this.resetBuffer()

	this.setCenter() // To center QR Code.

	let store_len = str.length + 3
	let store_pL = Math.floor(store_len % 256)
	let store_pH = Math.floor(store_len / 256)

	this.write(Buffer.from([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])) // Set Encoding Scheme to: QRCode Model 2 (0x32)
	this.write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x42, 0x0A])) // Set QRCode Version
	this.write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06])) // Set QRCode Dot size to 6 (0x06)
	this.write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30])) // Set Error Correction to: AUTO (0x30)
	this.write(Buffer.from([0x1D, 0x28, 0x6B, store_pL, store_pH, 0x31, 0x50, 0x31])) // Set data before putting actual data from string.
	this.write(Buffer.from(str)) // Actual data to print
	this.write(Buffer.from([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x31]))
}

/**
 * This method resets printer buffer and everything that was already saved on it, is cleared.
 */
Printer.prototype.resetBuffer = function resetBuffer() {
	this.write(Buffer.from([0x1B, 0x40]))
}

/**
 * Sets everything's position to left
 */
Printer.prototype.setLeft = function setLeft() {
	this.write(Buffer.from([0x1B, 0x61, 0x00]))
}

/**
 * Sets everything's position to center
 */
Printer.prototype.setCenter = function setCenter() {
	this.write(Buffer.from([0x1B, 0x61, 0x01]))
}

/**
 * Sets everything's position to right
 */
Printer.prototype.setRight = function setRight() {
	this.write(Buffer.from([0x1B, 0x61, 0x02]))
}

/**
 * This method sets left margin of printer
 * @param {int} length of left margin
 */
Printer.prototype.setLeftMargin = function setLeftMargin(length) {
	this.write(Buffer.from([0x1D, 0x4C, length, 0x00]))
}

/**
 * This method prints and feed's line by n
 * @param {Int} n feed line 
 */
Printer.prototype.printAndFeedN = function printAndFeedN(n) {
	//this.write(Buffer.from([0x1B, 0x4A, n]))
	this.write(Buffer.from([0x1B, 0x64, n]))
}

/**
 * This method just prints from buffer
 */
Printer.prototype.print = function print() {
	this.write(Buffer.from([0x1B, 0x64, 0x00]))
}

/**
 * Sets bold to font
 */
Printer.prototype.setBold = function setBold() {
	this.write(Buffer.from([0x1B, 0x45, 0x01])) 
}

/**
 * Cancels bold from font
 */
Printer.prototype.cancelBold = function cancelBold() {
	this.write(Buffer.from([0x1B, 0x45, 0x00])) 
}

/**
 * Set font size to printer
 * @param {Int} n size of font from 1 to 8, default = 7
 */
Printer.prototype.setFontSizeX = function setFontSizeX(n) {
	let cmd = 0x66
	if(n == 1) cmd = cmd = 0x00
	if(n == 2) cmd = cmd = 0x11
	if(n == 3) cmd = cmd = 0x22
	if(n == 4) cmd = cmd = 0x33
	if(n == 5) cmd = cmd = 0x44
	if(n == 6) cmd = cmd = 0x55
	if(n == 7) cmd = cmd = 0x66
	if(n == 8) cmd = cmd = 0x77
	this.write(Buffer.from([0x1D, 0x21, cmd]))
}

/**
 * This method writes normal text to buffer for futher writing
 * @param {String} str text to print
 */
Printer.prototype.printNormalText = function printNormalText(str) {
	this.write(Buffer.from(str))
}

/**
 * This method cuts paper
 */
Printer.prototype.cutPaper = function cutPaper() {
    if(printer == type.K80) {
		this.write(Buffer.from([0x1B, 0x69]))
	} else {
		this.write(Buffer.from([0x1C, 0x50, 0x0A, 0x01, 0x45, 0x05]))
	}
}

module.exports = Printer