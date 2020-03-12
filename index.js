const SerialPort = require('serialport')

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
    console.log(result);
    return result;
}

port.on('open', function() {
	console.log("PORT OPEN")
	write(Buffer.from([0x1B, 0x7B, 0x00])) //Set Printing Direction
	write(Buffer.from([0x1B, 0x74, 0x00])) //Set Character Set
	write(Buffer.from([0x1D, 0xE7, 0x00, 0x00])) //Set Notch Area
	// write(Buffer.from([0x1D, 0x4C, 0x00, 0x00])) //XUIVO
	// write(Buffer.from([0x1D, 0x7C, 0x04])) //Set Densiti: Normal
	// write(Buffer.from([0x1B, 0x61, 0x01])) //Flush Center
	// write(Buffer.from([0x1D, 0x21, 0x32])) //Double Height Mode
	// write(Buffer.from([hex("MEIDAN")]))
	// write(Buffer.from([0x0A]))
	// write(Buffer.from([hex("PARKING")]))
	// write(Buffer.from([0x1B, 0x64, 0x02])) //Print and add feed n
	// write(Buffer.from([0x1B, 0x61, 0x00])) //Flush Left
	// write(Buffer.from([0x1B, 0x21, 0x00])) //Normal Font Mode
	// write(Buffer.from([0x1B, 0x47, 0x00])) //Deactivate double strike mode
	// write(Buffer.from([0x1B, 0x21, 0x30])) //Font Width
	// write(Buffer.from([0x1B, 0x21, 0x03])) //Font Weight
	// write(Buffer.from([hex("DATE:")]))
	// write(Buffer.from([0x09]))
	// write(Buffer.from([hex("2020-05-02")]))
	write(Buffer.from([0x1B, 0x61, 0x01]))    // Flush Center
    write(Buffer.from([0x1B, 0x21, 0x60]))    // FONT width
    write(Buffer.from([0x1B, 0x21, 0x08]))    // FONT height
    write(Buffer.from([0x1B, 0x47, 0x01]))    // Activate Double strike mode
    write(Buffer.from(hex("Thank you for visit")))
    write(Buffer.from([0x1B, 0x64, 0x02]))    // Print add Feed n
    write(Buffer.from([0x1B, 0x61, 0x00]))    // Flush Left


    write(Buffer.from([0x1B, 0xC1, 0x48]))    // FONT width
    write(Buffer.from([0x1D, 0x7C, 0x01]))    // Densiti
    write(Buffer.from([0x1B, 0x21, 0x01]))    // Font Size


    write(Buffer.from([0x1B, 0x64, 0x04]))        // Print add Feed n
    write(Buffer.from([0x1B, 0x69]))
	// write(Buffer.from([0x1B, 0x69]))

	// write(Buffer.from([0x1C, 0x93, 0x00, 0x0A, 0x81, 0x01, 0x00, 0x00]))
	// let cmd = Buffer.from([0x10, 0x04, 0x04])
	// write(cmd)
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

function write(data) {
	console.log('SENDING: ', data)
    port.write(data)
}