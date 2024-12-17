import { navigateTo, navigateTo_chat_game} from "./router.js";
import {socket} from "./game.js";
import {deleteGame} from "./game_utils.js";
import { getCookie, refreshAccessToken, showAlert } from "./utils.js";
import {gameUpdateDatabase} from "./game_events.js";

let GameInvit, accept, decline;
let chatSocket, responseData; 
let allChatSockets = {};

export async function verifyCurrentId (roomName) {
    // if (!String(roomName).endsWith('public'))

        // /chat/3_2
        const extract = roomName.split("/").pop(); // 3_2
        const numbers = extract.split("_"); // Output: ['3', '2']
        const num1 = parseInt(numbers[0], 10); // Convert the first part to an integer
        const num2 = parseInt(numbers[1], 10);
        const username = localStorage.getItem("username");
        try {
            let response = await fetch("/backend/chat/currentId/" + username, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();
            console.log("current id user = ", responseData)
            console.log("id1 = ", num1)
            console.log("id2 = ", num2)
            if (responseData.status == 'success' && (responseData.id == num1 || responseData.id == num2))
            {
                console.log("true !")
                return true;
            }
        }
        catch (error) {
            console.log("and error occure :", error);
            return false;
        }
    return false;
}

export async function setRoom (roomName) {

    if (!roomName.endsWith('public'))
    {
        if (await verifyCurrentId(roomName) == false)
        {
            navigateTo("/404notfound");
            return;
        }
    }
    
    const host = window.location.host.split(':')[0];
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        chatSocket = new WebSocket("wss://" + host + ":1234/ws" + roomName + "/");
        allChatSockets[roomName] = chatSocket;
	
    }    
    chatSocket.addEventListener("open", (event) => {
        console.log("websocket open");
    });
    
    chatSocket.addEventListener("message", (event) => {
        console.log("message :" + event.data);
    });
    
    chatSocket.addEventListener("close", (event) => {
        console.log("close :" + event.data);
    });
    
    // window.addEventListener("popstate",  function() {
    //     if (chatSocket) {
    //         chatSocket.close();
    //     }
    // })

    // window.addEventListener("beforeunload", function() {
    //     if (chatSocket) {
    //             chatSocket.close();
    //     }
    // });

    chatSocket.onclose = function(e) {
    };
    
    document.querySelector('#chat-message-input').focus();
    document.querySelector('#chat-message-input').onkeyup = function(e) {
        if (e.keyCode === 13) {  // enter, return
            document.querySelector('#chat-message-submit').click();
        }
    };
    
    document.querySelector('#chat-message-submit').onclick = function(e) {
        const messageInputDom = document.querySelector('#chat-message-input');
        const message = messageInputDom.value;
        if (message.trim() !== "") {
            chatSocket.send(JSON.stringify({
                'type' : "chat_message",
                'message': message
            }));
        }
        messageInputDom.value = '';
    };

    function getUserButtonByUsername(username) {
        const usersDiv = document.querySelector('#users');
        if (usersDiv) {
            const buttonsArray = Array.from(usersDiv.querySelectorAll('.user-button')); // Convert NodeList to Array
            console.log('Array of user buttons:', buttonsArray); // Log the array of buttons
            console.log('Button text contents:', buttonsArray.map(button => button.textContent)); // Log each button's text
            return buttonsArray.find(button => 
                button.textContent === username || 
                button.textContent.includes(` ${username}`)
            );
        }
    }

    chatSocket.onmessage = function(e) {
        
        const data = JSON.parse(e.data);
        const chatLog = document.querySelector('#chat-log');
        // for (let key in data) {
        //     if (data.hasOwnProperty(key)) {
        //         console.log(key + ": " + data[key]);
        //     }
        // }
        console.log("Local = " + localStorage.getItem("username"))
        if (data['type'] === 'game_invit' && data['target'] === localStorage.getItem("username")) {
            displayInvite(data.message, data.room, data.sender);
            // chatSocket.close()
        }
        if (data['type'] === 'decline_invit' && data['target'] === localStorage.getItem("username")) {
            // const text = document.getElementById("message");
            console.log(data)
            showAlert(data['message'], 'basic')
            // text.value = data['message'];
            console.log("delete game : " + data.room);
            if (socket)
                socket.close();
            navigateTo("/chat/" + data['room']);
            // "/chat/" + room, room
            // chatSocket.close()
        }
        if (data['type'] === 'status') {
            if (data['connection'] == 'connected' && data['sender'] != localStorage.getItem("username")) {
                console.log(data['sender'] + " is connected")
                let button = getUserButtonByUsername(data['sender']);
                if (button)
                    button.textContent = "🟦 " + data['sender']
            }
            else if (data['connection'] == 'disconnected') {
                console.log(data['sender'] + " has disconnected")
                let button = getUserButtonByUsername(data['sender']);
                if (button)
                    button.textContent = "⬜ " + data['sender']
            }                
        }

        if (data['type'] === 'chat_message') {
            checkIfBlocked(data.senderUsername).then(function(status) {
                if (status === 'ok') {
                    const message = data.senderUsername + ': ' + data.message + '\n';
					if (chatLog)
					{
						chatLog.innerText += message;
						chatLog.scrollTop = chatLog.scrollHeight;
					}
            }
            
        }).catch(function(error) {
            console.error("Error checking block status:", error);
        });
        }
    }
};

async function getStatusIcone(username_target) {
    try {
        let response = await fetch("/backend/chat/statusIcone/" + username_target, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const responseData = await response.text();
        if (responseData === 'online')
            return '🟦';
        if (responseData === 'offline')
            return '⬜';
        if (responseData === 'busy')
            return '🟧'
    }
    catch (error) {
        console.log("and error occure :", error);
    }
}

export async function displayUsersHistory(pathname) {
    const chatLog = document.querySelector('#chat-log');
    const room_name = pathname.split("/").pop();
	await refreshAccessToken();
    try {
        let response = await fetch("/backend/chat/users/" + room_name, {
          method: "GET",    
          headers: {
              "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.users) {
            if (room_name == 'public') {
                // const usersDiv = document.querySelector('#users');
                const usersDiv = document.querySelector('#users');
                usersDiv.innerHTML = '';
                data.users.forEach(async user => {
                    const userButton = document.createElement('button');
                    userButton.textContent = await getStatusIcone(user.username) + " " + user.username;
                    userButton.className = 'user-button';
                    userButton.setAttribute("class", "user-button btn btn-outline-info-custo mb-2 mt-2");
                    userButton.onclick = async function() {
                        await initiatePrivateChat(user.username, "chat_message");
                    };
                    usersDiv.appendChild(userButton);
                })
				const backHomeDiv = document.querySelector('#backHomeAvailableUsers');
				const backHome = document.createElement('button');
				backHome.textContent = '🏡 Home';
				backHome.setAttribute("class", "btn btn-secondary-custo");
			
				backHome.onclick = function() {
					navigateTo("/home");
					return ;
				}
				backHomeDiv.appendChild(backHome);
            } else {
                privateChatDisplay(localStorage.getItem("username_target"));
            }
        }

		// temporaire invit send friend will not be visible
		// if (data.invit_send_friend) {
		// 	console.log("Entering invit_send_friend : ", data.invit_send_friend)
		// 	if (room_name == 'public') {
				
		// 		const sendfriendsDiv = document.querySelector('#send_friends');
		// 		sendfriendsDiv.innerHTML = ''; // Clear previous buttons
		// 		data.invit_send_friend.forEach(sendfriend => {
		// 			// Create a new div for each friend's name
		// 			const sendfriendsName = document.createElement('div');
					
		// 			sendfriendsName.textContent = "Friend invit send to " + sendfriend; // Assuming sendfriend is a string (username)
		// 			sendfriendsName.setAttribute("class", "btn btn-secondary mb-2 mt-2");

		// 			sendfriendsDiv.appendChild(sendfriendsName);
		// 		});
		// 	}
		// }
		if (data.invit_receive_friend) {
			console.log("Entering invit_receive_friend : ", data.invit_receive_friend)
			if (room_name == 'public') {
				const receivefriendsDiv = document.querySelector('#receive_friends');
				receivefriendsDiv.innerHTML = ''; // Clear previous buttons
				data.invit_receive_friend.forEach(receivefriend => {
					// Create a new div for each friend's name
					const receivefriendsName = document.createElement('button');

					receivefriendsName.textContent = "Friend invitation from " + receivefriend; 
					receivefriendsName.setAttribute("class", "btn btn-primary mb-2 mt-2");
                    receivefriendsName.onclick = async function() {
						document.getElementById("FriendInvit").style.display = "flex";
						document.getElementById("FriendInvitDiv").style.display = "flex";
						document.getElementById("invitationFriend").innerText = "Friend invitation from " + receivefriend;
						document.getElementById("acceptFriend").addEventListener("click", async (e) => {
							if (await acceptFriendInvit(receivefriend) === 'ok') {
								document.getElementById("FriendInvit").style.display = "none";
								document.getElementById("FriendInvitDiv").style.display = "none";
								receivefriendsName.remove();
								navigateTo("/chat/public");
								return ;
							}
							document.getElementById("FriendInvit").style.display = "none";
							document.getElementById("FriendInvitDiv").style.display = "none";							
							showAlert("Error accepting friend invitation", "basic");
							navigateTo("/chat/public");
							return ;
						});
						document.getElementById("declineFriend").addEventListener("click", async (e) => {
							document.getElementById("FriendInvit").style.display = "none";
							document.getElementById("FriendInvitDiv").style.display = "none";

							if (await removeUserFriend(receivefriend) === 'removed_as_friend') {
								console.log("Friend removed ----")
								receivefriendsName.remove();
								navigateTo("/chat/public");
								return ;
							}
							console.log("Friend not removed ----")					
							showAlert("Error declining friend invitation", "basic");
							navigateTo("/chat/public");					
							return ;
						
						});
                    };
					receivefriendsDiv.appendChild(receivefriendsName);
				});
			}
		}
		if (data.friends) {
			if (room_name == 'public') {
				const friendsDiv = document.querySelector('#friends');
				friendsDiv.innerHTML = ''; 
				data.friends.forEach(async friend => {
					let picto;
					const friendName = document.createElement('div');
					friendName.textContent = friend;
					await refreshAccessToken();
					let response = await fetch("/backend/chat/getstatusfriend/" + friend, {
						method: "GET",    
						headers: {
							"Content-Type": "application/json",
						},
					});
					if (!response.ok) {
						console.log("Error getting status friend")
					}
					else {
						const data = await response.json();
						const status = data.status;
						//here
						if (status === 'available') {
							picto = "🟢";
						}
						else if (status === 'busy') {
							picto = "🔴";
						}
						else if (status === 'absent') {
							picto = "🟡";
						}
						else
							picto = "⚪";
						friendName.textContent = picto + " " + friend; 				
					}
					
					friendName.setAttribute("class", "btn btn-friend mb-2 mt-2");
					friendName.style.pointerEvents = "none";

					friendsDiv.appendChild(friendName);
				});
			}
		}
        // if (data.messages_history) {
            const messagesHistory = JSON.parse(data.messages_history);
        if (messagesHistory) {
            getHistory(messagesHistory).then(function(chatHistory) {
                chatLog.innerText = chatHistory;
                chatLog.scrollTop = chatLog.scrollHeight;
            }).catch(function(error) {
                console.error("Error retrieving chat history:", error);
            });
        }
        if (room_name != 'public') {
            const invit_history = JSON.parse(data.invit_history);
            if (invit_history) {
                const current_user = localStorage.getItem("username");
                if (await checkStatusInvit(current_user, invit_history) == 'pending')
                    await displayInvite(invit_history[0]['fields']['message'], room_name, invit_history[0]['fields']['sender__username'])
            }
        }
    }
    catch (error) {
        console.error("Error during loading profile:", error);
      }
    }   

async function privateChatDisplay(username) {
    const privateOptions = document.getElementById('privateOptions');
	const privateOptionsRight = document.getElementById('privateOptionsRight');
    const profileOption = document.createElement('button');

	document.getElementById('chat-room-name').style.display = "none";
	document.getElementById('available-users').style.display = "none";
	document.getElementById('friends-users').style.display = "none";
	// username_target = localStorage.getItem("username_target")
	document.getElementById('chat-room-private').innerText = "Private chat with " + username + " 👩‍💻";

    profileOption.textContent = 'Profile';
	profileOption.setAttribute("class", "btn btn-outline-info-custo mb-2 mt-2 mx-2");
    profileOption.onclick = function() {
        console.log(`Viewing profile of ${username}`);
        showProfile(username)
    };
    privateOptions.appendChild(profileOption);
    // document.body.appendChild(profileOption);
    
    const addFriendOption = document.createElement('button');
    if (await checkIfFriend(username) === 'is_friend') {
        addFriendOption.textContent = 'Remove friend';
    }
	else if (await checkIfFriend(username) === 'invit_send') {
		addFriendOption.textContent = 'Friend invitation sent';
	}
	else if (await checkIfFriend(username) === 'invit_receive') {
		addFriendOption.textContent = 'Friend invitation received';
	}
    else if (await checkIfFriend(username) === 'not_friend') {
        addFriendOption.textContent = 'Add as friend';
    }

    addFriendOption.setAttribute("class", "btn btn-outline-info-custo mb-2 mt-2 mx-2");
    addFriendOption.onclick =  async function() {
        if (addFriendOption.textContent == 'Add as friend') {
            await addUserFriend(username);
            addFriendOption.textContent = 'Friend invitation sent';
        }
        else if (addFriendOption.textContent == 'Remove friend') {
            await removeUserFriend(username);
            addFriendOption.textContent = 'Add as friend';
        }
		else if (addFriendOption.textContent == 'Friend invitation sent' || addFriendOption.textContent == 'Friend invitation received') {
			addFriendOption.style.pointerEvents = "none";
		}
    }
    privateOptions.appendChild(addFriendOption);

    const blockOption = document.createElement('button');
    if (await checkIfBlocked(username) === 'ok') {
        blockOption.textContent = 'Block';
    }
    else {
        blockOption.textContent = 'Unblock';
    }

	blockOption.setAttribute("class", "btn btn-outline-info-custo mb-2 mt-2 mx-2");
	blockOption.onclick = async function() {
        if (blockOption.textContent == 'Block') {
            await blockUser(username);
            blockOption.textContent = 'Unblock';
        }
        else {
            await unblockUser(username);
            blockOption.textContent = 'Block';
        }
    };
    privateOptions.appendChild(blockOption);
    // document.body.appendChild(blockOption);
    const inviteOption = document.createElement('button');
    inviteOption.textContent = 'Invite to Play';
	inviteOption.setAttribute("class", "btn btn-outline-info-custo mb-2 mt-2 mx-2");
    inviteOption.onclick = function() {
        console.log(`Inviting ${username} for a game`);
        sendInvite(username);
    };
    privateOptions.appendChild(inviteOption);
    // document.body.appendChild(privateOptions);
    if (privateOptions.style.display = "none")
        privateOptions.style.display = "flex"
	const backPublicChat = document.createElement('button');
	backPublicChat.textContent = 'Public chat';
	backPublicChat.setAttribute("class", "btn btn-outline-grey-custo mb-2 mt-2 mx-2");

	backPublicChat.onclick = function() {
		navigateTo("/chat/public");
		return ;
	}
	privateOptionsRight.appendChild(backPublicChat);

	const backHome = document.createElement('button');
	backHome.textContent = '🏡 Home';
	backHome.setAttribute("class", "btn btn-outline-grey-custo mb-2 mt-2 mx-2");

	backHome.onclick = function() {
		navigateTo("/home");
		return ;
	}
	privateOptionsRight.appendChild(backHome);


    if (privateOptionsRight.style.display = "none")
        privateOptionsRight.style.display = "flex"

}

async function checkStatusInvit(current_user, invit) {
    // console.log("current user = " + current_user)
    // console.log("target = " + invit[0]['fields']['target'])
    if (invit)
    {
        if (invit[0]['fields']['target'] == current_user)
            return invit[0]['fields']['status']
        return "none"
    }
}

async function getHistory(messagesHistory) {
    let chatHistory = "";
    const blocked_users = await getListBlockedUsers();
    for (const message of messagesHistory) {
        let senderUsername = message['fields']['sender__username'];
        try {
            // const status = await checkIfBlocked(/*current_user, */senderUsername);
            // if (!status) {
            // if (status === 'ok') {
                if (!blocked_users || !blocked_users.includes(senderUsername)) {
                    chatHistory += senderUsername + ': ';
                    chatHistory += message['fields']['message'] + '\n';
                }
                else {
                    console.log("Message blocked")
                }
        } catch (error) {
            console.error("Error checking block status:", error);
        }
    }
    return chatHistory;
}

async function sendInvite (username_target) {
    const room = await createRoom(username_target);
    await removePreviousInvit(username_target);
    await chatSocket.send(JSON.stringify({
        'type' : "game_invit",
        'target' : username_target,
        'room' : room,
    }));
    console.log("INVIT SENT ON " + room)
    gameUpdateDatabase(room, "create")
    navigateTo_chat_game("/game", room)
    // await gameTournamentTemplate(responseData)
}

async function sendDeclineMessage (username_target) {
    const room = await createRoom(username_target);
    await removePreviousInvit(username_target);
    await chatSocket.send(JSON.stringify({
        'type' : "decline_invit",
        'target' : username_target,
        'room' : room,
    }));
    await deleteGame(room)
}

async function checkIfExist(gameName) {
    try {
        let response = await fetch("/backend/pong/gameExist/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({gameName})
        });
        const data = await response.json();
        console.log(data);
        if (data['game_exist'] === 'yes') {
            return true;
        }
        return false;
    }
    catch (error) {
        console.log("and error occure :", error);
    }
}


async function displayInvite (invit, room, username_target) {
    console.log("Entering display invite")
    console.log("INVIT = " + invit)
    const current_user = localStorage.getItem("username");
    GameInvit = document.getElementById("GameInvit");
	// GameInvitDiv = document.getElementById("GameInvitDiv");
    accept = document.getElementById("accept");
    decline = document.getElementById("decline");
    // text = document.getElementById("invitation");
    // text.value = invit;

	const invitation = document.getElementById("invitation");
    if (!invitation)
    {
        // await removePreviousInvit(current_user);
        // return;
    }
    invitation.innerText = invit
    GameInvit.style.display = "flex";
        accept.addEventListener("click", async (e) => {
            console.log(current_user + "has accepted to join the game");
            await removePreviousInvit(current_user);
            if (await checkIfExist(room))
            {
                console.log("Navigating to game");
                await navigateTo_chat_game("/game", room);
                
            }
            else {
                console.log("Navigating home");
                chatSocket.close();
                navigateTo("/home");
            }
        });
        decline.addEventListener("click", async (e) => {
            console.log(current_user + " has declined to join the game")
            await removePreviousInvit(current_user)
            console.log("Sending decline message to " + username_target)
            await sendDeclineMessage(username_target)
            await navigateTo("/chat/" + room, room);
        });
}

async function createRoom(username_target) {
    const username_user = localStorage.getItem("username")
    localStorage.setItem("username_target", username_target)
	await refreshAccessToken();
    try {
        await fetch('/backend/chat/' + username_target + "_" + username_user, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
        .then(response => response.text())
        .then(async data => {
            responseData = data;
        })
    }
    catch (error) {
        console.log("and error occure :", error);
    }
    return responseData
}

async function initiatePrivateChat(username_target) {
    const room = await createRoom(username_target);
    window.location.href = `/chat/${room}`;
}

async function  removePreviousInvit(target) {
	await refreshAccessToken();
    try {
        let response = await fetch("/backend/chat/status/invit/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
				'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({target})
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data.message);

    }
    catch (error) {
        console.error("Error blocking user:", error);
    }
}

async function showProfile(username_profile) {
	await refreshAccessToken();
    try {
        let response = await fetch("/backend/chat/profile/" + username_profile, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);

        const imagePath = data.image;
        const username = data.username;
        const pseudo = data.pseudo;
        const status = data.status;
        const bio = data.bio;
        const games_count = data.games_count;
        const victories_count = data.victories_count;
        // const email = data.email;
        // await navigateTo("/profile");
        
        const imageElement = document.getElementById('image');// maybe delete / at the begining
        imageElement.src = imagePath;
        imageElement.alt = "Profile Picture";

        document.getElementById('usernameOther').innerText = username;
        document.getElementById('pseudoOther').innerText = pseudo;
        document.getElementById('statusOther').innerText = status;
        document.getElementById('bioOther').innerText = bio;
        document.getElementById('games_countOther').innerText = games_count;
        document.getElementById('victories_countOther').innerText = victories_count;
        
        document.getElementById('profileUser').style.display = "flex";
        document.getElementById('profileUserDiv').style.display = "flex";
        // document.getElementById('email').innerText = email;

        document.getElementById('closeProfileButton').addEventListener("click", (e) => {
            document.getElementById('profileUser').style.display = "none";
            document.getElementById('profileUserDiv').style.display = "none";
        });

    }
        catch (error) {
        console.error("Error during loading profile:", error);
      }
}

async function blockUser(username) {
	await refreshAccessToken();
    try {
        let response = await fetch("/backend/chat/block/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
			'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({username})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
    }
        catch (error) {
        console.error("Error blocking user:", error);
      }
      return 'blocked'
}


async function  checkIfBlocked(username) {
	await refreshAccessToken();
    try {
        console.log("Checking if " + username + " is blocked")
        let response = await fetch("/backend/chat/check/" + username, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        if (data.status === 'blocked') {
            return ('blocked')
        }
        return ('ok')
    }
    catch (error) {
        console.error("Error blocking user:", error);
    }
}

async function  getListBlockedUsers() {
	await refreshAccessToken();
    try {
        let response = await fetch("/backend/chat/list/", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        if (data.users_blocked)
            return data.users_blocked;
    }
    catch (error) {
        console.error("Error blocking user:", error);
    }
    return 0
}

async function unblockUser(username) {
    try {
		await refreshAccessToken();
        let response = await fetch("/backend/chat/unblock/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
			'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({username})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
    }
        catch (error) {
        console.error("Error blocking user:", error);
      }
      return 'ok'
}

// function formatMessage(message) {
    //     // Escape HTML characters
    //     const escapedMessage = message
    //         .replace(/&/g, "&amp;")
    //         .replace(/</g, "&lt;")
    //         .replace(/>/g, "&gt;")
    //         .replace(/"/g, "&quot;")
    //         .replace(/'/g, "&#039;");
    
    //     // Regex to detect URLs
    //     const urlRegex = /https?:\/\/[^\s]+/g;
    
    //     // Replace URLs with clickable links (escape URLs to ensure safety)
    //     return escapedMessage.replace(urlRegex, (url) => {
        //         const escapedUrl = url
        //             .replace(/&/g, "&amp;")
        //             .replace(/</g, "&lt;")
//             .replace(/>/g, "&gt;")
//             .replace(/"/g, "&quot;")
//             .replace(/'/g, "&#039;");
//         return `<a href="${escapedUrl}" target="_blank">${escapedUrl}</a>`;
//     });
// }

async function addUserFriend(username) {
    await refreshAccessToken();
    console.log("Sending friend invit " + username + " as friend")
    try {
        const response = await fetch("/backend/chat/sendinvitfriend/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({username})
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
		if (data.message === 'Invitation already sent') {
			showAlert("Invitation already sent", "basic");
		}
		console.log(data);
    }
    catch (error) {
        console.error("Error sending invit friend user:", error);
    }
}

async function acceptFriendInvit(username) {
	await refreshAccessToken();
	console.log("Accepting " + username + " as friend");
	try {
		const response = await fetch("/backend/chat/acceptinvitfriend/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify({username})
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log(data);
	}
	catch (error) {
		console.error("Error accepting invit friend user:", error);
		return "error";
	}
	return "ok";
}

async function removeUserFriend(username) {
    await refreshAccessToken();
    console.log("Removing " + username + " as friend")
    try {
        let response = await fetch("/backend/chat/removefriend/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({username})
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.error("Error removing friend user:", error);
		return 'error';
    }
    return 'removed_as_friend'
}

async function checkIfFriend(username) {
	await refreshAccessToken();
	try {
		let response = await fetch("/backend/chat/checkfriend/" + username, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log(data);
		if (data.status === 'is_friend') {
			console.log("xxx is friend xxx")
			return ('is_friend')
		}
		else if (data.status === 'invit_send') {
			console.log("xxx invit send xxx")
			return ('invit_send')
		}
		else if (data.status === 'invit_received') {
			console.log("xxx invit receive xxx")
			return ('invit_receive')
		}
		return ('not_friend')
	}
	catch (error) {
		console.error("Error checking if friend:", error);
	}
}

export {chatSocket}