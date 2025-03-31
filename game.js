// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PLAYER_SIZE = 30;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const BASE_SPEED = 5;
const NEON_COLOR = '#00ffaa';
const SPIKES_COLOR = '#ff5555';
const LEVEL_COLORS = ['#00ffaa', '#00ff88', '#00b37d', '#00ff55'];

// Game Variables
let canvas, ctx;
let gameRunning = false;
let player;
let obstacles = [];
let scrollX = 0;
let score = 0;
let currentStage = 1;
let gameSpeed = BASE_SPEED;
let isJumping = false;
let showStageText = true;
let animationFrameId;

// --- Updated Level Data for Procedural Generation ---
const stages = [
    { // Stage 1
        length: 3000,
        speed: BASE_SPEED,
        params: {
            minGap: 150, // Min horizontal space between obstacles
            maxGap: 350, // Max horizontal space
            obstacleProbabilities: { // Relative chances for each type
                'block': 0.3,
                'platform': 0.4,
                'spikes': 0.2,
                'oscillatingPlatform': 0.1
            },
            maxObstacleHeight: 150,
            minObstacleHeight: 30,
            maxWidth: 120,
            minWidth: 30,
            spikeHeight: 50, // Fixed height for spikes for consistency
            oscillationRange: 80,
            oscillationSpeed: 1.2,
            // --- Gap Parameters ---
            gapProbability: 0.1, // 10% chance to generate a gap instead of obstacle
            minGapWidth: 80,   // Smallest gap width
            maxGapWidth: 150   // Largest gap width (should be jumpable)
        }
    },
    { // Stage 2
        length: 4000,
        speed: BASE_SPEED * 1.2,
        params: {
            minGap: 120,
            maxGap: 300,
            obstacleProbabilities: {
                'block': 0.25,
                'platform': 0.35,
                'spikes': 0.25,
                'oscillatingPlatform': 0.15
            },
            maxObstacleHeight: 180,
            minObstacleHeight: 30,
            maxWidth: 150,
            minWidth: 30,
            spikeHeight: 60,
            oscillationRange: 100,
            oscillationSpeed: 1.5,
            gapProbability: 0.12,
            minGapWidth: 90,
            maxGapWidth: 160
        }
    },
    { // Stage 3
        length: 5000,
        speed: BASE_SPEED * 1.4,
        params: {
            minGap: 100,
            maxGap: 280,
            obstacleProbabilities: {
                'block': 0.2,
                'platform': 0.3,
                'spikes': 0.3,
                'oscillatingPlatform': 0.2
            },
            maxObstacleHeight: 200,
            minObstacleHeight: 40,
            maxWidth: 180,
            minWidth: 30,
            spikeHeight: 70,
            oscillationRange: 120,
            oscillationSpeed: 1.8,
            gapProbability: 0.15,
            minGapWidth: 100,
            maxGapWidth: 180
        }
    },
    { // Stage 4
        length: 6000,
        speed: BASE_SPEED * 1.6,
        params: {
            minGap: 80,
            maxGap: 250,
            obstacleProbabilities: {
                'block': 0.15,
                'platform': 0.25,
                'spikes': 0.35,
                'oscillatingPlatform': 0.25
            },
            maxObstacleHeight: 220,
            minObstacleHeight: 40,
            maxWidth: 200,
            minWidth: 30,
            spikeHeight: 80,
            oscillationRange: 150,
            oscillationSpeed: 2.0,
            gapProbability: 0.18,
            minGapWidth: 110,
            maxGapWidth: 200
        }
    }
];

// Helper function to choose weighted random item
function chooseWeighted(probMap) {
    let total = 0;
    for (const key in probMap) {
        total += probMap[key];
    }
    let rand = Math.random() * total;
    for (const key in probMap) {
        if (rand < probMap[key]) {
            return key;
        }
        rand -= probMap[key];
    }
    return Object.keys(probMap)[0]; // Fallback
}

// --- Function to Generate Obstacles Procedurally ---
function generateObstaclesForStage(params, stageLength) {
    const generatedObstacles = [];
    let currentX = 500; // Start first obstacle some distance in

    while (currentX < stageLength - params.maxGap) { // Ensure space at the end
        // Determine gap before the next obstacle
        const gap = params.minGap + Math.random() * (params.maxGap - params.minGap);
        currentX += gap;

        // --- Decide whether to place an obstacle or a gap ---
        let placeGap = Math.random() < params.gapProbability;
        let featureType = placeGap ? 'gap' : chooseWeighted(params.obstacleProbabilities);

        // Prevent placing two gaps too close together
        const lastFeature = generatedObstacles[generatedObstacles.length - 1];
        if (placeGap && lastFeature && lastFeature.type === 'gap') {
            placeGap = false; // Don't place consecutive gaps
            featureType = chooseWeighted(params.obstacleProbabilities); // Place an obstacle instead
        }

        if (placeGap) {
            // --- Place a Gap ---
            const gapWidth = params.minGapWidth + Math.random() * (params.maxGapWidth - params.minGapWidth);
            generatedObstacles.push({
                type: 'gap',
                x: currentX,
                width: gapWidth,
                // Gaps don't have y/height in the same way, but might need these for drawing/collision later
                y: CANVAS_HEIGHT - 10,
                height: 10
            });
            currentX += gapWidth; // Advance position by gap width
        } else {
            // --- Place an Obstacle ---
            const type = featureType;
            let width, height, yPos, specificParams = {};

            if (type === 'spikes') {
                width = params.minWidth + Math.random() * (params.maxWidth * 0.5 - params.minWidth); 
                height = params.spikeHeight;
                yPos = CANVAS_HEIGHT - height - 10; 
            } else {
                width = params.minWidth + Math.random() * (params.maxWidth - params.minWidth);
                height = params.minObstacleHeight + Math.random() * (params.maxObstacleHeight - params.minObstacleHeight);

                if (type === 'platform' || type === 'oscillatingPlatform') {
                    const maxPlatformY = CANVAS_HEIGHT - PLAYER_SIZE - 10 - Math.abs(JUMP_FORCE * 25) + Math.random() * 50;
                    const minPlatformY = CANVAS_HEIGHT - height - 150; 
                    yPos = Math.max(minPlatformY, Math.random() * (CANVAS_HEIGHT - height - 10 - maxPlatformY) + maxPlatformY);
                } else { // block
                    yPos = CANVAS_HEIGHT - height - 10; 
                }

                if (type === 'oscillatingPlatform') {
                    specificParams.range = params.oscillationRange * (0.8 + Math.random() * 0.4); 
                    specificParams.speed = params.oscillationSpeed * (0.8 + Math.random() * 0.4);
                    const potentialMaxY = yPos + specificParams.range / 2;
                    const potentialMinY = yPos - specificParams.range / 2;
                    if (potentialMaxY > CANVAS_HEIGHT - height - 10) {
                        yPos -= (potentialMaxY - (CANVAS_HEIGHT - height - 10));
                    }
                    if (potentialMinY < 50) {
                        yPos += (50 - potentialMinY);
                    }
                }
            }

            // --- Check if obstacle placement conflicts with a gap ---
            let conflictsWithGap = false;
            if (yPos + height >= CANVAS_HEIGHT - 10) { // Check only ground-based obstacles
                for (const existingFeature of generatedObstacles) {
                    if (existingFeature.type === 'gap') {
                        const obstacleEndX = currentX + width;
                        const gapEndX = existingFeature.x + existingFeature.width;
                        // Check for overlap
                        if (currentX < gapEndX && obstacleEndX > existingFeature.x) {
                            conflictsWithGap = true;
                            break;
                        }
                    }
                }
            }
            
            // If no conflict, add the obstacle
            if (!conflictsWithGap) {
                generatedObstacles.push({
                    x: currentX,
                    initialY: yPos,
                    y: yPos,
                    width: width,
                    height: height,
                    type: type,
                    oscillationOffset: 0,
                    ...specificParams 
                });
                currentX += width; // Move position past the placed obstacle
            }
        }
    }
    return generatedObstacles;
}

// Initialize Game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleClick);
    
    // Retry button
    document.getElementById('retry-btn').addEventListener('click', startGame);
    
    // Start button
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none'; // Hide start screen
        startGame(); // Start the actual game
    });
    
    // Ensure start screen is visible initially
    document.getElementById('start-screen').style.display = 'flex';
    // Ensure game over is hidden
    document.getElementById('game-over').style.display = 'none';
    // Ensure UI container elements are ready but maybe hidden or not updated yet
    document.getElementById('score-display').textContent = 'Score: 0';
    document.getElementById('stage-display').style.opacity = 0; // Hide stage text initially
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;
    let width = container.clientWidth;
    let height = width / ratio;
    
    if (height > window.innerHeight) {
        height = window.innerHeight;
        width = height * ratio;
    }
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
}

function startGame() {
    // --- Hide start screen if it's somehow still visible ---
    document.getElementById('start-screen').style.display = 'none';

    // Reset game state
    gameRunning = true;
    score = 0;
    currentStage = 1;
    scrollX = 0;
    isJumping = false;
    obstacles = [];
    
    // Update UI
    document.getElementById('score-display').textContent = `Score: ${score}`;
    document.getElementById('game-over').style.display = 'none';
    
    // Create player
    player = {
        x: 100,
        y: CANVAS_HEIGHT - PLAYER_SIZE - 10,
        size: PLAYER_SIZE,
        velocityY: 0,
        rotation: 0,
        jumpsLeft: 2
    };
    
    // Load current stage
    loadStage(currentStage - 1);
    
    // Show stage text
    showStageText = true;
    document.getElementById('stage-display').textContent = `Stage ${currentStage}`;
    document.getElementById('stage-display').style.opacity = 1;
    
    // Fade out stage text after a delay
    setTimeout(() => {
        if (showStageText && gameRunning) { // Check gameRunning in case player dies instantly
            document.getElementById('stage-display').style.opacity = 0;
            showStageText = false; // Set flag here to prevent re-triggering in gameLoop
        }
    }, 1500); // Fade out after 1.5 seconds
    
    // Start game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

function loadStage(stageIndex) {
    const stage = stages[stageIndex];
    gameSpeed = stage.speed;
    obstacles = []; // Clear existing obstacles - uncomment this

    // --- Generate obstacles using the new function ---
    obstacles = generateObstaclesForStage(stage.params, stage.length);
}

// Start the game
window.addEventListener('load', init);