const Canvas = require('canvas-browserify');
const Dither = require('canvas-dither');
const Flatten = require('canvas-flatten');

let image = encodeImage('./RandomBitmap.png', 512, 512)
image.then((image) => {
	console.log(image)
});

function encodeImage(imagePath, width, height) {
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

        // switch (algorithm) {
        //     case 'threshold': image = Dither.threshold(image, threshold); break;
        //     case 'bayer': image = Dither.bayer(image, threshold); break;
        //     case 'floydsteinberg': image = Dither.floydsteinberg(image); break;
        //     case 'atkinson': 
        image = Dither.atkinson(image);
        // }

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

        const res = Buffer.from([
            0x1d, 0x76, 0x30, 0x00,
            (width >> 3) & 0xff, (((width >> 3) >> 8) & 0xff),
            height & 0xff, ((height >> 8) & 0xff),
            bytes,
        ])

        bytes = Buffer.from(bytes)
        console.log(bytes.length)
        return Buffer.concat([res, bytes])
    }).catch(err => {
        console.log('oh no!', err)
    })

    return result
}