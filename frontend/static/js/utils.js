import { navigateTo, navigateToUserPage } from "./router.js";
import { userIsAuthenticated } from "./auth.js";

let toast;

// Show toast programmatically
function showAlert(message, type) {
	if (type == 'fail') {
		const toastElement = document.getElementById('failToast');
		document.querySelector('#failToast .toast-body').textContent = message; // Set custom message
		toast = new bootstrap.Toast(toastElement);
		toast.show();
	}
	else if (type == 'basic') {
		const toastElement = document.getElementById('basicToast');
		document.querySelector('#basicToast .toast-body').textContent = message; // Set custom message
		toast = new bootstrap.Toast(toastElement);
		toast.show();
	}
}

function hideAlert() {
	toast.hide();
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function refreshAccessToken() {
	// console.log("Checking expiration time of access token");

	const currentTime = new Date();
	if (!localStorage.getItem("exp_time"))
	{
		// console.log("No expiration time found in local storage");
		return ;
	}
	const expTime = new Date(localStorage.getItem("exp_time"));
	if (expTime < currentTime)
	{
		// console.log("expTime < currentTime -> Refreshing access token");
		const response = await fetch('/backend/authent/refreshToken/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'),
			}
		});
		const result = await response.json();
		if (response.status === 400)
		{
			
			// alert("User has to logged in again");
			console.log("Error refreshAccessToken in CustomTokenRefreshView : ", result);
			showAlert("Please login again", 'basic');
			navigateTo("/login");
			return ;
		}
		else (response.status === 200)
		{
			
			// alert("User has to logged in again");
			// console.log("Result refreshAccessToken in CustomTokenRefreshView : ", result);
			// navigateTo("/login");
			return ;
		}

	}
	// console.log("not need to refresh access token yet");
}

async function hLinks() {

	// user is not connected
	// const hLink = document.getElementById('hLink');
	// hLink.addEventListener('click', async function() {
	// 	navigateTo("/");
	// });
	const loginLink = document.getElementById('loginLink');
	loginLink.addEventListener('click', async function() {
		await navigateTo("/login");
	});
	const registerLink = document.getElementById('registerLink');
	registerLink.addEventListener('click', async function() {
		await navigateTo("/register");
	});


	// user is connected
	// const homeLink = document.getElementById('homeLink');
	// homeLink.addEventListener('click', async function() {
	// 	navigateTo("/home");
	// });
	// const gameLink = document.getElementById('gameLink');
	// gameLink.addEventListener('click', async function() {
	// 	navigateTo("/game");
	// });
	// const profileLink = document.getElementById('profileLink');
	// profileLink.addEventListener('click', async function() {
	// 	navigateTo("/profile");
	// });
	// const chatLink = document.getElementById('chatLink');
	// chatLink.addEventListener('click', async function() {
	// 	navigateTo("/chat/public");
	// });	
}


async function loginLinks () {
	const registerLink = document.getElementById('registerLink2');
	registerLink.addEventListener("click", async function() {
		await navigateTo("/register");
		return ;
	});
}

async function registerLinks() { 
	const loginLink = document.getElementById('loginLink2');
	loginLink.addEventListener("click", async function() {
		await navigateTo("/login");
		return ;
	});
}

async function profileLinks() {
	console.log("----> utils profile links");
	const editProfile = document.getElementById('editProfileLink');
	editProfile.addEventListener('click', async function() {
		await navigateTo("/editprofile");
	});
}

async function homeLinkProfile() {
	const homeLinkProfile = document.getElementById('homeLinkProfile');
	homeLinkProfile.addEventListener('click', async function() {
		await navigateTo("/home");
	});
}

async function navbarToLink() {
	const homeLink = document.getElementById('homeLink');
	homeLink.addEventListener('click', async function() {
		await navigateTo("/home");
	});
	const gameLink = document.getElementById('gameLink');
	gameLink.addEventListener('click', async function() {
		await navigateTo("/game");
	});
	const profileLink = document.getElementById('profileLink');
	profileLink.addEventListener('click', async function() {
		await navigateTo("/profile");
	});
	const chatLink = document.getElementById('chatLink');
	chatLink.addEventListener('click', async function() {
		await navigateTo("/chat/public");
	});
	const statsLink = document.getElementById('statsLink');
	statsLink.addEventListener('click', async function() {
		await navigateTo("/stats");
	});
}

async function goBackHome() {
	const backButton = document.getElementById('homeButton');
	backButton.addEventListener("click", async function() {
		if (await userIsAuthenticated()) {
			await refreshAccessToken();
			await navigateTo("/home");
			return ;
		}
		else {
			await navigateTo("/");
			return ;
		}
		// await navigateTo("/");
		// return ;
	})
}

export { showAlert, hideAlert, refreshAccessToken, getCookie, goBackHome, navbarToLink, hLinks, loginLinks, registerLinks, profileLinks, homeLinkProfile };