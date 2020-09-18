const SerialPort = require('serialport')
const Printer = require('./command-list')
const config = require('./config.json');

const type = config.type
let port = null

if(config.portConfiguration != null) {
	port = new SerialPort(config.portConfiguration.port, {
		baudRate: config.portConfiguration.baudRate
	})

	port.on('open', function() {
		console.log("PORT OPEN")
		testPrint().then(() => {
			setTimeout(function(){
				closeSerialPort()
			}, 5000);
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
}



if(port == null) {
	testPrint()
}

function testPrint() {
	const printer = new Printer(type, port);
	printer.resetBuffer()
	printer.setCharacterFont(0x31)
	printer.setCenter()
	printer.printRasterBitImage(__dirname + '/img/logo.png', 512, 128).then(() => {
		printer.setCharacterSpacing(0x02)
		printer.setFontSizeX(2)
		printer.setBold()
		printer.setLeft()
		printer.setLeftMargin(0x30)
		printer.setDensity(1);

		printer.printAndFeedN(0x04)

		printer.printNormalText("RECEIPT")
		printer.printAndFeedN(0x02)

		printer.setFontSizeX(1)
		printer.printNormalText("Operator")
		printer.printAndFeedN(0x00)
		printer.printNormalText("https://example.com")
		printer.printAndFeedN(0x00)
		printer.printNormalText("info@example.com")
		printer.printAndFeedN(0x00)
		printer.printNormalText("+995 555 111 222")
		printer.printAndFeedN(0x00)
		printer.printNormalText("+995 3222 222 222")
		printer.printAndFeedN(0x00)
		printer.printAndFeedN(0x02)

		printer.printNormalText("Customer: John Doe")
		printer.printAndFeedN(0x00)
		printer.printNormalText("Session:")
		printer.printAndFeedN(0x00)
		printer.setLeftMargin(0x50)
		printer.printNormalText("0162a-7edb-4667-b2c0-496f21sa23")
		printer.printAndFeedN(0x02)

		printer.setLeftMargin(0x30)
		printer.printNormalText("Time: 2020-09-18 24:50:56 UTC")
		printer.printAndFeedN(0x00)
		printer.printNormalText("Direction: Cash-Out")
		printer.printAndFeedN(0x00)
		printer.printNormalText("Fiat: 50EUR")
		printer.printAndFeedN(0x00)
		printer.printNormalText("Crypto: 0.00556 BTC")
		printer.printAndFeedN(0x00)
		printer.printNormalText("Rate: 1 BTC = 6879.51 EUR")
		printer.printAndFeedN(0x02)

		printer.printNormalText("TXID:")
		printer.printAndFeedN(0x00)
		printer.setLeftMargin(0x50)

		printer.printNormalText("f4184fc596403b9d638783cf57adfe4c")
		printer.printAndFeedN(0x00)

		printer.printNormalText("75c605f6356fbc91338530e9831e9e16")
		printer.printAndFeedN(0x02)
		printer.setLeftMargin(0x30)
		
		printer.printNormalText("Address:")
		printer.printAndFeedN(0x00)
		printer.setLeftMargin(0x50)
		printer.printNormalText("1BoatSLRHtKNngkdX")
		printer.printAndFeedN(0x00)
		printer.printNormalText("EeobR76b53LETtpyT")
		printer.printAndFeedN(0x04)

		printer.printQR("f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16")
		printer.printAndFeedN(0x04)
		printer.print()
		printer.cutPaper()
	})
}

function closeSerialPort() {
	console.log("PORT CLOSED")
	if (port != null) {
		port.close();
	}
}
