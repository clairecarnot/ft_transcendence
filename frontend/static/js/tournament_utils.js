"use strict"

import { navigateTo } from "./router.js";
import { createGamePage, socket, gameName, container, setTournament } from "./game.js"
import { gameNameSave } from "./game_events.js"
import { matchIssueDisplay } from "./game_utils.js"
import { getCookie, refreshAccessToken, showAlert } from "./utils.js";
let tSocket

//  Wait for all players to join the tournament
async function waitForAllPlayers() {
	let responseData;
	try {
		do {
			await new Promise(r => setTimeout(r, 200));
			const requestBody = {
				gameNameSave,
			}
			await refreshAccessToken();
			const response = await fetch("/backend/pong/players_count/", {
				method : "POST",
				headers : {
					"Content-Type" : "application/json",
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body : JSON.stringify(requestBody),
			});
			if (!response.ok)
				throw new Error("Error request /backend/pong/players_count/");
			responseData = await response.json();
		}
		// MODIF 8
		while(responseData["player_len"] < 4)
		showAlert("If you quit this tournament, you won't be able to come back and it's gonna count as a defeat", "basic")
		await alertPlayers();
	}
	catch(err) { throw err; }
}

// If responseData["next"] === "no" => tournament_step not finish
// If responseData["next"] === "yes" => ready for next tournament_step
// If responseData["next"] === "end" => Tournament finish -> remain one winner
async function waitForAllWinners(gameName) {
	let responseData;
	try {
		do {
			await new Promise(r => setTimeout(r, 200));
			const requestBody = {
				gameNameSave,
			}
			await refreshAccessToken();
			const response = await fetch("/backend/pong/winners_count/", {
				method : "POST",
				headers : {
					"Content-Type" : "application/json",
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body : JSON.stringify(requestBody),
			});
			if (!response.ok)
				throw new Error("Error request /backend/pong/players_count/");
			responseData = await response.json();
		}
		while(responseData["next"] === "no")
		if (responseData["next"] === "yes") {
			await alertPlayers();
			return true;
		}
		// END OF TOURNAMENT ONLY ONE PLAYER REMAIN
		else
			return false;
	}
	catch(err) { throw err; }
}

// Handle end of a game for the winners of the previous game wait for a rematch if it is not the end
async function tournamentNextStep(game, gameName) {
	try {
		const next_game = await waitForAllWinners(gameName);
		if (next_game) {
			const requestBody = {
				gameNameSave,
			};
			await refreshAccessToken();
			const response = await fetch("/backend/pong/next_room/", {
				method : "POST",
				headers : {
					"Content-Type" : "application/json",
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body : JSON.stringify(requestBody),
			});
			if (!response.ok)
				throw new Error("Error request /backend/pong/next_game/");
			const responseData = await response.json();
			if (responseData["next"] === "yes") {
				gameName.value = responseData["room_name"];
				createGamePage(gameName, true, true);
			}
			else if (responseData["next"] === "no")
				tournamentNextStep(game, gameName);
			else
				tournamentIssueDisplay(game);
		}
		else
			tournamentIssueDisplay(game);
		}
	catch(err) { throw err; }
}

async function deleteTournament() {
	const requestBody = {
		gameNameSave,
	}
	await refreshAccessToken();
	const response = await fetch("/backend/pong/delete_tournament/", {
		method : "DELETE",
		headers : {
			"Content-Type" : "application/json",
			'X-CSRFToken': getCookie('csrftoken'),
		},
		body : JSON.stringify(requestBody),
	})
}

// Only for WinnerTournament
function tournamentIssueDisplay(game) {
	tSocket.close();
	console.log("TournamentIssueDisplay");
	deleteTournament();
	setTournament(false);
	if (game.active === "L")
		document.getElementById("match-issue-tournament").innerText = `${game.playerLPseudo} won the Tournament!`;
	else
		document.getElementById("match-issue-tournament").innerText = `${game.playerRPseudo} won the Tournament!`;
	document.getElementById('rotating-star').style.display = "none";
	document.getElementById("tournament-name").style.display = "none";
	document.getElementById("tournament-name-spinning").style.display = "none";
	document.getElementById("tournament-name-text").style.display = "none";
	document.getElementById("victory-tournament").style.display = 'none';
	container.style.display = 'flex';
	document.getElementById("victory-tournament").style.display = "flex";
	// button go_back_to_menu listener event
	document.getElementById("menu-btn-tournament").addEventListener("click", (e) => {
		e.preventDefault();
		document.getElementById("victory-tournament").style.display = "none";
		if (socket.readyState === socket.OPEN) {
			socket.send(JSON.stringify(
				{
					action: "backtomenu",
				}
			));
			socket.close(3001);
		}
		navigateTo("/home");
		return;
	});
}

// Depends on winner or loser guide the player to the good display + register the loser in the database
async function nextGameTournament(game) {
	try {
		let loser;
		if (socket.readyState === socket.OPEN) {
			// console.log("close socket");
			socket.send(JSON.stringify(
				{
					action: "backtomenu",
				}
			));
			socket.close(3001);
		}
		if (game.active === "L")
			loser = game.playerRName;
		else
			loser = game.playerLName;
		const requestBody = {
			gameNameSave,
			loser,
		}
		await refreshAccessToken();
		// Register the player in the winners or losers in database
		const response = await fetch("/backend/pong/next_game/", {
			method : "POST",
			headers : {
				"Content-Type" : "application/json",
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body : JSON.stringify(requestBody),
		});
		if (!response.ok)
			throw new Error("Error request /backend/pong/next_game/");
		const responseData = await response.json();
		// WINNER WAY
		if (responseData["game_status"] === "win") {
			container.style.display = 'none';
			document.getElementById('rotating-star').style.display = "flex";
			document.getElementById("tournament-name").style.display = "flex";
			document.getElementById("tournament-name-spinning").style.display = "flex";
			document.getElementById("tournament-name-text").style.display = "flex";
			tournamentNextStep(game, gameName);
		}
		// LOSER WAY
		else {
			tSocket.close()
			setTournament(false);
			await matchIssueDisplay(game, true);
		}
	}
	catch(err) { throw err; }
}

async function joinTournamentSocket(current_user, gameNameSave) {
	console.log("Entering function as " + current_user)
	const host = window.location.host.split(':')[0];
    if (!tSocket || tSocket.readyState !== WebSocket.OPEN) {
        tSocket = new WebSocket("wss://" + host + ":1234/ws/tournament/" + gameNameSave + "/");
    }

    tSocket.addEventListener("open", (event) => {
		// console.log(localStorage.getItem("username") + " connected to the chat_tournament socket")
    });

    // tSocket.addEventListener("close", (event) => {
    //     console.log("close :", event.data);
    // });

    // window.addEventListener("beforeunload", function () {
    //     if (tSocket) {
    //         tSocket.close();
    //     }
    // });
    tSocket.onclose = function(e) {
		// console.log(localStorage.getItem("username") + " left the chat_tournament socket");			 
    };
}

async function displayMessage(message) {
	let timer = 5
	if (document.getElementById("CountDownWindow"))
		document.getElementById("CountDownWindow").style.display = "block";
	if (document.getElementById("CountDownDiv"))
		document.getElementById("CountDownDiv").style.display = "block";
	while (timer > 0) {
		message = "Tournament is about to start in " + timer + " seconds"
		const messageContainer = document.getElementById("messageCountDown");
		messageContainer.textContent = message;
		// console.log(message)

		// Show the message container if it's hidden
		// messageContainer.style.display = "block";
		// messageContainer.offsetHeight;
		// messageContainer.style.transition = "none";

		timer -= 1
		await new Promise(r => setTimeout(r, 1000));
	}
	if (document.getElementById("CountDownWindow"))
		document.getElementById("CountDownWindow").style.display = "none";
	if (document.getElementById("CountDownDiv"))
		document.getElementById("CountDownDiv").style.display = "none";
}

async function alertPlayers() {
    return new Promise((resolve, reject) => {
        tSocket.send(
            JSON.stringify({
                type: "start_countdown",
            })
        );

        const messageListener = async(event) => {
            const data = JSON.parse(event.data);

            if (data.type === "tournament_message") {

                await displayMessage();
                tSocket.removeEventListener("message", messageListener);

                resolve();
            }
        };

        tSocket.addEventListener("message", messageListener);
	})
}

export { waitForAllPlayers, nextGameTournament, joinTournamentSocket, tournamentNextStep, tournamentIssueDisplay, tSocket };
