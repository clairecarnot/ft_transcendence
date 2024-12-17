"use strict"

import { getCookie, refreshAccessToken } from "./utils.js";
import { navigateTo } from "./router.js";
import { socket, matchIssue, replay, victory, backMenu, container } from "./game.js"

// Display of the end of a match
async function matchIssueDisplay(game, tournament) {
	if (game.active === "L")
		matchIssue.innerText = `${game.playerLPseudo} won !`;
	else
		matchIssue.innerText = `${game.playerRPseudo} won !`;
	if (tournament)
		replay.style.display = 'none';
	else
		replay.style.display = 'flex';
	victory.style.display = 'flex';
	// button go_back_to_menu listener event
	backMenu.addEventListener("click", (e) => {
		e.preventDefault();
		victory.style.display = "none";
		container.style.display = "none";
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

async function deleteGame(gameNameValue) {
	try {
		// console.log(gameNameValue)
		const requestBody = {
			gameNameValue,
		}
		await refreshAccessToken();
		const response = await fetch("/backend/pong/deletegame/", {
			method : "DELETE",
			headers : {
				"Content-Type" : "application/json",
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body : JSON.stringify(requestBody),
		});
		const responseData = await response.json();
		// console.log("responseData", responseData);
		if (!responseData["game_deleted"]) {
			// console.log("deleteGame false")
			return false;
		}
		// console.log("deleteGame true")
		return true;
	}
	catch (error) {
		console.error("Error during deleted the game", error);
		return false;
	}
}

export { deleteGame, matchIssueDisplay }
