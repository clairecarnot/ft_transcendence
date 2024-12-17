"use strict"

import { navigateTo } from "./router.js";
import { localGameEvent, joinGameEvent, createGameEvent, createTournamentEvent, joinTournamentEvent, gameNameSave } from "./game_events.js"
import { nextGameTournament, tSocket } from "./tournament_utils.js"
import { matchIssueDisplay } from "./game_utils.js"
import { hideAlert, showAlert, getCookie, refreshAccessToken } from "./utils.js";

let socket
let gameButton, tournamentButton, createGameButton, joinGameButton, localGameButton, remoteGameButton, backButton
let gameTournamentSetup, localRemoteSetup, createJoinSetup, setup4, setup5, setup5Tournament, cardSetup3, gameName, gameNameName, gameNameBox, container, ball, paddleL, paddleR, scorePL, scorePR, victory, replay, matchIssue, backMenu; //, winnerName, loserName;
let tournament = false;

async function remove_player() {
	console.log("remove_player")
	const requestBody = {
		gameNameSave,
	};
	await refreshAccessToken();
	const response = await fetch("backend/pong/remove_player/", {
		method : "POST",
		headers : {
			"Content-Type" : "application/json",
			"X-CSRFToken" : getCookie("csrftoken"),
		},
		body: JSON.stringify(requestBody),
	});
}

// REFRESH WINDOW + CLOSE VIA RED CROSS
window.addEventListener("beforeunload", async function () {
	console.log("beforeunload event")
	if (socket) {
		console.log("Closing game socket")
		await socket.close(4001, "beforeunload event");
	}
	if (tSocket) {
		console.log("Closing game tsocket")
        await tSocket.close(4001, "beforeunload event");
    }
})

// BACK ARROW NAV
window.addEventListener("popstate", async function () {
	console.log("BACK ARROW")
	if (socket) {
		console.log("Closing game socket")
		socket.close(4002, "backarrow event");
	}
	if (tSocket) {
        await tSocket.close(4002, "backarrow event");
    }
})

function setTournament(tournamentValue) {
	tournament = tournamentValue;
	// console.log("tournament = " + tournament)
}

function updateContainerSize() {

	const aspectRatio = 1.4; // Ratio between width and height
	const maxHeight = window.innerHeight * 0.6; // Maximum height is 80% of the viewport height
	let containerW = window.innerWidth * 0.8; // 80% of the viewport width
	let containerH = containerW / aspectRatio; // Calculate height based on the width and ratio

	// Adjust width and height if the calculated height exceeds the max height
	if (containerH > maxHeight) {
		containerH = maxHeight; // Cap the height
		containerW = containerH * aspectRatio; // Recalculate width based on the capped height
	}

	// Set the dimensions dynamically
	container.style.width = `${containerW}px`;
	container.style.height = `${containerH}px`;

	// Update paddle and ball sizes relative to the container size
	const paddlesH = `${containerH * 0.2}px`; // Paddle height is 20% of the container height
	const paddlesW = `${containerW * 0.01}px`; // Paddle width is 1% of the container width
	const ballRadius = `${containerH * 0.035}px`; // Ball radius is 3.5% of the container height

	// Apply the updated styles
	paddleL.style.height = paddlesH;
	paddleR.style.height = paddlesH;
	paddleL.style.width = paddlesW;
	paddleR.style.width = paddlesW;
	paddleR.style.transform = "translateX(-100%)";
	ball.style.height = ballRadius;
	ball.style.width = ballRadius;
}

function chekOpenWs(socket, message) {

	// Update container size on load
	updateContainerSize();
	socket.send(JSON.stringify(
		{
			action: message,
			paddle_h: paddleL.style.height.slice(0, -2),
			paddle_w: paddleL.style.width.slice(0, -2),
			container_h: container.style.height.slice(0, -2),
			container_w: container.style.width.slice(0, -2),
			ball_radius: ball.style.height.slice(0, -2),

		}
	));
	console.log("Connection to websocket");
}

// Display of the game
async function createGamePage(gameName, remote, tournament) {
	console.log("createGame")
	victory.style.display = "none";
	setup4.style.display = "none";
	// gameTournamentSetup.style.display = "none";
	createJoinSetup.style.display = "none";
	createGameButton.style.display = "none";
	localGameButton.style.display = "none";
	joinGameButton.style.display = "none";
	if (!tournament) {
		setup5.style.display = "flex";
		document.getElementById('game-name').style.display = "flex";
		document.getElementById('game-name-spinning').style.display = "flex";
		gameNameBox.style.display = "flex";
		document.getElementById('game-name').innerText = gameName.value;
	}
	// Creation cote javascript websocket = > A voir si besoin d un try catch pour ce block
	const host = window.location.host.split(':')[0];
	try {
		socket = new WebSocket("wss://" + host + ":1234/ws/pong/" + gameName.value + "/");
		if (remote) {
			socket.onopen = async(event) => chekOpenWs(socket, "new");
			// console.log("socket.onopen " + socket.onopen);
			console.log("new");
		}
		else {
			socket.onopen = (event) => chekOpenWs(socket, "local");
			console.log("local");
		}
	}
	catch (err) {
		console.log("err " + err);
		createGamePage(gameName, remote, tournament);
	}

	replay.addEventListener("click", (e) => {
		e.preventDefault();
		victory.style.display = "none";
		chekOpenWs(socket, "replay");
	})

	let arrowUp = false;
	let arrowDown = false;
	let keyW = false;
	let keyS = false;

	document.onkeydown = (event) => {
		// console.log("onkeydown")
		if (socket && socket.readyState === WebSocket.OPEN) {
			if (!keyW && `${event.code}` === 'KeyW') {
				keyW = true;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
			if (!keyS && `${event.code}` === 'KeyS') {
				keyS = true;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
			if (!arrowUp && `${event.code}` === 'ArrowUp') {
				arrowUp = true;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
			if (!arrowDown && `${event.code}` === 'ArrowDown') {
				arrowDown = true;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
			if (`${event.code}` === 'Space') {
				socket.send(JSON.stringify(
					{
						action: "pause",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
			}
		}
	};

	document.onkeyup = (event) => {
		if (socket && socket.readyState === WebSocket.OPEN) {
			if (`${event.code}` === 'KeyW') {
				keyW = false;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
			if (`${event.code}` === 'KeyS') {
				keyS = false;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
			if (`${event.code}` === 'ArrowUp') {
				arrowUp = false;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
			if (`${event.code}` === 'ArrowDown') {
				arrowDown = false;
				socket.send(JSON.stringify(
					{
						action: "playing",
						remote: remote,
						keyW: keyW,
						keyS: keyS,
						arrowUp: arrowUp,
						arrowDown: arrowDown,
					}
				));
				return;
			}
		}
	};
	socket.onmessage = (event) => {
		try {
			let game;
			try {
				game = JSON.parse(event.data);
			}
			catch (err) {
				console.log(err);
				return;
			}
			paddleL.style.top = game.paddle_left_pos_top_y + "%";
			paddleR.style.top = game.paddle_right_pos_top_y + "%";
			ball.style.left = game.ball_pos_center_x + "%";
			ball.style.top = game.ball_pos_center_y + "%";

			scorePL.innerText = `${game.playerLPseudo} : ${game.paddle_left_points}`;
			scorePR.innerText = `${game.playerRPseudo} : ${game.paddle_right_points}`;
			if (game.active === "playing")
				return;
			if (game.active === "start") { // => game just began, on grise les parametres
				// console.log("start");
				setup5.style.display = "none";
				document.getElementById('game-name').style.display = "none";
				document.getElementById('game-name-spinning').style.display = "none";
				gameNameBox.style.display = "none";
				document.getElementById('rotating-star').style.display = "none";
				setup5Tournament.style.display = "none";
				document.getElementById("tournament-name").style.display = "none";
				document.getElementById("tournament-name-spinning").style.display = "none";
				document.getElementById("tournament-name-text").style.display = "none";

				gameName.readOnly = true;
				paddleR.style.left = game.paddle_right_pos_top_x + "%";
				paddleL.style.left = game.paddle_left_pos_top_x + "%";
				container.style.display = 'flex';
				backButton.style.display = 'none';
				return;
			}
			// END GAME
			if (game.active === "L" || game.active === "R") // => un joueur a gagne =>update de points
			{
				// console.log("game = " + game);
				if (tournament) {
					nextGameTournament(game);
				}
				else
					matchIssueDisplay(game, false);
				// console.log(game.active)
				// console.log(game.quit)
				if (game.quit === "yes") {
					// console.log("receive quit from back")
					replay.style.display = 'none';
				}
				return;
			}

		}
		catch (err) {
			console.log(err);
			if (socket)
				socket.close();
			if (tournament)
				remove_player();
			return (navigateTo("/home"));
		}
	};

	socket.onerror = (event) => {
		// alert(event.code); //=> Pour fenetre pop up et pas que console
		console.log("error :" + event.code);
	}

	socket.onclose = (event) => {
		console.log("close :" + event.code);
		if (event.code == 3000)
			console.log("Connection refused : Impossible to connect to this game");
	};
}

async function initVariables() {
	gameButton = document.getElementById("game-button");
	tournamentButton = document.getElementById("tournament-button");
	remoteGameButton = document.getElementById("remotegame-button");
	createGameButton = document.getElementById("creategame-button");
	joinGameButton = document.getElementById("joingame-button");
	cardSetup3 = document.getElementById("card-createJoinSetup");
	gameNameBox = document.getElementById("game-name-box");
	localGameButton = document.getElementById("localgame-button");
	backButton = document.getElementById("home-button");
	setup5 = document.getElementById("setup5");
	setup5Tournament = document.getElementById("setup5tournament");
	setup4 = document.getElementById("setup4");
	createJoinSetup = document.getElementById("createJoinSetup");
	gameTournamentSetup = document.getElementById("gameTournamentSetup");
	localRemoteSetup = document.getElementById("localRemoteSetup");
	gameName = document.getElementById("create-game");
	container = document.getElementById("container");
	ball = document.getElementById("ball");
	paddleL = document.getElementById("paddle-left");
	paddleR = document.getElementById("paddle-right");
	scorePL = document.getElementById("score-pl");
	scorePR = document.getElementById("score-pr");
	victory = document.getElementById("victory");
	replay = document.getElementById("replay-btn");
	matchIssue = document.getElementById("match-issue");
	backMenu = document.getElementById("menu-btn");
}

async function createJoinChoice(tournament) {
	let hadOtherThanAlpha = false;
	console.log("createJoinChoice");

	gameTournamentSetup.style.display = "none";
	localRemoteSetup.style.display = "none";
	createJoinSetup.style.display = "flex";

	function roomNameFilled() {
		const isAlpha = /^[a-zA-Z]*$/.test(gameName.value);
		createGameButton.disabled = gameName.value === '' || !isAlpha || gameName.value === "cligame" || gameName.value.length > 15;
		if (!isAlpha) {
			showAlert("Only letters are allowed.", "basic");
			hadOtherThanAlpha = true;
		}
		if (hadOtherThanAlpha == true && isAlpha == true) {
			hideAlert();
		}
	}

	gameName.addEventListener('input', roomNameFilled);


	if (!tournament) {
		// If createGameButton => create a a game and wait for someone to join
		createGameButton.innerText = "Create Game"
		createGameButton.addEventListener("click", createGameEvent)
		// If joinGameButton => Print all the existing Game waiting for a second player
		joinGameButton.innerText = "Join an existing Game"
		joinGameButton.addEventListener("click", joinGameEvent)
	}
	else {
		// If createGameButton => create a a game and wait for someone to join
		createGameButton.innerText = "Create Tournament"
		createGameButton.addEventListener("click", createTournamentEvent)
		joinGameButton.innerText = "Join an existing Tournament"
		joinGameButton.addEventListener("click", joinTournamentEvent)
	}
}

async function localRemoteChoice() {
	console.log("localRemoteChoice");

	gameTournamentSetup.style.display = "none";
	localRemoteSetup.style.display = "flex";
	createJoinSetup.style.display = "none";

	remoteGameButton.addEventListener("click", async (e) => { createJoinChoice(false) });

	// If localGameButton => Create a party with two players on the same screen
	localGameButton.addEventListener("click", localGameEvent);
}

// async function gameTournamentTemplate(roomName) {
// 	console.log("gameTournamentTemplate");
// 	document.addEventListener("DOMContentLoaded", initVariables());
// 	// Call updateContainerSize on window resize
// 	window.addEventListener("resize", updateContainerSize);
// 	backButton.addEventListener("click", async function () {
// 		console.log("back button catch in gameTournamentTemplate")
// 		if (socket)
// 			await socket.close();
// 		if (tournament)
// 			await remove_player();
// 		await navigateTo("/home");
// 	})

// 	if (roomName) {
// 		// console.log("roomName" + roomName);

// 		gameName.value = roomName;
// 		// console.log("gameName.value" + gameName.value);
// 		gameTournamentSetup.style.display = "none";
// 		return createGamePage(gameName, true, false);
// 	}
// 	// // Call updateContainerSize on window resize
// 	// window.addEventListener("resize", updateContainerSize);

// 	gameTournamentSetup.style.display = "flex";
// 	localRemoteSetup.style.display = "none";
// 	createJoinSetup.style.display = "none";

// 	gameButton.addEventListener("click", localRemoteChoice);
// 	tournamentButton.addEventListener("click", async (e) => {
// 		try {
// 			createJoinChoice(true)
// 		}
// 		catch (err) { console.log("catch button", err); throw err; }
// 	});
// 	// backButton.addEventListener("click", async function () {
// 	// 	console.log("back button catch in gameTournamentTemplate")
// 	// 	if (socket)
// 	// 		await socket.close();
// 	// 	if (tournament)
// 	// 		await remove_player();
// 	// 	await navigateTo("/home");
// 	// })
// }

async function gameTournamentTemplate(roomName) {
	console.log("gameTournamentTemplate");
	document.addEventListener("DOMContentLoaded", initVariables());
	if (roomName) {
		// console.log("roomName" + roomName);
		
		gameName.value = roomName;
		// console.log("gameName.value" + gameName.value);
		gameTournamentSetup.style.display = "none";

		window.addEventListener("resize", updateContainerSize);
		backButton.addEventListener("click", async function () {
			console.log("back button catch in gameTournamentTemplate")
			if (socket)
				await socket.close();
			if (tournament)
				await remove_player();
			await navigateTo("/home");
		})

		return createGamePage(gameName, true, false);
	}
	// Call updateContainerSize on window resize
	window.addEventListener("resize", updateContainerSize);

	gameTournamentSetup.style.display = "flex";
	localRemoteSetup.style.display = "none";
	createJoinSetup.style.display = "none";

	gameButton.addEventListener("click", localRemoteChoice);
	tournamentButton.addEventListener("click", async (e) => {
		try {
			createJoinChoice(true)
		}
		catch (err) { console.log("catch button", err); throw err; }
	});
	backButton.addEventListener("click", async function () {
		console.log("back button catch in gameTournamentTemplate")
		if (socket)
			await socket.close();
		if (tournament)
			await remove_player();
		await navigateTo("/home");
	})
}

export { gameTournamentTemplate, createGamePage, createGameButton, joinGameButton, gameName, socket, setup5Tournament, matchIssue, replay, victory, backMenu, container, setTournament, remove_player };
