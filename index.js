const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { promisify } = require('util');
const __html = __dirname + '/public_html/';

const {GoogleSpreadsheet} = require('google-spreadsheet');
const creds = require('./credentials.json');

const docId = '1vBcxsOnDeBXCtCvK9w-CjzBBgh5L6tpRJo7ow_9thRg';
const doc = new GoogleSpreadsheet(docId);
let parsePhoneNumber =  require('libphonenumber-js');




const db = {
	get: async () => {
		await doc.loadInfo();
		console.log(doc.title);
		const sheet = doc.sheetsByIndex[0];
		const sheet2 = doc.sheetsByIndex[1];
		console.log(sheet.rowCount);
		const rows = await sheet.getRows();
		// console.log(rows);
		let nrows = [];
		rows.forEach(async (row, i)=>{
			// console.log(row);
			const Phone = parsePhoneNumber(row.Number, 'IN');
			let Phone2;
			if(row.Number2){
				Phone2 = parsePhoneNumber(row.Number2, 'IN');
			}
			if(Phone){
				row.Number = Phone.number;
			}
			if(Phone2){
				row.Number2 = Phone2.number;
			}
			const newRow = {
				Index: row.Index,
				Name: row.Name,
				Occupation: row.Occupation,
				Company: row.Company,
				Number: row.Number,				
				Number2: row.Number2,				
				Email: row.Email,
				Location: row.Location,
			};
			nrows.push(newRow);
			// const addedRow = await sheet2.addRow(newRow);
			// await addedRow.save();
		});
		console.log(`Adding new rows to : ${sheet2.title}`);
		const addedRow = await sheet2.addRows(nrows);
		// await addedRow.save();
		return nrows;
	},
	update: async data => {
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		let rows = await promisify(worksheet.getRows)({
			query: 'barcode = "NT00000004"'
		});
		rows[0].status = data.status;
		rows[0].save();
		return 'updated';
	},
	add: async data => {
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		/*
			_links: [Array],
			resize: [Function: _setInfo],
			setTitle: [Function],
			clear: [Function],
			getRows: [Function],
			getCells: [Function],
			addRow: [Function],
			bulkUpdateCells: [Function],
			del: [Function],
			setHeaderRow: [Function]
		*/
		await promisify(worksheet.addRow)(data);
		return 'added';
	},
	remove: async data => {
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		let rows = await promisify(worksheet.getRows)({
			query: 'barcode = "'+data.barcode+'"'
		});
		rows[0].del();
		return 'removed';
	},
	connect: async function(){
		// await promisify(doc.useServiceAccountAuth)(credentials);
		await doc.useServiceAccountAuth({
			client_email: creds.client_email,
		    private_key: creds.private_key,
		})
		/*
			resize: [Function: _setInfo],
			setTitle: [Function],
			clear: [Function],
			getRows: [Function],
			getCells: [Function],
			addRow: [Function],
			bulkUpdateCells: [Function],
			del: [Function],
			setHeaderRow: [Function]
		*/
		console.log('connected to db');
		await doc.loadInfo();
		const sheet = doc.sheetsByIndex[0];
		console.log(`Title: ${sheet.title}`);
	}
};

db.connect();

app.get('/', function(req, res){
	res.sendFile(__html + '/index.html');
});

io.on('connection', function(socket){
	/* console.log('a user connected'); */

	socket.on('get', async function(){
		console.log('Reading db...');
		let data = await db.get();
		socket.emit('data', data);
	});

	socket.on('add', async function(data){
		console.log('Adding row...');
		let status = await db.add(data);
		socket.emit('data', status);
	});

	socket.on('update', async function(data){
		console.log('Setting status...');
		let status = await db.update(data);
		socket.emit('data', status);
	});

	socket.on('remove', async function(data){
		console.log('Removing row...');
		let status = await db.remove(data);
		socket.emit('data', status);
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});