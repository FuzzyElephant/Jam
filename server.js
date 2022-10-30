var uuid = require('uuid-random');
const WebSocket = require('ws');

const wss = new WebSocket.WebSocketServer({ port: 8080 }, () => { console.log('Server Started') })

var playerData = {}
var roomList = {}

function GetNumElements(someList) {
    if (someList == null)
        return 0;

    var numElems = 0
    for (item in someList) {
        if (item == null) {
            continue;
        }
console.log(`item = ${item}`)
        numElems = numElems + 1
    }

    return numElems
}

function BroadcastMsgToClients(msg, clientToSkip) {

    //console.log(`BroadcastMsgToClients() -- ${msg}`)
    for (player in playerData) {
        if (player === clientToSkip) {
            continue;
        }

        var currentClient = playerData[player]
        currentClient["nethandle"].send(msg)
    }
}

function FindRoom(roomCode, bCreateIfNotFound) {
    console.log(`Looking for room.  Room code = ${roomCode}`)

    var room = roomList["" + roomCode];
    if (room != null) {
        console.log(`       Room found. Num players = ${GetNumElements(room.Players)}`)
        return room;
    }

    if (bCreateIfNotFound == false) {
        return null;
    }

    console.log(`       Room not found.  Creating room`);
    room = new Object();
    room.roomCode = roomCode
    roomList["" + roomCode] = room
    room["players"] = new Object();
    return room
}

function AddPlayerToRoom(clientId, player, room) {
    console.log(`Adding ${player.displayName} to room ${room.roomCode}`)
    room.players["" + clientId] = player
    player.room = room;
}

function RemovePlayerFromRoom(clientId, player) {
    if (player.room == null) {
        return;
    }

    delete player.room.players["" + clientId]
    var roomCode = player.room.roomCode;
    console.log(`${player.displayName} left room ${roomCode}.  ${GetNumElements(player.room.players)} left`);

    if (GetNumElements(player.room.players) === 0) {
        console.log(`Deleting room ${roomCode}`)
        delete roomList["" + roomCode]
      //  roomList["" + roomCode] = null
    }
    player.room = null
}

function BroadcastMsgToRoom(room, msg, sendingClient, currentPlayer) {
    if (room == null) {
        return;
    }

    for (client in room.players) {
       if (client === sendingClient) {
            continue;
       }

        var currentClient = playerData[client]
        currentClient["nethandle"].send(`{"cmd": "chat", "id": "${sendingClient}", "displayName": "${currentPlayer.displayName}", "msg": "${msg}"}`)
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
    currentClient["nethandle"] = client;

    currentClient["nethandle"].send(`{"cmd": "addPlayer", "id": "${client.id}", "isLocalPlayer": "true"}`)
    BroadcastMsgToClients(`{"cmd": "addPlayer", "id": "${client.id}", "isLocalPlayer": "false"}`, client.id)

    for (player in playerData) {
        if (player == client.id) {
            continue
        }

        currentClient["nethandle"].send(`{"cmd": "addPlayer", "id": "${player}", "isLocalPlayer": "false"}`)
    }

    //Method retrieves message from client
    client.on('message', (data) => {
        console.log(`Message recvd = ${data}`)

        var forceExit = false;

        try {
            var currentPlayer = playerData["" + client.id]
            var dataJSON = JSON.parse(data)

            if (dataJSON.cmd != null) {

                //// console.log(`Updating position for ${client.id}`)
                if (dataJSON.cmd === 'updatePos') {
                    BroadcastMsgToClients(JSON.stringify(dataJSON), client.id);
                } else if (dataJSON.cmd === 'ping') {
                    client.send(JSON.stringify(dataJSON))
                } else if (dataJSON.cmd === 'findGame') {
                    console.log(`Finding game ${data}`)
                    currentPlayer.displayName = dataJSON.displayName;
                    console.log(`Player name is ${currentPlayer.displayName}`)
                    var room = FindRoom(dataJSON.roomCode, true)
                    AddPlayerToRoom(client.id, currentPlayer, room)
                } else if (dataJSON.cmd === 'chat') {
                    if (dataJSON.msg === 'crash') {
                        console.log("Crash!")
                        forceExit = true
                    } else {
                        BroadcastMsgToRoom(currentPlayer.room, dataJSON.msg, client.id, currentPlayer)
                    }
                }
                else {
                    console.log(`Cmd = ${cmd}`)
                }
            }
            else {
                console.log("asdasdasd")
            }
        } catch (e) {
            console.log(`Exception raised ${e}`)
        }

        if (forceExit) {
            console.log("Foring exit...")
            throw('Force Quit')
        }
    })

    //Method notifies when client disconnects
    client.on('close', () => {
        console.log("Connection closed.  Removing Client: " + client.id)
        BroadcastMsgToClients(`{"cmd": "removePlayer", "id": "${client.id}"}`)

        var curPlayer = playerData["" + client.id]
        var room = curPlayer.room;

        if (curPlayer.room != null) {
            console.log(`       Removing player from room ${curPlayer.room.roomCode}`);
            RemovePlayerFromRoom(client.id, curPlayer)
        }

        delete playerData["" + client.id]
        currentClient.client = null

        if (room != null) {
            console.log(`${GetNumElements(playerData)} Connected.  # rooms = ${GetNumElements(roomList)}`);
        }
    })
})

wss.on('listening', () => {
    console.log('listening on 8080')
})
