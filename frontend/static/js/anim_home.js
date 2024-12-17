
async function initializeBall() {
	
  const container = document.getElementById("ball-anim-home");
  // Remove any existing ball
  const existingBall = document.getElementById("ball-home");
  if (existingBall) {
    existingBall.remove();
  }

  // Create the ball element
  const ball = document.createElement("div");
  ball.id = "ball-home";
  container.appendChild(ball);

  // Ball position and speed variables
  let ballX = 10; // Initial horizontal position
  let ballY = 10; // Initial vertical position
  let ballSpeedX = 2; // Horizontal speed (positive: right, negative: left)
  let ballSpeedY = 2; // Vertical speed (positive: down, negative: up)

  // Function to slightly adjust speed randomly
  // function randomizeSpeed(speed) {
  //   const change = (Math.random() - 0.5) * 0.5; // Random value between -0.25 and +0.25
  //   return speed + change;
  // }

  // Ball movement function
  function moveBall() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const ballSize = ball.offsetWidth;

    // Update ball position
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Check for collisions with container borders
    if (ballX <= 0 || ballX + ballSize >= containerWidth) {
      ballSpeedX *= -1; // Reverse horizontal direction
      // ballSpeedX = randomizeSpeed(ballSpeedX);
    }
    if (ballY <= 0 || ballY + ballSize >= containerHeight) {
      ballSpeedY *= -1; // Reverse vertical direction
      // ballSpeedY = randomizeSpeed(ballSpeedY);
    }

    // Apply the updated position
    ball.style.left = `${ballX}px`;
    ball.style.top = `${ballY}px`;

    // Request the next animation frame
    requestAnimationFrame(moveBall);
  }

  // Start the animation
  moveBall();
}


export { initializeBall };