import { getCookie, refreshAccessToken } from './utils.js';

// utilisation variables limitee aux fonctions => a mettre dans tous les js => Verifier quand meme ce que ca veut dire ( ca vient d Elliot mdrrrr)
"use strict"

// #FF6384 yellow
// #36A2EB blue
// #FFCE56 yellow

let noStats, myStats, globalStats, history, totalGames, topUsers, playersActivity, topThree,
    victoryPercent, globOrPers, koVic, koDef, histVal, updateHist, totalVic, totalDef, actiDistrib,
	totTournaments, tournWon, tournLost, topUsersTourn, tournVicPercent, rankUser;
const charts = []

async function initVariables() {
    noStats = document.getElementById("no-stats");
    history = document.getElementById("history-body");
    totalGames = document.getElementById("total-games");
    totalVic = document.getElementById("total-vic");
    totalDef = document.getElementById("total-def");
    topUsers = document.getElementById("topusers-body");
    playersActivity = document.getElementById('playersActivity');
    actiDistrib = document.getElementById('acti-distrib');
    topThree = document.getElementById('topThree');
    myStats = document.getElementById('mystats');
    globalStats = document.getElementById('globalstats');
    victoryPercent = document.getElementById('victory-percent');
    globOrPers = document.getElementById('glob-or-pers');
    koVic = document.getElementById('ko-vic');
    koDef = document.getElementById('ko-def');
    histVal = document.getElementById('hist-dropdown');
    updateHist = document.getElementById('update-hist');
    totTournaments = document.getElementById('total-tournaments');
    tournWon = document.getElementById('total-vic-tourn');
    tournLost = document.getElementById('total-def-tourn');
    topUsersTourn = document.getElementById("toptournusers-body");
    tournVicPercent = document.getElementById("tourn-vic-percent");
    rankUser = document.getElementById("rank");
}

async function destroyAllCharts() {
    charts.forEach(chart => chart.destroy());
    charts.length = 0;
}

async function createPieChart(data, ctx, piename, type) {
    const existingChart = Chart.getChart(ctx);
    if (existingChart)
        existingChart.destroy();

        const newChart = new Chart(ctx, {
        type: type,
        // type: 'pie',
        // type: 'doughnut',
        data: {
            labels: data.labels, // ["A", "B"]
            datasets: [{
                data: data.values, // [10, 14]
                // backgroundColor: ['#FF6384', '#36A2EB'],
                // backgroundColor: ['rgb(137, 207, 191)', 'rgb(140, 187, 206)', 'rgb(144, 156, 209)']
            }],
        },
        options: {
            reponsive: true,
            maintainAspectRatio: false, // Allows height/width styling
            plugins: {
                title: {
                    display : true,
                    text: piename,
                    font: {
                        size: 16,
                    },
                    padding: {
                        top: 10,
                        bottom: 10,
                    }
                },
            }
            // hoverOffset: 60,
        }
    });
    charts.push(newChart);
}

async function createMixedChart(data, ctx, chartname) {
    const existingChart = Chart.getChart(ctx);
    if (existingChart)
        existingChart.destroy();
        const newChart = new Chart(ctx, {
            data: {
                datasets: [{
                    type: 'bar',
                    label: 'Times played',
                    data: data.games,
                }, {
                    type: 'line',
                    label: 'Victories',
                    data: data.victories,
                }],
                labels: data.labels,
            },
            options: {
                reponsive: true,
                maintainAspectRatio: false, // Allows height/width styling
                plugins: {
                    title: {
                        display : true,
                        text: chartname,
                        font: {
                            size: 16,
                        },
                        padding: {
                            top: 10,
                            bottom: 10,
                        }
                    },
                }
            }
    });
    charts.push(newChart);
}

async function createScatteredChart(data, ctx, chartname) {
    const existingChart = Chart.getChart(ctx);
    if (existingChart)
        existingChart.destroy();
        const newChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: "Players' distribution",
                      data: data.values, // [10, 14]
                // labels: data.labels,
                }],
            },
            options: {
                scales: {
                    x: {
                        type: 'linear',
                    //   position: 'bottom',
                        title: {
                            display: true,
                            text: 'Times played',
                        },
                        // ticks: {
                        //     stepSize: 1,
                        // },
                        suggestedMin: 0,
                        suggestedMax: 10,
                    },
                    y: {
                        type: 'linear',
                        // position: 'bottom',
                        title: {
                            display: true,
                            text: 'Victories count',
                        },
                        // ticks: {
                        //     stepSize: 1,
                        // },
                        suggestedMin: 0,
                        suggestedMax: 10,
                    },
                },
                // tooltip: {
                //     callbacks: {
                //         label: function(context) {
                //             const point = context.raw; // Access the raw data point
                //             return `(${point.x}, ${point.y}): ${point.label}`;
                //         }
                //     }
                // },
                reponsive: true,
                maintainAspectRatio: false, // Allows height/width styling
                plugins: {
                    title: {
                        display : true,
                        text: chartname,
                        font: {
                            size: 16,
                        },
                        padding: {
                            top: 10,
                            bottom: 10,
                        }
                    },
                }
            }
    });
    charts.push(newChart);
}

function formatDate(dateString) {
    const date = new Date(dateString);

    // Extract time components
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Extract date components
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();

    // Return formatted string
    return `${day}-${month}-${year}  ${hours}h${minutes}`;
}

async function displayGlobalStats() {
	try {
		globOrPers.innerText = "Global stats";
		await refreshAccessToken();
		const response = await fetch('/backend/stats/', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			},
		});

		if (!response.ok) {
			console.log("Error during stats loading: ", response.status);
			return;
		}

		const data = await response.json();
		// console.log("STATS ===>");
		// console.log(data);
		if (data.history.length === 0) {
			noStats.innerText = "No records yet.";
			document.querySelectorAll('.stats').forEach(element => {
				element.classList.add('hidden');
			});
			return;
		}
		else {
			document.querySelectorAll('.hidden').forEach(element => {
				element.classList.remove('hidden');
			});
			document.querySelectorAll('.perso').forEach(element => {
				element.classList.add('hidden');
			});

			const dataHistory = data.history;
			dataHistory.forEach(game => {
				const usernames = game.users.map(user => user.username).join(", ");	
				const date_formated = formatDate(game.date_created);		
				const HTMLString = `
				<tr class="inputdata">
				<td class="inputdata">${game.game_id}</td>
				<td class="inputdata">${date_formated}</td>
				<td class="inputdata">${usernames}</td>
				<td class="inputdata">${game.winner_name}</td>
				<td class="inputdata">${game.winner_score}-${game.loser_score}</td>
				</tr class="inputdata">`;
				history.insertAdjacentHTML('beforeend', HTMLString);
			});

			totalGames.insertAdjacentText('beforeend', data.games_count);
			totTournaments.insertAdjacentText('beforeend', data.tournaments_count);

			const actiDistribChartData = {
				// labels: [],
				values: []
			};
			const dataTopUsers = data.top_users;
			let rank = 1;
			dataTopUsers.forEach(user => {
				const HTMLString = `
				<tr class="inputdata">
				<td class="inputdata">${rank}</td>
				<td class="inputdata">${user.username}</td>
				<td class="inputdata">${user.victories_count}</td>
				</tr class="inputdata">
				`;
				topUsers.insertAdjacentHTML('beforeend', HTMLString);
				rank++;

				// const dataDistrib = {x: user.victories_count, y: user.games_count};
				const dataDistrib = {x: user.games_count, y: user.victories_count};
				// const dataDistrib = {x: user.games_count, y: user.victories_count, label: user.username};
				actiDistribChartData.values.push(dataDistrib);
			});

			if (data.tournaments_count != 0) {
				const dataTopUsersTourn = data.top_users_tourn.slice(0, 3);
				rank = 1;
				dataTopUsersTourn.forEach(user => {
					const HTMLString = `
					<tr class="inputdata">
					<td class="inputdata">${rank}</td>
					<td class="inputdata">${user.username}</td>
					<td class="inputdata">${user.won_tournaments_count}</td>
					</tr class="inputdata">
					`;
					topUsersTourn.insertAdjacentHTML('beforeend', HTMLString);
					rank++;
				});
			}
			else {
				// topTournVisibility.classList.add('hidden');
				document.querySelectorAll('.notourn').forEach(element => {
					element.classList.add('hidden');
				});
			}

			const activePlayersPieData = {
				labels: ["Active users", "Inactive users"],
				values: [data.active_users_count, data.inactive_users_count]
			};
			createPieChart(activePlayersPieData, playersActivity.getContext('2d'), "Players' activity", "pie");

			const topThreeChartData = {
				labels: [data.top_users[0].username, data.top_users[1].username],
				games: [data.top_users[0].games_count, data.top_users[1].games_count],
				victories: [data.top_users[0].victories_count, data.top_users[1].victories_count]
				// labels: [data.top_users[0].username, data.top_users[1].username, data.top_users[2].username],
				// games: [data.top_users[0].games_count, data.top_users[1].games_count, data.top_users[2].games_count],
				// victories: [data.top_users[0].victories_count, data.top_users[1].victories_count, data.top_users[2].victories_count]
			};
			if (data.top_users[2]) {
				topThreeChartData.labels.push(data.top_users[2].username);
				topThreeChartData.games.push(data.top_users[2].games_count);
				topThreeChartData.victories.push(data.top_users[2].victories_count);
			}
			createMixedChart(topThreeChartData, topThree, "Top 3 players");

			createScatteredChart(actiDistribChartData, actiDistrib, "Victories x Times played");
		}
	}
	catch(err) {
		console.log("Error while displaying global stats : " + err);
	}
}

function getOrdinalSuffix(rank) {
    if (rank % 100 >= 11 && rank % 100 <= 13) {
        return 'th';
    }
    switch (rank % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

async function displayPersonalStats() {
	try {
		globOrPers.innerText = "Personnal stats of";
		globOrPers.setAttribute('class', ' fw-bold text-info');
		const hist_val = histVal.value;
		const requestBody = {
			hist_val,
		};
		await refreshAccessToken();
		const response = await fetch('/backend/stats/perso/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify(requestBody),
		});
		if (!response.ok) {
			console.log("Error during stats loading: ", response.status);
			return;
		}

		const data = await response.json();
		// console.log("STATS ===>");
		// console.log(data);
		globOrPers.insertAdjacentText('beforeend', ` ${data.own_username}`);
		if (data.history.length === 0) {
			noStats.innerText = "No records yet.";
			document.querySelectorAll('.stats').forEach(element => {
				element.classList.add('hidden');
			});
			histVal.classList.remove('hidden');
			updateHist.classList.remove('hidden');
			return;
		}
		else {
			document.querySelectorAll('.hidden').forEach(element => {
				element.classList.remove('hidden');
			});
			document.querySelectorAll('.global').forEach(element => {
				element.classList.add('hidden');
			});

			if (data.user_rank != -1) {
				// console.log("data.user_rank = " + data.user_rank);
				// console.log("data.users_count = " + data.users_count)
				const HTMLString = `${data.user_rank}${getOrdinalSuffix(data.user_rank)} out of ${data.users_count} users`;
				// console.log(HTMLString);
				// rankUser.innerHTML = HTMLString;
				rankUser.insertAdjacentHTML('beforeend', HTMLString);
			}
			else {
				rankUser.classList.add('hidden');
			}
			const dataHistory = data.history;
			dataHistory.forEach(game => {
				const usernames = game.users.map(user => user.username).join(", ");	
				const date_formated = formatDate(game.date_created);		
				const HTMLString = `
				<tr class="inputdata">
				<td class="inputdata">${game.game_id}</td>
				<td class="inputdata">${date_formated}</td>
				<td class="inputdata">${usernames}</td>
				<td class="inputdata">${game.winner_name}</td>
				<td class="inputdata">${game.winner_score}-${game.loser_score}</td>
				</tr class="inputdata">`;
				history.insertAdjacentHTML('beforeend', HTMLString);
			});

			totalGames.insertAdjacentText('beforeend', data.games_count);
			totalVic.insertAdjacentText('beforeend', data.own_victories);
			totalDef.insertAdjacentText('beforeend', data.games_count - data.own_victories);
			totTournaments.insertAdjacentText('beforeend', data.tournaments_count);
			tournWon.insertAdjacentText('beforeend', data.own_won_tournaments);
			tournLost.insertAdjacentText('beforeend', data.tournaments_count - data.own_won_tournaments);

			const victoryPercentPieData = {
				labels: ["Victories", "Defeats"],
				values: [data.own_victories, data.games_count - data.own_victories]
			};
			createPieChart(victoryPercentPieData, victoryPercent.getContext('2d'), "% Victories / Defeats", "pie");

			if (data.tournaments_count != 0) {
				const tournVicPercentPieData = {
					labels: ["Victories", "Defeats"],
					values: [data.own_won_tournaments, data.tournaments_count - data.own_won_tournaments]
				}
				createPieChart(tournVicPercentPieData, tournVicPercent.getContext('2d'), "% Victories / Defeats", "pie");
			}
			else {
				tournVicPercent.classList.add('hidden');
				document.querySelectorAll('.notourn').forEach(element => {
					element.classList.add('hidden');
				});
			}

			if (data.own_victories != 0) {
				const KOVicDoughnutData = {
					labels: ["KOs", "Tighter scores"],
					values: [data.kos_won, data.own_victories - data.kos_won]
				};
				createPieChart(KOVicDoughnutData, koVic.getContext('2d'), "% Victories per KO", "doughnut");
			}
			else {
				koVic.classList.add('hidden');
			}

			// console.log("data.own_victories = " + data.own_victories);
			// console.log("data.games_count = " + data.games_count);
			if (data.own_victories != data.games_count) {
				const KODefDoughnutData = {
					labels: ["KOs", "Tighter scores"],
					values: [data.kos_lost, data.games_count - data.own_victories - data.kos_lost]
				};
				createPieChart(KODefDoughnutData, koDef.getContext('2d'), "% Defeats per KO", "doughnut");
			}
			else {
				koDef.classList.add('hidden');
			}
		}
	}
	catch(err) {
		console.log("Error while displaying personal stats : " + err);
	}
}

async function clearAllstats() {
    destroyAllCharts();
    const inputData = Array.from(document.querySelectorAll('.inputdata'));
    for (const input of inputData)
        input.innerHTML = '';
    totalGames.innerText = 'Total games played ever: ';
    totalVic.innerText = 'Total victories : ';
    totalDef.innerText = 'Total defeats : ';
    noStats.innerText = '';
    totTournaments.innerText = 'Total tournaments played ever: ';
    tournWon.innerText = 'Total tournaments won : ';
    tournLost.innerText = 'Total tournaments lost : ';
	rankUser.innerText = 'Rank : ';
}

async function displayStats() {
    await document.addEventListener("DOMContentLoaded", initVariables());

    globalStats.addEventListener("click", () => {
        clearAllstats();
		histVal.value = 'all-hist';
        displayGlobalStats();
    });

    myStats.addEventListener("click", () => {
        clearAllstats();
		histVal.value = 'all-hist';
        displayPersonalStats();
    });

    updateHist.addEventListener("click", () => {
        clearAllstats();
        displayPersonalStats();
    });
}

export { displayStats, };