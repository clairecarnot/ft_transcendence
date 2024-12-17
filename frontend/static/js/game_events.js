"use strict"

import { navigateTo } from "./router.js";
import { socket, gameName, createGamePage, createGameButton, joinGameButton, setup5Tournament, setTournament, remove_player } from "./game.js"
import { waitForAllPlayers, joinTournamentSocket, tournamentNextStep, tournamentIssueDisplay } from "./tournament_utils.js"
import { showAlert, refreshAccessToken, getCookie } from "./utils.js"

let roomName, gameNameSave;

// Update database : Create the game (action = create) and update the players username
// If a player is already playing in a game or waiting for a second one to join, block the connexion to another game
// If the game name is already taken block the creation of the game
async function gameUpdateDatabase(gameName, action, tournament) {
	try {
		// console.log(gameName)
		let url;
		const requestBody = {
			gameName,
			action,
		}
		if (tournament) {
			if (action === "create")
				url = "/backend/pong/register_tournament/";
			else
				url = "/backend/pong/join_tournament/";
		}
		else if (action === "create" || action === "local")
			url = "/backend/pong/register_game/";
		else
			url = "/backend/pong/join_game/";
		await refreshAccessToken();
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify(requestBody),
		});
		if (!response.ok)
			throw new Error("Error request " + url);
		const responseData = await response.json();
		// console.log("responseData[\"game_status\"] = " + responseData["game_status"] + " responseData[\"room_name\"] = " + responseData["room_name"])
		if (responseData["game_status"] === "created" || responseData["game_status"] === "joined") {
			return true;
		}
		if (responseData["game_status"] === "exist")
			showAlert("Game already exists. Please choose another name <3", "basic")
		else if (responseData["game_status"] === "playing")
			showAlert("Game already full. Please choose another game <3", "basic")
		else if (responseData["game_status"] === "absent")
			showAlert("Game doesn't exist anymore. Please choose another game <3", "basic")
		else if (responseData["game_status"] === "already-logged")
			showAlert("You cannot be logged twice in the same game <3", "basic")
		// console.log("gameUpdateDatabase return true ");
		return false;
	}
	catch (error) {
		console.error("Error during creation of the game : ", error);
		return (navigateTo("/home"));
	}
}

// Click on createGameButton, if the game name doesn't exist, create it and stock it in the database and launch 
async function createGameEvent(e) {
	console.log("createGameButton")
	if (e)
		e.preventDefault();
	let exists = await gameUpdateDatabase(gameName.value, "create");
	if (exists) {
		createGamePage(gameName, true, false);
	}
}

async function joinGameEvent(e) {
	console.log("joinGameButton")
	joinGameButton.style.display = "none";
	createGameButton.style.display = "none";
	gameName.style.display = "none";
	createJoinSetup.style.display = "none"
	setup4.style.display = "flex"
	e.preventDefault();
	await refreshAccessToken();
	const response = await fetch("/backend/pong/getgames/", {
		method : "GET",
	});
	// console.log(response)
	const responseData = await response.json();
	responseData.forEach(element => {
		const button = document.createElement("button");
		button.setAttribute("id", "party-button");
		button.setAttribute("type", "button");
		button.setAttribute("class", "btn btn-outline-info-custo");
		button.innerText = element.name;
		button.onclick = async function(i) {
			if (await gameUpdateDatabase(element.name, "join")) {
				const elem = document.querySelectorAll("[id=party-button]");
				elem.forEach(element => {
					element.style.display = "none";
				});
				gameName.value = element.name;
				gameName.innerText = element.name;
				createGamePage(gameName, true, false);
			}
		};
		setup4.appendChild(button);
	});
}

// When a player create a tournament
async function createTournamentEvent(e) {
	try {
		console.log("createTournamentButton")
		if (e)
			e.preventDefault();
		gameName.value = "Tournament_" + gameName.value;
		let exists = await gameUpdateDatabase(gameName.value, "create", true);
		if (exists) {
			gameNameSave = gameName.value;
			await joinTournamentSocket(localStorage.getItem("username"), gameNameSave);
			// console.log(gameNameSave);
			setTournament(true);
			createJoinSetup.style.display = "none";
			setup5Tournament.style.display = "flex";
			document.getElementById("tournament-name-text").style.display = "flex";
			document.getElementById("tournament-name").innerText = gameNameSave;
			document.getElementById("tournament-name").style.display = "flex";
			document.getElementById("tournament-name-spinning").style.display = "flex";
			await waitForAllPlayers();
			// appel first room pour recup gameNameroom
			const requestBody = {
				gameNameSave,
			};
			const response = await fetch("/backend/pong/first_room/", {
				method : "POST",
				headers : {
					"Content-Type" : "application/json",
				},
				body : JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error("Fetch failed with status: " + response.status);
			}	

			const responseData = await response.json();
			if (responseData["next"] === "yes") {
				gameName.value = responseData["room_name"]
				// console.log("roomName" + gameName.value);
				await createGamePage(gameName, true, true);
			}
			else if (responseData["next"] === "no") {
				let game = {"active" : "L"};
				container.style.display = 'none';
				document.getElementById('rotating-star').style.display = "flex";
				document.getElementById("tournament-name").style.display = "flex";
				document.getElementById("tournament-name-spinning").style.display = "flex";
				document.getElementById("tournament-name-text").style.display = "flex";
				// console.log("go");
				tournamentNextStep(game, gameName);
			}
			else {
				let game = {"active" : "L"};
				tournamentIssueDisplay(game);
			}
		}
	}
	catch(err) {
		console.log(err);
		if (socket)
			socket.close();
		await remove_player();
		return (navigateTo("/home"));
	}
}

// When a player click on join a Tournament Button
async function joinTournamentEvent(e) {
	try {
		console.log("joinTournamentButton")
		joinGameButton.style.display = "none"
		createGameButton.style.display = "none"

		createJoinSetup.style.display = "none";
		setup4.style.display = "flex";		

		gameName.style.display = "none"
		e.preventDefault();
		await refreshAccessToken();
		const response = await fetch("/backend/pong/get_tournaments/", {
			method : "GET",
		});
		const responseData = await response.json();
		responseData.forEach(element => {
			const button = document.createElement("button");
			button.setAttribute("id", "party-button");
			button.setAttribute("type", "button");
			button.setAttribute("class", "btn btn-outline-info-custo");
			button.innerText = element.name;
			// When a player join a tournament
			button.onclick = async function() {
				try {
					if (await gameUpdateDatabase(element.name, "join", true)) {
						await joinTournamentSocket(localStorage.getItem("username"), element.name);
						const elem = document.querySelectorAll("[id=party-button]");
						elem.forEach(element => {
							element.style.display = "none";
						});
						gameNameSave = element.name;
						setTournament(true);
						gameName.innerText = element.name;
						createJoinSetup.style.display = "none";
						setup5Tournament.style.display = "flex";
						document.getElementById("tournament-name-text").style.display = "flex";
						document.getElementById("tournament-name").innerText = gameNameSave;
						document.getElementById("tournament-name").style.display = "flex";
						document.getElementById("tournament-name-spinning").style.display = "flex";
						await waitForAllPlayers();
						// appel first room pour recup gameNameroom
						const requestBody = {
							gameNameSave,
						};
						const response = await fetch("/backend/pong/first_room/", {
							method : "POST",
							headers : {
								"Content-Type" : "application/json",
							},
							body : JSON.stringify(requestBody),
						});

						if (!response.ok) {
							const text = await response.text();
							throw new Error("Fetch failed with status: " + response.status);
						}						

						const responseData = await response.json();
						if (responseData["next"] === "yes") {
							gameName.value = responseData["room_name"]
							// console.log("roomName" + gameName.value);
							await createGamePage(gameName, true, true);
						}
						else if (responseData["next"] === "no") {
							let game = {"active" : "L"};
							container.style.display = 'none';
							document.getElementById('rotating-star').style.display = "flex";
							document.getElementById("tournament-name").style.display = "flex";
							document.getElementById("tournament-name-spinning").style.display = "flex";
							document.getElementById("tournament-name-text").style.display = "flex";
							// console.log("go");
							tournamentNextStep(game, gameName);
						}
						else {
							let game = {"active" : "L", "playerLPseudo" : localStorage.getItem("username")};
							tournamentIssueDisplay(game);
						}
					}
				}
				catch(err) {
					console.log(err);
					if (socket)
						socket.close();
					await remove_player();
					return (navigateTo("/home"));
				}
			};
			setup4.appendChild(button);
		});
	}
	catch(err) {
		console.log(err);
		if (socket)
			socket.close();
		await remove_player();
		return (navigateTo("/home"));
	}
}

async function localGameEvent(e) {
	e.preventDefault();
	console.log("localGameButton");
	gameName.value = "local_pong" + localStorage.getItem("username");
	// console.log("game.value = ", gameName.value);
	let exists = await gameUpdateDatabase(gameName.value, "local");
	if (exists) {
		localRemoteSetup.style.display = "none";
		createGamePage(gameName, false, false);
	}
}

export { createGameEvent, joinGameEvent, localGameEvent, createTournamentEvent, joinTournamentEvent, gameUpdateDatabase, gameNameSave};
