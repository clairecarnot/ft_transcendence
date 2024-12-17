import { navigateTo, navigateToUserPage } from "./router.js";
import { userIsAuthenticated } from "./auth.js";
import { showAlert, refreshAccessToken, getCookie } from "./utils.js"

// async function setupProfilePage() {
// 	// const username = "Orlando";

// 	try {
// 		// const response = fetch("/backend/users/profile", {
// 			const response = await fetch("/backend/users/profile/", {
// 			method: "GET",
// 			headers: {
// 				"Content-Type": "application/json",
// 			},
// 			// body: JSON.stringify(username),
// 		});

// 		// const responseData = response.json;
// 		const responseData = await response.json();
//         console.log("Server response:", response.status, responseData);

// 		console.log(responseData);
// 	}
// 	catch (error) {
//         console.error("Error during profile loading:", error);
//       }
// }

async function setupEditProfilePage() {
	let imageIsChanged = false;
	await refreshAccessToken();
	const response = await fetch('/backend/users/profile/', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
		credentials: 'include'  // This ensures cookies are sent with the request
	});
	// Check if the response is OK (status 200)
	if (!response.ok) {
		console.log("Error during profile loading:", response.status);
		return ;
	}

	// Parse the JSON response
	const data = await response.json();
	console.log("profile data : ", data);

	// Assuming your data contains a 'username' field
	// const username = data.user;
	// const ne peux pas etre update dans edit profile / let peut etre modif dans edit profile
	const imagePath = data.image;
	const username = data.username;
	const email = data.email;
	let pseudo = data.pseudo;
	let status = data.status;
	let bio = data.bio;

	const imageElement = document.getElementById('image');// maybe delete / at the begining
	imageElement.src = imagePath;
	imageElement.alt = "Profile Picture";

	document.getElementById('username').innerText = username;
	document.getElementById('email').innerText = email;
	// document.getElementById('pseudo').innerText = pseudo;
	// document.getElementById('status').innerText = status;
	document.getElementById("pseudo").placeholder = pseudo;
	document.getElementById("status").placeholder = status;
	document.getElementById('bio').placeholder = bio;

	const editProfileForm = document.getElementById('edit-profile-form');
	if (editProfileForm) {
		editProfileForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		// const username = localStorage.getItem('username');
		if (document.getElementById('pseudo').value != "")
			pseudo = document.getElementById('pseudo').value;
		if (document.getElementById('status').value != "")
			status = document.getElementById('status').value;
		if (document.getElementById('bio').value != "")
			bio = document.getElementById('bio').value;
		console.log("profile update ---> infos : ", username, email, pseudo, status, bio);
		const requestBody = {
			'username' : username,
			'email' : email,
			'pseudo' : pseudo,
			'status' : status,
			'bio' : bio,
		}
		await refreshAccessToken();
		const response = await fetch('/backend/users/updateprofile/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken')

			},
			body: JSON.stringify(requestBody),
		});
	
		const result = await response.json();
		if (result.error == "Pseudo already exists")
		{
			showAlert("Pseudo already exists", "basic");
			return ;
		}
		else if (result.error == "Pseudo has to be between 3 and 20 characters")
		{
			showAlert("Pseudo has to be between 3 and 20 characters", "basic");
			return ;
		}
		else if (result.error == "Pseudo must contain only letters and digits")
		{
			showAlert("Pseudo must contain only letters and digits", "basic");
			return ;			
		}
		else if (result.error == "Bio can't be longer than 100 characters")
		{
			showAlert("Bio can't be longer than 100 characters", "basic");
			return ;
		}
		else if (result.error == "Bio must contain only letters, digits, and spaces")
		{
			showAlert("Bio must contain only letters, digits, and spaces", "basic");
			return ;
		}
		// console.log(result);
		if (imageIsChanged == true)
		{
			await refreshAccessToken();
			const responseImg = await fetch('/backend/users/update_profile_picture/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body: JSON.stringify({ image: selectedImage }),
				});
		
				if (responseImg.ok) {
				//   profilePictureModal.hide();
					imageIsChanged = false;
				} else {
				// alert("Error updating profile picture. Please try again.");	
				showAlert("Error updating profile picture. Please try again.", "basic");
			}
		}

		navigateTo("/profile");
		return ;
	});
	}

		// console.log("0");
		const chooseProfilePictureLink = document.getElementById("choose-profile-picture");
		const profilePictureModal = new bootstrap.Modal(document.getElementById("profilePictureModal"));
		const profilePictureOptions = document.getElementById("profile-picture-options");
		const confirmButton = document.getElementById("confirm-profile-picture");
		// const profilePictureDisplay = document.getElementById("profile-picture-display");
		// console.log("1");
		let selectedImage = null;
		
		// Open the modal and fetch images
		chooseProfilePictureLink.addEventListener("click", async (event) => {
		  event.preventDefault();
		  // console.log("2");
		  profilePictureOptions.innerHTML = ''; // Clear any existing options
	  	  await refreshAccessToken();
		  const response = await fetch('/backend/users/get_profile_pictures/');
		  const images = await response.json();
			console.log("images ---> ", images);
		  // Populate the modal with images
		  images.forEach((imageUrl) => {
			const colDiv = document.createElement("div");
			colDiv.className = "col-4 text-center";
	  
			const imgElement = document.createElement("img");
			imgElement.src = imageUrl;
			imgElement.alt = "Profile Picture Option";
			imgElement.className = "img-thumbnail";
			imgElement.style.cursor = "pointer";
			imgElement.dataset.image = imageUrl;
	  
			imgElement.addEventListener("click", () => {
			  document.querySelectorAll(".img-thumbnail").forEach(img => img.classList.remove("border-primary"));
			  imgElement.classList.add("border-primary");
			  selectedImage = imageUrl;
			});
	  
			colDiv.appendChild(imgElement);
			profilePictureOptions.appendChild(colDiv);
		  });
	  
		  profilePictureModal.show();
		});
	  
		// Confirm the selection
		confirmButton.addEventListener("click", async () => {
		 if (selectedImage) {
			// Update the profile picture on the page
			console.log("selectedImage ---> ", selectedImage);
			imageElement.src = selectedImage;
			imageIsChanged = true;
			profilePictureModal.hide();
			// Send the selection to the backend

		  } else {
			// alert("Please select an image.");
			showAlert("Please select an image.", "basic");
		  }
		});


}


async function setupProfilePage() {
	await refreshAccessToken();
	const response = await fetch('/backend/users/profile/', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
		credentials: 'include'  // This ensures cookies are sent with the request
	});
	// Check if the response is OK (status 200)
	if (!response.ok) {
		console.log("Error during profile loading:", response.status);
		return ;
	}

	// Parse the JSON response
	const data = await response.json();
	console.log(data);  // Log the profile data

	// Assuming your data contains a 'username' field
	// const username = data.user;
	const imagePath = data.image;
	const username = data.username;
	const email = data.email;
	const pseudo = data.pseudo;
	const status = data.status;
	const bio = data.bio;
	const gamesCount = data.games_count;
	const victoriesCount = data.victories_count;

	// Select the image element using its ID
	const imageElement = document.getElementById('image');// maybe delete / at the begining
	imageElement.src = imagePath;
	imageElement.alt = "Profile Picture";

	document.getElementById('username').innerText = username;
	document.getElementById('email').innerText = email;
	document.getElementById('pseudo').innerText = pseudo;
	document.getElementById('status').innerText = status;
	document.getElementById('bio').innerText = bio;
	document.getElementById('games_count').innerText = gamesCount;
	document.getElementById('victories_count').innerText = victoriesCount;

	// .then(response => response.json())
	// .then(data => {
	// 	console.log(data);  // The user profile data as JSON
	// 	// Update the frontend with the user's profile data
	// })
	// .catch(error => console.error('Error:', error));
}


export { setupProfilePage, setupEditProfilePage };
