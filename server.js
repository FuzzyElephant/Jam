var uuid = require('uuid-random');
const WebSocket = require('ws');

const wss = new WebSocket.WebSocketServer({port:8080}, ()=> { console.log('Server Started')})

var playerData = { "type" : "PlayerData" }

function isString(x) {
    return Object.prototype.toString.call(x) === "[object String]"
}

//=====WEBSOCKET FUNCTIONS======

//Websocket function that managages connection with clients
wss.on('connection', function connection(client){

    //Create Unique User ID for player
    client.id = uuid();

    console.log(`Client ${client.id} Connected!`)

    var currentClient = playerData[""+client.id]

    //Send default client data back to client for reference
    client.send(`{"id": "${client.id}"}`)

    //Method retrieves message from client
    client.on('message', (data) => {

        if (isString(data)) {

            var dataJSON = JSON.parse(data)

            console.log("Player Message")
            console.log(dataJSON)
        }
    })

    //Method notifies when client disconnects
    client.on('close', () => {
	    console.log('This Connection Closed!')
    console.log("Removing Client: " + client.id)
    })

})

wss.on('listening', () => {
    console.log('listening on 8080')
})
