// A EFFACER

"use strict"
const sockets = {}

export function getSocket(url) {
    if (!sockets[url])
        return null;
    return sockets[url];
}

export function addSocket(url, socket) {
    if (!sockets[url])
        sockets[url] = socket;
}

// TODO : A IMPLEMENTER
// export const removeSocket = (url, socket) => {
//     socket[url]
// }


// Pour exploiter ces fonctions dans autre fichier :
// const ws = WebSocketService("ws://localhost:8000/ws/pong/" + gameName.value + "/");
	// let socket = getSocket("ws://localhost:8000/ws/pong/" + gameName.value + "/");
	// if (!socket) {
		// socket = new WebSocket("ws://localhost:8000/ws/pong/" + gameName.value + "/");
		// 	addSocket("ws://localhost:8000/ws/pong/" + gameName.value + "/", socket)
	// }

// class WebSocketService {
//     constructor(url) {
//         if (WebSocketService._instance) {
//             return WebSocketService._instance;
//         }
//         else
//             this.socket = new WebSocket(url);
//         WebSocketService._instance = this;
//     }
// }