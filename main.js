const express = require('express')
	, app = express()
	, request = require('request-promise-native')
	, http = require('http').Server(app)
	, io = require('socket.io').listen(http)
;

/**
 * @function
 * @param {Object} auth
 * @param {string} auth.token
 * @param {string} auth.host
 * @param {Object} oldStorages
 * @returns {Promise<{}>}
 */
async function getStorage(auth, oldStorages = {}) {
	// console.log('getStorage');
	let data =  await request({method: "post", uri: auth.host+"/?/Api/", json: true, form: {Module: "Contacts", Method: "GetContactStorages"}, headers: {Authorization: 'Bearer '+auth.token}});
	const retData = {};
	for (let storage of data.Result) retData[storage.Id] = oldStorages[storage.Id] && oldStorages[storage.Id].CTag == storage.CTag ? oldStorages[storage.Id] : {CTag: storage.CTag, contacts: await getContacts(auth, storage.Id, oldStorages[storage.Id] ? oldStorages[storage.Id].contacts : undefined)};
	return retData;
}

/**
 * @function
 * @param {Object} auth
 * @param {string} auth.token
 * @param {string} auth.host
 * @param {string} storage
 * @param {Object} oldContacts
 * @returns {Promise<{}>}
 */
async function getContacts(auth, storage = '', oldContacts = {}) {
	if (!storage) throw 'Internal error. Storage not set.';
	
	// console.log('getContacts');
	let data =  await request({method: "post", uri: auth.host+"/?/Api/", json: true, form: {Module: "Contacts", Method: "GetContactsInfo", Parameters: JSON.stringify({Storage: storage})}, headers: {Authorization: 'Bearer '+auth.token}});
	
	const retData = {};
	const contactsInfo = await getContactsInfo(auth, storage, data.Result.Info.filter(el => !oldContacts[el.UUID] || oldContacts[el.UUID].ETag != el.ETag).map(el => el.UUID));
	for (let contact of data.Result.Info) retData[contact.UUID] = {ETag: contact.ETag, info: contactsInfo[contact.UUID] || oldContacts[contact.UUID]};
	return retData;
}

/**
 * @function
 * @param {Object} auth
 * @param {string} auth.token
 * @param {string} auth.host
 * @param {string} storage
 * @param uuids
 * @returns {Promise<{}>}
 */
async function getContactsInfo(auth, storage, uuids = []) {
	if (!uuids.length) return {};
	
	// console.log('getContactsInfo');
	let data =  await request({method: "post", uri: auth.host+"/?/Api/", json: true, form: {Module: "Contacts", Method: "GetContactsByUids", Parameters: JSON.stringify({Storage: storage, Uids: uuids})}, headers: {Authorization: 'Bearer '+auth.token}});
	
	const retData = {};
	for (let info of data.Result) retData[info.UUID] = {name: info.FirstName, fullName: info.FullName, email: info.ViewEmail, phone: info.PersonalMobile, address: info.PersonalAddress, skype: info.Skype, facebook: info.Facebook};
	return retData;
}

session = require('express-session')({secret: "hrouow47g4", resave: false, saveUninitialized: false, name: 'sid', cookie: {maxAge: 604800000}});

io.use((socket, next) => {session(socket.request, socket.request.res || {}, next)});
io.on('connection', (socket) => {
	socket.on('begin', async () => {
		socket.request.session.storage = await getStorage(socket.request.session.auth, socket.request.session.storage);
		socket.request.session.save();
		let sendData = {};
		for (let name of Object.keys(socket.request.session.storage))
			if (Object.keys(socket.request.session.storage[name].contacts).length)
				sendData[name] = socket.request.session.storage[name].contacts;
		socket.emit('sendBegin', sendData);
	});
});

app
	.use(express.urlencoded({ extended: true }))
	.use(express.json())
	.use(require('cookie-parser')())
	.use(session)
	.get('/', (req, res) => {if (!req.session.auth) {res.redirect('/login'); return;} res.sendFile(process.env.PWD+'/index.html')})
	.get('/login', (req, res) => {if (req.session.auth) {res.redirect('/'); return;} res.sendFile(process.env.PWD+'/login.html')})
	.get('/logout', (req, res) => {req.session.regenerate(() => {});res.redirect('/login')})
	.post('/login', async (req, res) => {
		if (!req.body.host || !req.body.mail || !req.body.password) {res.send('required data is not sent <a href="/login">Login</a>');return;}
		
		let data = await request({method: "post", uri: req.body.host+"/?/Api/", json: true, form: {Module: "Core", Method: "Login", Parameters: JSON.stringify({Login: req.body.mail, Password: req.body.password, Pattern: ""})}}).catch(() => 0);
		if (!data || data.ErrorCode) {res.send('Login error <a href="/login">Login</a>');return;}
		
		req.session.auth = {token: data.Result.AuthToken, host: req.body.host};
		res.redirect('/');
	});

// Handle 404 AND 500
app.use((req, res) => res.status(404).send('404 Error <a href="/">Home page</a>'))
	.use((error, req, res) => {console.warn(error); res.status(500).send('500 Error <a href="/">Home page</a>');});

http.listen(8000, () => console.log('Work on port :8000'));