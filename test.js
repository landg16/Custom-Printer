const fs = require('fs');
const Canvas = require('canvas-browserify')
const Dither = require('canvas-dither')
const Flatten = require('canvas-flatten')

// const fileSize = getFilesizeInBytes("./font.ttf");
// const fileBytes = getFileByteArray("./font.ttf");


function getFilesizeInBytes(filename) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return Buffer.from([fileSizeInBytes >> 24, fileSizeInBytes >> 16, fileSizeInBytes >> 8, fileSizeInBytes])
}

function getFileByteArray(filePath){
    return fs.readFileSync(filePath);
}

encodeImageForLogo("./logo.jpg", 512, 128)

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

		// for (let y = 0; y < height; y++) {
  //           for (let x = 0; x < width; x = x + 16) {
  //               let i = ((height - y) * (width / 16)) + (x / 16);
  //               bytes[i] =
  //               	getPixel(x + 0, y) << 15 |
  //                   getPixel(x + 1, y) << 14 |
  //                   getPixel(x + 2, y) << 13 |
  //                   getPixel(x + 3, y) << 12 |
  //                   getPixel(x + 4, y) << 11 |
  //                   getPixel(x + 5, y) << 10 |
  //                   getPixel(x + 6, y) << 9 |
  //                   getPixel(x + 7, y) << 8 |
  //                   getPixel(x + 8, y) << 7 |
  //                   getPixel(x + 9, y) << 6 |
  //                   getPixel(x + 10, y) << 5 |
  //                   getPixel(x + 11, y) << 4 |
  //                   getPixel(x + 12, y) << 3 |
  //                   getPixel(x + 13, y) << 2 |
  //                   getPixel(x + 14, y) << 1 |
  //                   getPixel(x + 15, y);
  //           }
  //       }
        console.log(bytes)

        return image
    }).catch(err => {
        console.log('oh no!', err)
    })
}