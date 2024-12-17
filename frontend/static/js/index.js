import { navigateTo, router } from "./router.js";


// e represents the event object in JS and contains info about the event that occurred:
// - type of event ("click", "keydown"...)
// - target element (=element/link that was clicked)
// - mouse position
// - keyboard keys pressed (for keyboard events)...
// const changePage = (e) => {
// 	if (e.target.matches("[data-link]")) {
// 		e.preventDefault(); // prevents default event (=doesn't reload the page)
// 		navigateTo(e.target.href);
// 	}
// };

const initRouter = () => {
	// "popstate" event = when the user clicks on "Forward" or "Back"
	// The router function updates the view accordingly
	// window.addEventListener("popstate", router);

	window.addEventListener("popstate", (event) => {
		// console.log("POPSTATE EVENT INIT");
		router();
	});
	
	// window.addEventListener("popstate", (event) => {
	// 	if (event.state) {
	// 		displayContent(event.state);
	// 	}
	// 	else {
	// 		router();
	// 	}
	// });

	// document.body.addEventListener("click", changePage);
	// router("");
	router();
};

// "DOMContentLoaded" event = when the HTML document has been completely loaded \
// and parsed by the browser (but before external resources (imgs, css, frames) are fully loaded)
document.addEventListener("DOMContentLoaded", initRouter);

// // // A SUPPR

// window.addEventListener("popstate", router);

// document.addEventListener("DOMContentLoaded", () => {
//   document.body.addEventListener("click", (e) => {
//     // At this point e.target is the link that has been clicked
// 	// .matches("[data-link]") is a method that checks if the element matches the specified CSS selector
//     if (e.target.matches("[data-link]")) {
//       e.preventDefault(); // Prevents from reload the page
//       navigateTo(e.target.href);
//     }
//   });
//   router();
// });


