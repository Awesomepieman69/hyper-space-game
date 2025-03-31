// Game loop and rendering functions
function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    drawBackground();
    
    // Update and draw player
    updatePlayer();
    drawPlayer();
    
    // Update and draw obstacles
    updateObstacles();
    drawObstacles();
    
    // Check for collisions
    checkCollisions();
    
    // Check for stage completion
    if (gameRunning && scrollX >= stages[currentStage - 1].length) {
        completeStage();
        return;
    }
    
    // Update progress
    if(gameRunning){
        scrollX += gameSpeed;
        score += Math.floor(gameSpeed);
        document.getElementById('score-display').textContent = `Score: ${score}`;
    }
    
    // Handle stage display text
    if (showStageText && scrollX > 100) {
        showStageText = false;
        document.getElementById('stage-display').style.opacity = 0;
    }
    
    // Continue game loop
    if (gameRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function drawBackground() {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a1922');
    gradient.addColorStop(1, '#0a2835');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Grid pattern
    ctx.strokeStyle = `${LEVEL_COLORS[currentStage - 1]}20`;
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(scrollX % 50 - 50, y);
        ctx.lineTo(CANVAS_WIDTH + scrollX, y);
        ctx.stroke();
    }
    
    // Vertical lines
    for (let x = scrollX % 50 - 50; x < CANVAS_WIDTH + scrollX; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // Ground
    ctx.fillStyle = '#1a3a4a';
    let lastX = 0;
    // Filter obstacles to only include gaps for drawing purposes
    const gaps = obstacles.filter(ob => ob.type === 'gap');
    gaps.sort((a, b) => a.x - b.x); // Ensure gaps are sorted by x position

    gaps.forEach(gap => {
        const screenX = gap.x - scrollX;
        const screenEndX = screenX + gap.width;
        // Draw ground segment before the gap
        if (screenX > lastX) {
            ctx.fillRect(lastX, CANVAS_HEIGHT - 10, screenX - lastX, 10);
        }
        // Update lastX to the end of the gap, clamping to screen boundaries
        lastX = Math.max(0, screenEndX);
    });

    // Draw remaining ground segment after the last gap (or full ground if no gaps visible)
    if (lastX < CANVAS_WIDTH) {
        ctx.fillRect(lastX, CANVAS_HEIGHT - 10, CANVAS_WIDTH - lastX, 10);
    }
}

function updatePlayer() {
    // Apply gravity
    player.velocityY += GRAVITY;
    
    // Limit maximum fall speed to prevent tunneling through platforms
    const MAX_FALL_SPEED = 15;
    if (player.velocityY > MAX_FALL_SPEED) {
        player.velocityY = MAX_FALL_SPEED;
    }
    
    player.y += player.velocityY;
    
    // Update rotation
    player.rotation = Math.min(Math.max(-0.4, player.velocityY / 20), 0.4);
    
    // Keep player centered horizontally
    const targetX = CANVAS_WIDTH / 3;
    const diffX = targetX - player.x;
    
    if (Math.abs(diffX) > 1) {
        player.x += diffX * 0.1;
    }
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
    ctx.rotate(player.rotation);
    
    // Player main shape
    ctx.fillStyle = LEVEL_COLORS[currentStage - 1];
    ctx.beginPath();
    ctx.moveTo(-player.size / 2, -player.size / 2);
    ctx.lineTo(player.size / 2, 0);
    ctx.lineTo(-player.size / 2, player.size / 2);
    ctx.closePath();
    ctx.fill();
    
    // Player highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(-player.size / 6, 0, player.size / 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function updateObstacles() {
    const currentTime = Date.now();

    // Remove obstacles that are far behind
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width >= scrollX - CANVAS_WIDTH);

    // Update positions of dynamic obstacles
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'oscillatingPlatform') {
            const oscillationSpeed = obstacle.speed || 1;
            const range = obstacle.range || 50;
            obstacle.oscillationOffset = Math.sin(currentTime * 0.001 * oscillationSpeed) * (range / 2);
            obstacle.y = obstacle.initialY + obstacle.oscillationOffset;
        }
    });
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        const screenX = obstacle.x - scrollX;
        
        if (screenX + obstacle.width >= 0 && screenX <= CANVAS_WIDTH) {
            if (obstacle.type === 'spikes') {
                // Draw spikes
                ctx.fillStyle = SPIKES_COLOR;
                ctx.beginPath();
                ctx.moveTo(screenX, obstacle.y + obstacle.height);
                ctx.lineTo(screenX + obstacle.width / 2, obstacle.y);
                ctx.lineTo(screenX + obstacle.width, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
                
                // Spike highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.moveTo(screenX + 5, obstacle.y + obstacle.height);
                ctx.lineTo(screenX + obstacle.width / 2, obstacle.y + 5);
                ctx.lineTo(screenX + obstacle.width - 5, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
            } else if (obstacle.type !== 'gap') {
                // Draw block, platform, or oscillatingPlatform
                ctx.fillStyle = LEVEL_COLORS[currentStage - 1];
                
                // Special styling for oscillating platforms - add slight glow effect
                if (obstacle.type === 'oscillatingPlatform') {
                    // Add glow for oscillating platforms
                    ctx.save();
                    ctx.shadowColor = LEVEL_COLORS[currentStage - 1];
                    ctx.shadowBlur = 8;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }
                
                ctx.fillRect(screenX, obstacle.y, obstacle.width, obstacle.height);
                
                // Remove shadow if we added it
                if (obstacle.type === 'oscillatingPlatform') {
                    ctx.restore();
                }
                
                // Add some details
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, obstacle.y, obstacle.width, obstacle.height);
                
                // Different patterns based on platform/block type
                if (obstacle.type === 'platform') {
                    // Platform stripe pattern
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    for (let x = screenX; x < screenX + obstacle.width; x += 15) {
                        ctx.fillRect(x, obstacle.y, 8, obstacle.height);
                    }
                } else if (obstacle.type === 'oscillatingPlatform') {
                    // Oscillating platform pattern - animated dots
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    const dotCount = Math.floor(obstacle.width / 10);
                    for (let i = 0; i < dotCount; i++) {
                        const dotX = screenX + (i + 0.5) * (obstacle.width / dotCount);
                        const dotY = obstacle.y + obstacle.height / 2;
                        const dotSize = 3 + Math.sin(Date.now() * 0.005 + i) * 2;
                        ctx.beginPath();
                        ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (obstacle.width > 40) {
                    // Large block grid pattern
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    for (let x = screenX + 5; x < screenX + obstacle.width; x += 20) {
                        for (let y = obstacle.y + 5; y < obstacle.y + obstacle.height; y += 20) {
                            if (Math.random() > 0.7) {
                                ctx.fillRect(x, y, 10, 10);
                            }
                        }
                    }
                }
            }
        }
    });
}