/**
 * FPS Target Shooter Game
 * Game sederhana dengan first-person view dan target shooting
 */

class FPSGame {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.timeLeft = 30;
        this.gameTimer = null;
        
        // Mouse controls
        this.mouseX = 0;
        this.mouseY = 0;
        this.pitch = 0; // Vertical rotation (-90 to 90)
        this.yaw = 0;   // Horizontal rotation
        
        // Targets
        this.targets = [];
        this.targetSpawnTimer = 0;
        this.targetMoveTimer = 0;
        this.difficulty = 1;
        
        // UI Elements
        this.uiElements = {
            score: document.getElementById('scoreValue'),
            timer: document.getElementById('timerValue'),
            finalScore: document.getElementById('finalScore'),
            gameOver: document.getElementById('gameOver'),
            instructions: document.getElementById('instructions'),
            restartBtn: document.getElementById('restartBtn'),
            crosshair: document.querySelector('.crosshair')
        };
        
        // Crosshair element (dynamic)
        this.createCrosshair();
        
        // Event listeners
        this.initEventListeners();
        
        // Start game loop
        this.gameLoop();
    }
    
    // Resize canvas to fullscreen
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    // Create dynamic crosshair
    createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.className = 'crosshair';
        crosshair.innerHTML = '⊕';
        document.body.appendChild(crosshair);
        this.crosshairElement = crosshair;
    }
    
    // Initialize event listeners
    initEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Game start (click to play)
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'menu') {
                this.startGame();
            }
        });
        
        // Pointer lock and mouse look
        this.canvas.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });
        
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.canvas) {
                document.addEventListener('mousemove', this.onMouseMove.bind(this));
                document.addEventListener('click', this.onShoot.bind(this));
            } else {
                document.removeEventListener('mousemove', this.onMouseMove);
                document.removeEventListener('click', this.onShoot);
            }
        });
        
        // Restart button
        this.uiElements.restartBtn.addEventListener('click', () => this.restartGame());
        
        // Escape to unlock pointer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.gameState === 'playing') {
                document.exitPointerLock();
            }
        });
    }
    
    // Mouse movement handler
    onMouseMove(e) {
        const sensitivity = 0.002;
        this.yaw -= e.movementX * sensitivity;
        this.pitch -= e.movementY * sensitivity;
        
        // Clamp pitch
        this.pitch = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, this.pitch));
    }
    
    // Shoot handler
    onShoot() {
        if (this.gameState !== 'playing') return;
        
        // Raycast to check hit
        const hitTarget = this.checkHit();
        if (hitTarget) {
            this.hitTarget(hitTarget);
        }
        
        // Shoot effect
        this.crosshairElement.classList.add('hit');
        setTimeout(() => {
            this.crosshairElement.classList.remove('hit');
        }, 100);
        
        // Sound effect (uncomment if audio files available)
        // document.getElementById('shootSound').play();
    }
    
    // Check if crosshair hits a target
    checkHit() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const hitRadius = 40;
        
        for (let target of this.targets) {
            const dx = centerX - target.screenX;
            const dy = centerY - target.screenY;
            if (Math.sqrt(dx*dx + dy*dy) < hitRadius) {
                return target;
            }
        }
        return null;
    }
    
    // Handle target hit
    hitTarget(target) {
        // Remove target
        this.targets = this.targets.filter(t => t !== target);
        
        // Increase score
        this.score += Math.floor(100 * this.difficulty);
        this.updateUI();
        
        // Hit effect
        this.createHitEffect(target.screenX, target.screenY);
    }
    
    // Create hit effect
    createHitEffect(x, y) {
        // Simple particle effect
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(i * Math.PI / 4);
                this.ctx.fillStyle = `rgba(255, 100, 100, ${0.5 - i*0.06})`;
                this.ctx.fillRect(0, -5, 10, 10);
                this.ctx.restore();
            }, i * 50);
        }
    }
    
    // Spawn target
    spawnTarget() {
        const distance = 300 + Math.random() * 400;
        const angle = Math.random() * Math.PI * 2;
        
        const target = {
            id: Date.now() + Math.random(),
            x: Math.cos(angle) * distance,
            y: (Math.sin(angle) + Math.random() * 0.5 - 0.25) * distance,
            z: 100 + Math.random() * 200,
            size: 25 + Math.random() * 15,
            color: `hsl(${30 + Math.random()*30}, 100%, 50%)`,
            screenX: 0,
            screenY: 0,
            lastMove: Date.now()
        };
        
        this.targets.push(target);
    }
    
    // Update target positions
    updateTargets() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let target of this.targets) {
            // Project 3D to 2D
            const fov = 500;
            const projX = (target.x / target.z) * fov;
            const projY = (target.y / target.z) * fov;
            
            target.screenX = centerX + projX * Math.cos(this.yaw) - projY * Math.sin(this.yaw);
            target.screenY = centerY + projY * Math.cos(this.yaw) + projX * Math.sin(this.yaw) + this.pitch * 100;
            
            // Remove targets too far or behind
            if (target.z > 1000 || target.screenX < -100 || target.screenX > this.canvas.width + 100 ||
                target.screenY < -100 || target.screenY > this.canvas.height + 100) {
                this.targets = this.targets.filter(t => t !== target);
                continue;
            }
            
            // Animate target movement
            if (Date.now() - target.lastMove > 2000 / this.difficulty) {
                target.x += (Math.random() - 0.5) * 50;
                target.y += (Math.random() - 0.5) * 50;
                target.z += (Math.random() - 0.5) * 30;
                target.lastMove = Date.now();
            }
        }
    }
    
    // Update game logic
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Spawn targets
        this.targetSpawnTimer += deltaTime;
        if (this.targetSpawnTimer > 1000 / this.difficulty) {
            this.spawnTarget();
            this.targetSpawnTimer = 0;
        }
        
        // Update targets
        this.updateTargets();
        
        // Increase difficulty
        this.difficulty = 1 + (30 - this.timeLeft) * 0.05;
        
        // Remove old targets
        this.targets = this.targets.filter(t => Date.now() - t.lastMove < 5000);
    }
    
    // Render game
    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw sky gradient
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width/2, this.canvas.height/2, 0,
            this.canvas.width/2, this.canvas.height/2, Math.max(this.canvas.width, this.canvas.height)
        );
        gradient.addColorStop(0, 'rgba(50, 50, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(10, 10, 30, 1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing') {
            // Draw targets
            for (let target of this.targets) {
                this.ctx.save();
                this.ctx.translate(target.screenX, target.screenY);
                this.ctx.shadowColor = target.color;
                this.ctx.shadowBlur = 20;
                
                // Target glow
                const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, target.size * 1.5);
                glowGradient.addColorStop(0, target.color + 'CC');
                glowGradient.addColorStop(0.7, target.color + '66');
                glowGradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, target.size * 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Target body
                const bodyGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, target.size);
                bodyGradient.addColorStop(0, target.color);
                bodyGradient.addColorStop(0.7, target.color + 'CC');
                bodyGradient.addColorStop(1, target.color + '66');
                this.ctx.fillStyle = bodyGradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, target.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Target ring
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 3;
                this.ctx.shadowBlur = 0;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, target.size, 0, Math.PI * 2);
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        }
    }
    
    // Update UI
    updateUI() {
        this.uiElements.score.textContent = this.score;
        this.uiElements.timer.textContent = Math.ceil(this.timeLeft);
    }
    
    // Start game
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.timeLeft = 30;
        this.pitch = 0;
        this.yaw = 0;
        this.targets = [];
        this.difficulty = 1;
        this.targetSpawnTimer = 0;
        
        // Hide instructions
        this.uiElements.instructions.classList.add('hidden');
        
        // Start timers
        this.updateUI();
        this.gameTimer = setInterval(() => {
            this.timeLeft -= 0.016;
            this.updateUI();
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 16);
    }
    
    // End game
    endGame() {
        this.gameState = 'gameOver';
        clearInterval(this.gameTimer);
        this.uiElements.finalScore.textContent = this.score;
        this.uiElements.gameOver.classList.remove('hidden');
        document.exitPointerLock();
    }
    
    // Restart game
    restartGame() {
        this.uiElements.gameOver.classList.add('hidden');
        this.uiElements.instructions.classList.remove('hidden');
        this.gameState = 'menu';
    }
    
    // Main game loop
    gameLoop() {
        const now = performance.now();
        if (!this.lastTime) this.lastTime = now;
        const deltaTime = now - this.lastTime;
        
        this.update(deltaTime / 1000);
        this.render();
        
        this.lastTime = now;
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new FPSGame();
});
