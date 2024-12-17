import { navigateTo, navigateToUserPage } from "./router.js";
import { tSocket } from "./tournament_utils.js";
import { showAlert, refreshAccessToken, getCookie } from "./utils.js"
import {chatSocket} from "./chat.js"

// [TODO] ADD FRONTEND FORM VALIDATION

async function userIsAuthenticated() {
	const responseIsAuth = await fetch('/backend/authent/preAuthenticated/', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCookie('csrftoken'),
		},
	})
	if (!responseIsAuth.ok) {
		console.log("Error while checking if user is authenticated (preAuthenticated function)");
		return false ;
	}
	const result = await responseIsAuth.json();

	console.log("User authenticated: ", result.authenticated);
	if (result.authenticated == false) {
		console.log("User isn't authenticated !");
		// alert("User isn't authenticated !");
		return false;
	}
	console.log("User is authenticated !");
	return true;
}

async function login(username, password) {

	try {
		const response = await fetch('/backend/authent/login/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body: JSON.stringify({username, password})
			}
		)
		const result = await response.json()
		// console.log("Response login: ", result);
		if (response.ok) {
			console.log("user logged in successfully !");
			localStorage.setItem("username", username);
			// console.log("Access token:", getCookie("access_token"));
			// console.log("Refresh token:", getCookie("refresh_token"));

		}
		else if (result.status == 'error while generating token')
		{
			showAlert("login failed (error while generating token), please try again", 'fail');
			// alert("login failed (error while generating token), please try again");
			return ;
		}
		else {
			// console.log("login failed : ", result);
			showAlert("login failed (wrong username or password), please try again", 'fail');
			// alert("login failed (wrong username or password), please try again");
			return ;
		}

	}
	
	catch (error) {
		console.log("and error occure :", error);
	}

	try {
		const response = await fetch('/backend/authent/updateTokenTime/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body: JSON.stringify({username, password})
			}
		)
		const result = await response.json()
	
		if (response.ok) {
			console.log("access time updated successfully !");
			// console.log("exp_time: ", result.exp_time);
			localStorage.setItem("exp_time", result.exp_time);
			const currentTime = new Date();
			const expTime = new Date(localStorage.getItem("exp_time"));
			// console.log("CURRENT TIME : ", currentTime);
			// console.log("EXP TIME : ", expTime);
			navigateTo("/home");
			return ;			
		}
		else {
			console.log("access time updated failed 1 : ", result);
		}
	}
	
	catch (error) {
		console.log("time token updated error occure :", error);
	}
	

}

async function register(username, email, password, password_confirmation) {
	const requestBody = {
        username,
        email,
        password,
        password_confirmation,
      };

    // console.log("Sending registration request with data:", requestBody);

	const response = await fetch("/backend/authent/register/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			'X-CSRFToken': getCookie('csrftoken'),
		},
		body: JSON.stringify(requestBody),
	});

	const responseData = await response.json();
	if (response.ok) {
		console.log("Success: you are registered !");
		// console.log("username: ", username);
		// console.log("password: ", password);		
		await login(username, password);	
	} else if (responseData.error && Array.isArray(responseData.error.non_field_errors)) {
		const message_error = responseData.error.non_field_errors[0];
		
		if (message_error === "Passwords do not match") {
			showAlert("Passwords do not match please try again", 'fail');
			// alert("Passwords do not match please try again");
			return ;
		} else if (message_error == "Password must be at least 9 characters long") {
			showAlert("Password must be at least 9 characters long, please try again", 'fail');
			// alert("Password must be at least 9 characters long, please try again");
			return ;
		} else if (message_error == "Password must contain at least one lowercase letter") {
			showAlert("Password must contain at least one lowercase letter, please try again", 'fail');
			// alert("Password must contain at least one lowercase letter, please try again");
			return ;
		} else if (message_error == "Password must contain at least one uppercase letter") {
			showAlert("Password must contain at least one uppercase letter, please try again", 'fail');
			// alert("Password must contain at least one uppercase letter, please try again");
			return ;
		} else if (message_error =="Password must contain at least one digit") {
			showAlert("Password must contain at least one digit, please try again", 'fail');
			// alert("Password must contain at least one digit, please try again");
			return ;
		} else if (message_error == "Password must contain at least one special character") { 
			showAlert("Password must contain at least one special character, please try again", 'fail');
			// alert("Password must contain at least one special character, please try again");
			return ;
		}
	} else {
		showAlert("Username already exists, please try again", 'fail');
		// alert("Username already exists, please try again");
		return ;
	}
}

async function verifyCode(username) {
	// Display the authentication modal/form
	// document.getElementById('doubleAuthCode').style.display = 'flex';
	// document.getElementById('doubleAuthCodeDiv').style.display = 'flex';

	// return new Promise((resolve, reject) => {
	// 	const codeForm = document.getElementById("code-form");
	// 	if (codeForm) {
	// 		codeForm.addEventListener("submit", async (e) => {
	// 			e.preventDefault(); // Prevent the default form submission behavior
	// 			const code = document.getElementById("code-doubleauth").value;
	// 			// console.log("1  :  ", code);
	// 			if (code) {
	// 				try {

	// 					const responseCode = await fetch('/backend/authent/verifyCode/', {
	// 						method: 'POST',
	// 						headers: {
	// 							'Content-Type': 'application/json',
	// 							'X-CSRFToken': getCookie('csrftoken'),
	// 						},
	// 						body: JSON.stringify({ username, code }) // Ensure 'username' is defined
	// 					});

	// 					const resultCode = await responseCode.json();
	// 					if (resultCode.status === 'success') {
	// 						console.log("Code verified successfully");
	// 						// return true;
	// 						resolve(true); // Resolve the promise with success
	// 					} else {
	// 						console.log("Code verification failed: ", resultCode);
	// 						showAlert("Incorrect code. Please try again.", 'fail');
	// 						// return false;
	// 						resolve(false); // Resolve the promise with failure
	// 					}
	// 				} catch (error) {
	// 					console.error("Error during code verification:", error);
	// 					showAlert("An error occurred. Please try again.", 'fail');
	// 					// return false;
						
	// 					reject(error); // Reject the promise with error
	// 				}
	// 			} else {
	// 				console.log("No code entered");
	// 				showAlert("No code entered. Please try again.", 'basic');
					
	// 				resolve(false); // Resolve the promise with failure
	// 			}
	// 		}, { once: true }); // Ensure the event listener is added only once
	// 	} else {
	// 		showAlert("Code form not found. Please try again.", 'basic');
	// 		reject(new Error("Code form not found"));
	// 	}
	// });
	let code = prompt("Enter your verification code: ");
	if (code) {
		try {
			// Send the code to the backend for verification
			const responseCode = await fetch('/backend/authent/verifyCode/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify({ username, code }) // Ensure 'username' is defined
			});

			const resultCode = await responseCode.json();
			if (resultCode.status === 'success') {
				console.log("Code verified successfully");
				// document.getElementById('codeModal').style.display = 'none'; // Hide the modal
				// Continue with any additional actions after verification
				return true ;
			} else {
			// console.log("Code verification failed: ", resultCode);
			showAlert("Incorrect code. Please try again.", 'fail');
			// alert("Incorrect code. Please try again.");
			return false ;
			}
		} catch (error) {
			console.error("Error during code verification:", error);
			showAlert("An error occurred. Please try again.", 'fail');
			// alert("An error occurred. Please try again.");
			return false ;
		}
	}
	console.log("No code entered");
	showAlert("No code entered. Please try again.", 'basic');
	// alert("No code entered. Please try again.");
	return false ;
	
}

async function setupLoginForm() {
	// if (await userIsAuthenticated() === true){
		
	// 	console.log("userIsAuthenticated = true");
	// 	navigateTo("/profile");
	// 	alert("You are already logged in");
	// 	return ;
	// }

	const loginForm = document.getElementById("login-form");
	if (loginForm) {
		loginForm.addEventListener("submit", async (e) => {

			// stop the browser from executing its default submission behavior
			// to handle the submission process manually			
			e.preventDefault();

			// get form data
			const username = document.getElementById('login-username').value;
			const password = document.getElementById('login-password').value;

			// console.log("username: ", username);
			// console.log("password: ", password);		
			// gonna send a email to the address linked to this username
			// the user will have to enter the code he received by email
			// ------------ Double Auth ------------
			const response = await fetch('/backend/authent/doubleAuth/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body: JSON.stringify({username, password})

			});
			const result = await response.json();
			console.log("Response doubleAuth: ", result);

			if (result.status == 'success') {

				let verification = await verifyCode(username);
				if (verification === true)
				{
					console.log("Code verified successfully");
				}
				else {
					// alert("Wrong code, please try again.");
					showAlert("Wrong code, please try again.", 'fail');
					console.log("Code verification failed");
					document.getElementById("login-form").reset();
					return ;
				}
			}
			else if (result.status == 'error' && result.message == 'Error wrong username or password') {
				showAlert("Invalid username or password, please try again.", 'fail');
				// alert("Invalid username or password, please try again.");
				return ;
			}
			else if (result.status == 'error' && result.message == 'Invalid password') {
				// alert("Invalid password, please try again.");  
				showAlert("Invalid password, please try again.", 'fail');
				return ;
			}
			else {
				showAlert("An error occurred, please try again.", 'fail');
				// alert("An error occurred, please try again.");
				// console.log("Error doubleAuth: ", result);
				return ;
			}
			// -------------------------------------
			await login(username, password);
		})
	}
}

async function create42User() {
	// verify that user is not authenticated
	// await refreshAccessToken();

	const responseIsAuth = await fetch('/backend/authent/preAuthenticated/', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCookie('csrftoken'),
		},
	})
	if (!responseIsAuth.ok) {
		console.log("Error while checking if user is authenticated (preAuthenticated function)");
		return ;
	// 	throw new Error(`HTTP error! status: ${responseIsAuth.status}`);
	}
	const resultIsAuth = await responseIsAuth.json()
	console.log("User authenticated: ", resultIsAuth.authenticated);
	// if user authenticated, return
	if (resultIsAuth.authenticated == true) 
	{
		console.log("User already authenticated, no need to create a new user -> return");
		return ;
	}
	console.log("User not authenticated, creating a new user from 42 + login");

		const response = await fetch('/backend/authent/get42User/', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		const result = await response.json(); // Wait for the JSON response
		if (result.error == 'no 42user in tempuser') {
			// alert("Not logged in, please log in first");
			console.log("Not logged in, please log in first");
			// navigateTo("/login");
			return ;
			// throw new Error(`HTTP error! status: ${response.status}`);
		}
		
			// Now this will correctly log the username

		const username = result.username + "42";
		const email = result.email;
		const password = result.password;
		const password_confirmation = result.password;
		// console.log("username : ", username);
		// console.log("email : ", email);
		// console.log("password : ", password);
		// console.log("password_confirmation : ", password_confirmation);

		const responseUserExists = await fetch('/backend/authent/userExists/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify({username, password})
		})
		const resultUserExists = await responseUserExists.json();
		console.log("User exists: ", resultUserExists.exists);
		if (resultUserExists.exists == true) 
		{
			console.log("User already exists, gonna simply login and return");
			await login(username, password);
			return;
		}
		console.log("User doesn't exists, gonna register + login");
		await register(username, email, password, password_confirmation);
}

async function deleteTokens() {
    const logoutButton = document.getElementById('buttonLogout');
    
	logoutButton.addEventListener('click', async function() {
		await refreshAccessToken();	
		console.log("Logout button clicked!");
		fetch('/backend/authent/logout/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'),
			},

		})
		.then(response => {
			if (response.ok) {
				// Clear tokens from storage on successful logout
				// removeCookie('access_token');
				// removeCookie('refresh_token');
				// console.log("Access token:", getCookie("access_token"));
				// console.log("Refresh token:", getCookie("refresh_token"));
				// alert('Logged out successfully');
				showAlert("Logged out successfully", 'basic');
				localStorage.removeItem("username");
				localStorage.removeItem("exp_time");
				if (chatSocket)
					chatSocket.close();
				if (tSocket)
					tSocket.close();
				window.location.href = '/'; // Redirect to login page or home page

			} else {
				showAlert("Logout failed", 'fail');
				// alert('Logout failed');
				return ;
			}
		})
		.catch(error => console.error('Error:', error));            
	});
}

async function setupRegisterForm() {


	const registerForm = document.getElementById("register-form");
	if (registerForm) {
		registerForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const username = document.getElementById("register-username").value;
		const email = document.getElementById("register-email").value;
		const password = document.getElementById("register-password").value;
		const password_confirmation = document.getElementById(
		"register-password-confirmation"
		).value;

		if (password !== password_confirmation) {
			// document.getElementById("register-form").reset();
			// alert("Passwords do not match, please try again");
			showAlert("Passwords do not match, please try again", 'fail');
			// [TODO] GIVE USER ERRORS FEEDBACKS
			return;
		}
		register(username, email, password, password_confirmation);
		});
	}
}

export { setupLoginForm, deleteTokens, setupRegisterForm, create42User, userIsAuthenticated };