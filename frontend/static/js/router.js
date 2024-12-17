import { setupProfilePage, setupEditProfilePage } from "./user.js";
import { gameTournamentTemplate} from "./game.js";
import { setRoom, displayUsersHistory} from "./chat.js";
import { create42User, deleteTokens, setupLoginForm, setupRegisterForm, userIsAuthenticated } from "./auth.js";
import { showAlert, refreshAccessToken, getCookie, hLinks, navbarToLink, goBackHome, loginLinks, registerLinks, profileLinks, homeLinkProfile } from "./utils.js"
import { displayStats } from "./stats.js";
import { initializeBall } from "./anim_home.js";

	// map() iterates on routes[] and applies the function for each route it creates
	// location is a global object available in the browser's environment. It's part \
// of the Web APIs provided by the browser and is automatically accessible in client- \
// side JavaScript without needing to be explicitly defined or imported. The location \
// object contains information about the current URL of the document being displayed.

// const router = async () => {
const router = async (roomName) => {

	// 	const routeHandlers = {
	// 	"/": deleteTokens,
	// 	"/index": deleteTokens,
	// 	"/login": setupLoginForm,
	// 	"/register": setupRegisterForm,
	// 	"/profile": setupProfilePage,
	// 	"/game": gameTournamentTemplate,
	// 	"/chat": setChat,
	// 	"/chat/:identifier": setRoom,
	// };

	// console.log ("pathname = " + location.pathname)
	const routes = [
		{ path: "/", templateId: "template-home" },
		{ path: "/home", templateId: [  "template-nav-bar", "template-home-connected"] },
		// { path: "/index", templateId: "template-index" },
		{ path: "/login", templateId: [ "template-home", "template-login" ] },
		{ path: "/register", templateId: [ "template-home", "template-register" ] },
		// { path: "/chat", templateId: "template-chat" },
		{ path: /^\/chat\/[^/]+$/, templateId: "template-room" },
		{ path: "/profile", templateId: [ "template-nav-bar", "template-profile" ] },
		{ path: "/editprofile", templateId: [ "template-nav-bar", "template-editprofile" ] },
		{ path: "/game", templateId: "template-game" },
		{ path: "/stats", templateId: [ "template-nav-bar", "template-stats" ] },
		{ path: "/404notfound", templateId: "template-not-found" },
	  ];
  
	if (location.pathname === "/" ||
		location.pathname === "/login" || 
		location.pathname === "/register" ||
		location.pathname === "/404notfound") {	
		if (await userIsAuthenticated()) {
			await refreshAccessToken();
			if (location.pathname != "/404notfound")	
			{
				
				if (location.pathname != "/")
				{
					// console.log("userIsAuthenticated = true ");
					// console.log("location.pathname = " + location.pathname);
					showAlert("You're already logged in <3", 'basic');
				}
				await navigateTo("/home");
				return ;
			}
			
		}
	}
	else if ( location.pathname === "/home" ||
		location.pathname === "/profile" ||
		location.pathname === "/editprofile" || 
		location.pathname === "/game" ||
		location.pathname === "/stats" ||
		location.pathname.startsWith('/chat'))  {
		await refreshAccessToken();
		await create42User();
		if (!(await userIsAuthenticated())) {
			await refreshAccessToken();
			await navigateTo("/login");
			// console.log("userIsAuthenticated = false");
			showAlert("You need to log in or register first <3", 'basic');
			// alert("You need to log in or register first <3");
			return ;
		}
	}
	else 
	{
		location.pathname = "/404notfound";
	}

  
	function potentialMatches(pathname)
	{
		let route;
		for (route of routes)
		{
			if (route.path === pathname || (route.path instanceof RegExp && route.path.test(pathname)))
				return route;
				// checks route.path and if it's an instance of RegExp, meaning it’s a regular expression.
		}
		route.path = "/404notfound";
		route.templateId = "template-not-found";
		return route;
	}
	let route = potentialMatches(location.pathname);

	const templateId = route.templateId;
	console.log(`Matched route: ${route.path}`);
	console.log(`Template ID: ${templateId}`);
	// console.log(`Dynamic parameters:`,params);
	const app = document.getElementById("app");
	app.innerHTML = "";
	
	// app.append(document.getElementById(templateId).content.cloneNode(true));

	// Handle multiple templates
	if (Array.isArray(templateId)) { // checks if templateId is an array
		for (const id of templateId) { // iterates over the array
		const template = document.getElementById(id); // gets the template element by its ID
		if (template) { // checks if the template exists
			app.append(template.content.cloneNode(true)); // appends the template content to the app element
		}
		}
	} else { // if templateId is not an array
		const template = document.getElementById(templateId); 
		if (template) { 
		app.append(template.content.cloneNode(true)); // appends the template content to the app element
		}
	}

// ------------------------------------------------------- ancienne 
	// const potentialMatches = routes.map((route) => {
	//   const pathSegments = route.path
	// 	.split("/")
	// 	.filter((segment) => segment !== "");
	//   const urlSegments = location.pathname
	// 	.split("/")
	// 	.filter((segment) => segment !== "");
  
	//   if (pathSegments.length !== urlSegments.length) {
	// 	return { route, isMatch: false, params: {} };
	//   }
  
	//   const isMatch = pathSegments.every((segment, index) => {
	// 	return segment === urlSegments[index];
	//   });
  
	//   return { route, isMatch };
	// });
  
	// let match = potentialMatches.find((potentialMatch) => potentialMatch.isMatch);
  
	// if (!match) {
	// 	match = {
	// 	  route: {
	// 		path: "/404notfound",
	// 		templateId: "template-404-not-found",
	// 	  },
	// 	  isMatch: true,
	// 	  params: {},
	// 	};
	//   }
// -------------------------------------------------------


	//   const templateId = match.route.templateId;
	//   console.log(`Matched route: ${match.route.path}`);
	//   console.log(`Template ID: ${templateId}`);
	//   console.log(`Dynamic parameters:`, match.params);
	//   const app = document.getElementById("app");
	//   app.innerHTML = "";
	//   app.append(document.getElementById(templateId).content.cloneNode(true));
	  
	//   if (match.route.path === "/login") {
	// 		await refreshAccessToken();
	// 		await setupLoginForm();
	//   } else if (match.route.path === "/register") {
	// 		await refreshAccessToken();
	// 		await setupRegisterForm();
	//   } else if (match.route.path === "/profile") {
	// 		await refreshAccessToken();
	// 	 	await setupProfilePage();
	//   } else if (match.route.path === "/game") {
	// 		await refreshAccessToken();
	// 	  	gameTournamentTemplate();
	//   } else if (match.route.path === "/chat") {
	// 		await refreshAccessToken();
	// 	  	setChat();
	//   } else if (match.route.path.test(location.pathname)) {
	// 		await refreshAccessToken();
	// 		setRoom(location.pathname);
	//   }	else if (match.route.path === "/index") {
	// 		await refreshAccessToken();
	// 		deleteTokens();
	//   }


	if (route.path === "/") {
		// await refreshAccessToken();
		await hLinks();
		await initializeBall();
  } else if (route.path === "/home") {
		await refreshAccessToken();
		await navbarToLink();
		await deleteTokens();
		await initializeBall();
  }
  else if (route.path === "/login") {
		// await refreshAccessToken(); // peut faire boucle infinie 
		await goBackHome();
		await loginLinks();
		await setupLoginForm();
  } else if (route.path === "/register") {
		// await refreshAccessToken();
		await goBackHome();
		await registerLinks();
		await setupRegisterForm();
  } else if (route.path === "/profile") {
		await refreshAccessToken();
		await navbarToLink();
		await deleteTokens();
		await profileLinks();
		await refreshAccessToken();
		await homeLinkProfile();
		// await goBackHome();
		await setupProfilePage();
  } else if (route.path === "/editprofile") {
		await refreshAccessToken();
		await navbarToLink();
		await deleteTokens();
		await refreshAccessToken();
		await homeLinkProfile();
		// await goBackHome();
		await setupEditProfilePage();
  } else if (route.path === "/game") {
		await refreshAccessToken();
		await gameTournamentTemplate(roomName);
  }
  else if (route.path === "/stats") { 
	await refreshAccessToken();
	await navbarToLink();
	await deleteTokens();
	await displayStats();
  }


	else if (route.path instanceof RegExp)
	{
		await refreshAccessToken();
		// await navbarToLink();
		await displayUsersHistory(location.pathname)
		await setRoom(location.pathname);
		await refreshAccessToken();
		await goBackHome();
  }
  else 
  {
		await goBackHome();
  }

};

// async function navigateTo(url) {
// idem a :
const navigateTo = async (url) => {
	// console.log("NAVIGATE TO");
	// console.log("URL = " + url);
	// console.log("WINDOW PATHNAME = " + window.location.pathname);
	if ((url === '/profile' || url === '/index')) {
		// console.log("refreshAccessToken");
		await refreshAccessToken();
	}
	// if (window.location.pathname !== url) {
	// console.log("PUSH STATE");
	history.pushState(null, null, url);
	// }
	await router();
	// await router("");
};

const navigateTo_chat_game = async (url, roomName) => {

	if ((url === '/profile' || url === '/index')) {
		// console.log("refreshAccessToken");
		await refreshAccessToken();
	}
	history.pushState(null, null, url);
	await router(roomName);
};

function navigateToUserPage(userId) {
	navigateTo(`/user/${userId}`);
}

  
export { router, navigateTo, navigateToUserPage, navigateTo_chat_game };