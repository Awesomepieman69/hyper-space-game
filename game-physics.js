// Collision detection and game state management functions
function checkCollisions() {
    const playerRight = player.x + player.size;
    const playerBottom = player.y + player.size;
    let onPlatform = false; // Track landing on platforms/blocks specifically

    // --- Check Obstacle Collisions ---
    obstacles.forEach(obstacle => {
        if (!gameRunning) return; // Stop checking if game over already triggered
        if (obstacle.type === 'gap') return; // Skip gaps in this specific obstacle loop

        const screenX = obstacle.x - scrollX;
        const obstacleRight = screenX + obstacle.width;
        const obstacleBottom = obstacle.y + obstacle.height;

        if (
            playerRight > screenX &&
            player.x < obstacleRight &&
            playerBottom > obstacle.y &&
            player.y < obstacleBottom
        ) {
            // Collision detected with non-gap obstacle
            if (obstacle.type === 'spikes') {
                gameOver();
                return; // Exit forEach early
            } else {
                // Platform collision from above
                const landingTolerance = 15;
                // Check velocity is non-negative (or zero) to ensure falling/level movement
                if (player.velocityY >= 0 && playerBottom - player.velocityY <= obstacle.y + landingTolerance) {
                    player.y = obstacle.y - player.size;
                    player.velocityY = 0;
                    isJumping = false;
                    player.jumpsLeft = 2;
                    onPlatform = true; // Landed on a platform/block

                    // Create landing particles
                    createParticles(player.x + player.size / 2, player.y + player.size, 5, LEVEL_COLORS[currentStage - 1], 'land');
                }
                // Side collision check but only if not landing from above
                else if (!onPlatform) {
                    const playerCenterX = player.x + player.size / 2;
                    if (playerCenterX > screenX && playerCenterX < obstacleRight) {
                        if (playerBottom > obstacle.y + 10 && player.y < obstacleBottom - 10) {
                             gameOver();
                             return; // Exit forEach early
                        }
                    }
                }
            }
        }
    });

    // If player died from spikes/side collision, stop further checks
    if (!gameRunning) return;

    // --- Check Ground/Gap Interaction (only if not currently landed on a platform) ---
    if (!onPlatform) {
        let isOverGap = false;
        const playerCenterX = player.x + player.size / 2;

        for (const obstacle of obstacles) {
            if (obstacle.type === 'gap') {
                const screenX = obstacle.x - scrollX;
                const screenEndX = screenX + obstacle.width;
                // Check if player's horizontal center is within the gap's bounds
                if (playerCenterX > screenX && playerCenterX < screenEndX) {
                    isOverGap = true;
                    // If player's bottom reaches or passes ground level while over a gap, it's game over
                    if (playerBottom >= CANVAS_HEIGHT - 10) {
                        gameOver();
                        return; // Exit checkCollisions function immediately
                    }
                    break; // Found the gap the player is over, no need to check others
                }
            }
        }

        // If not over a gap, check for landing on solid ground
        if (!isOverGap && player.y >= CANVAS_HEIGHT - player.size - 10) {
            player.y = CANVAS_HEIGHT - player.size - 10;
            if (player.velocityY > 0) { // Only reset velocity/jumps if actually landing
               player.velocityY = 0;
               isJumping = false;
               player.jumpsLeft = 2;
            }
        }
    }

    // Final check: if player somehow fell completely off bottom (e.g., edge case after gap)
    if (player.y > CANVAS_HEIGHT + player.size) { // Check if fully below screen
        gameOver();
    }
}

function jump() {
    // Allow jump if jumps are left
    if (player.jumpsLeft > 0) {
        player.velocityY = JUMP_FORCE;
        isJumping = true;
        player.jumpsLeft--; // Decrement jumps left

        // Create jump particles - Pass canvas coordinates
        createParticles(player.x + player.size / 2, player.y + player.size / 2, 8, LEVEL_COLORS[currentStage - 1], 'jump');
    }
}

function createParticles(canvasX, canvasY, count, color = NEON_COLOR, type = 'default') {
     const uiContainer = document.getElementById('ui-container');
     const gameCanvas = document.getElementById('game-canvas');
     const canvasRect = gameCanvas.getBoundingClientRect(); // Get canvas position relative to viewport
     const containerRect = uiContainer.getBoundingClientRect(); // Get container position

    // Calculate position relative to the ui-container
     const relativeX = canvasRect.left - containerRect.left + (canvasX / CANVAS_WIDTH) * canvasRect.width;
     const relativeY = canvasRect.top - containerRect.top + (canvasY / CANVAS_HEIGHT) * canvasRect.height;


    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        // Set initial position using pixels relative to the container
        particle.style.left = `${relativeX}px`;
        particle.style.top = `${relativeY}px`;
        particle.style.backgroundColor = color;
        particle.style.transform = 'translate(-50%, -50%)'; // Center particle on the coords

        let size, duration, vx, vy, gravity;

        switch (type) {
            case 'jump':
                size = Math.random() * 6 + 3;
                duration = Math.random() * 500 + 300;
                vx = Math.random() * 4 - 2;
                vy = Math.random() * -3 - 1;
                gravity = 0.05;
                break;
            case 'land':
                size = Math.random() * 5 + 2;
                duration = Math.random() * 400 + 200;
                vx = Math.random() * 6 - 3;
                vy = Math.random() * -1 - 0.5;
                gravity = 0.1;
                break;
            case 'complete':
                size = Math.random() * 10 + 5;
                duration = Math.random() * 1500 + 1000;
                vx = Math.random() * 10 - 5;
                vy = Math.random() * 10 - 5;
                gravity = 0.02;
                particle.style.borderRadius = '0';
                break;
            case 'gameOver':
                 size = Math.random() * 8 + 4;
                duration = Math.random() * 1000 + 500;
                vx = Math.random() * 12 - 6; // Stronger explosion
                vy = Math.random() * 12 - 6;
                gravity = 0.08;
                particle.style.backgroundColor = SPIKES_COLOR; // Use spikes color for death
                break;
            default: // Default or other types
                size = Math.random() * 8 + 3;
                duration = Math.random() * 1000 + 500;
                vx = Math.random() * 6 - 3;
                vy = Math.random() * -1 - 2;
                gravity = 0.05;
        }


        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.opacity = Math.random() * 0.5 + 0.5;


        uiContainer.appendChild(particle);

        // Animate particle
        const startTime = Date.now();
        let currentX = 0; // Track displacement for transform
        let currentY = 0;
        let currentVY = vy;
        const initialRotation = (type === 'complete') ? (Math.random() * 360) : 0; // Store initial rotation for complete type


        const animateParticle = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Update position with velocity and gravity
            currentVY += gravity;
            currentX += vx * (elapsed / duration); // Simplified horizontal movement for now
            currentY += currentVY;

            // Apply transform relative to the initial centered position
            let transformStyle = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px))`;
            if (type === 'complete') {
               transformStyle += ` rotate(${initialRotation + progress * 360}deg)`; // Add rotation for complete effect
            }
            particle.style.transform = transformStyle;

            particle.style.opacity = 1 - progress;


            if (progress < 1) {
                requestAnimationFrame(animateParticle);
            } else {
                particle.remove();
            }
        };

        requestAnimationFrame(animateParticle);
    }
}

function completeStage() {
    // Show completion effect - use canvas center coordinates
    createParticles(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        50,
        LEVEL_COLORS[currentStage % LEVEL_COLORS.length],
        'complete'
    );

    // Increment stage counter
    currentStage++;
    
    if (currentStage <= 4) {
        console.log("Moving to stage", currentStage); // Debug logging
        
        // Show next stage text
        showStageText = true;
        document.getElementById('stage-display').textContent = `Stage ${currentStage}`;
        document.getElementById('stage-display').style.opacity = 1;
        
        // Reset for next stage
        scrollX = 0;
        loadStage(currentStage - 1);
        player.x = 100;
        player.y = CANVAS_HEIGHT - PLAYER_SIZE - 10;
        player.velocityY = 0;
        isJumping = false;
        player.jumpsLeft = 2; // Reset jumps for new stage
        
        // Color change effect
        setTimeout(() => {
            document.body.style.backgroundColor = `rgba(10, ${25 + currentStage * 10}, ${34 + currentStage * 10}, 1)`;
        }, 100);
        
        // Fade out after delay
        setTimeout(() => {
            if (showStageText && gameRunning) { // Check gameRunning
                document.getElementById('stage-display').style.opacity = 0;
                showStageText = false; // Set flag
            }
        }, 1500); // Fade out after 1.5 seconds
        
        // Continue game loop
        gameLoop();
    } else {
        // Game complete
        document.getElementById('final-score').textContent = `Final Score: ${score}`;
        document.getElementById('game-over').style.display = 'flex';
        document.getElementById('game-over').querySelector('h1').textContent = 'YOU WIN!';
        gameRunning = false;
        cancelAnimationFrame(animationFrameId); // Stop the loop when game is won
    }
}

function gameOver() {
    // Only execute once
    if (!gameRunning) return;
    gameRunning = false;
    cancelAnimationFrame(animationFrameId); // Stop the loop
    
    // Show game over screen
    document.getElementById('final-score').textContent = `Score: ${score}`;
    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('game-over').querySelector('h1').textContent = 'GAME OVER';
    
    // Death effect - use player's current canvas coordinates
    createParticles(
        player.x + player.size / 2,
        player.y + player.size / 2,
        30,
        SPIKES_COLOR,
        'gameOver'
    );
}

function handleKeyDown(e) {
    if (gameRunning && (e.code === 'Space' || e.key === 'ArrowUp')) { // Added gameRunning check
        jump();
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space' || e.key === 'ArrowUp') {
        e.preventDefault();
    }
}

function handleClick(e) {
    if (gameRunning) { // Already checks gameRunning
        jump();
        e.preventDefault();
    }
}