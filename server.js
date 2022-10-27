var uuid = require('uuid-random');
const WebSocket = require('ws');

const wss = new WebSocket.WebSocketServer({ port: 8080 }, () => { console.log('Server Started') })

//var playerData = { "type": "PlayerData" }
var playerData = {}

function isString(x) {
    return Object.prototype.toString.call(x) === "[object String]"
}

function BroadcastMsgToClients(msg, clientToSkip) {

    //console.log(`BroadcastMsgToClients() -- ${msg}`)
    for (player in playerData) {
        if (player === clientToSkip) {
           // console.log(`   Skipping -- ${player}`)
            continue;
        }

       // console.log(`       Sending to ${player}`)
        var currentClient = playerData[player]
        currentClient["Handle"].send(msg)
    }
}

//=====WEBSOCKET FUNCTIONS======

//Websocket function that managages connection with clients
wss.on('connection', function connection(client) {

    //Create Unique User ID for player
    client.id = uuid();

    console.log(`Client ${client.id} Connected!`)

    playerData["" + client.id] = new Object();
    var currentClient = playerData["" + client.id]
    currentClient["Handle"] = client;

    currentClient["Handle"].send(`{"cmd": "addPlayer", "id": "${client.id}", "isLocalPlayer": "true"}`)
    BroadcastMsgToClients(`{"cmd": "addPlayer", "id": "${client.id}", "isLocalPlayer": "false"}`, client.id)

    for (player in playerData) {
        if (player == client.id) {
            continue
        }

        currentClient["Handle"].send(`{"cmd": "addPlayer", "id": "${player}", "isLocalPlayer": "false"}`)
    }

  /*  for (player in playerData) {

       // if (player["Handle"] != null)
        console.log(`handling ${player}`)
        var curClient = playerData[player]
        if (player == client.id) {
            curClient["Handle"].send(`{"id": "${client.id}", "isLocalPlayer": "true"}`)
        }
        else {
            curClient["Handle"].send(`{"id": "${client.id}","isLocalPlayer": "false"}`)

        }
    }*/

    //Method retrieves message from client
    client.on('message', (data) => {
      //  console.log(`Message recvd = ${data}`)
    //    console.log(`type of is ${typeof data}`)
        {

            try {

                var dataJSON = JSON.parse(data)
                if (dataJSON.cmd != null) {
                   //// console.log(`Updating position for ${client.id}`)
                    if (dataJSON.cmd === 'updatePos') {
                        BroadcastMsgToClients(JSON.stringify(dataJSON), client.id);
                    } else if (dataJSON.cmd === 'ping') {
                        client.send(JSON.stringify(dataJSON));
                    }

                }
              //  console.log(`Player Message ----_> "${dataJSON.xPos}`)
              //  console.log(dataJSON)

            } catch (e) {

            }
        }

    })

    //Method notifies when client disconnects
    client.on('close', () => {
        console.log("Connection closed.  Removing Client: " + client.id)
        BroadcastMsgToClients(`{"cmd": "removePlayer", "id": "${client.id}"}`)

        delete playerData["" + client.id]
        currentClient.client = null

        var numPlayers = 0
        for (player in playerData) {
            if (player == null) {
                continuie;
            }
            numPlayers = numPlayers + 1
        }
        console.log(`${numPlayers} Connected`)
    })

})

wss.on('listening', () => {
    console.log('listening on 8080')
})
