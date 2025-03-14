// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const highScoreElement = document.getElementById('highScore');

// Load images
const images = {
    spaceship: new Image(),
    bullet: new Image(),
    leftPet: new Image(),
    rightPet: new Image(),
    meteor: new Image()
};

// Âm thanh
const sounds = {
    gameStart: new Audio('sounds/gamestart.mp3'),
    shoot: new Audio('sounds/shoot.mp3'),
    explosion: new Audio('sounds/explosion.mp3'),
    powerUp: new Audio('sounds/powerup.mp3'),
    gameOver: new Audio('sounds/gameover.mp3')
};

// Thiết lập âm lượng
sounds.gameStart.volume = 0.4;
sounds.shoot.volume = 0.3;
sounds.explosion.volume = 0.4;
sounds.powerUp.volume = 0.4;
sounds.gameOver.volume = 0.5;

// Cho phép phát nhiều âm thanh cùng lúc
function playSound(sound) {
    // Clone âm thanh để có thể phát nhiều lần
    const soundClone = sound.cloneNode();
    soundClone.play().catch(error => console.log("Lỗi phát âm thanh:", error));
}

// Track loaded images
let loadedImages = 0;
const totalImages = Object.keys(images).length;

function startGame() {
    // Phát nhạc khi bắt đầu game
    playSound(sounds.gameStart);
    gameLoop();
}

// Load all images with error handling
images.spaceship.onload = () => { loadedImages++; checkAllImagesLoaded(); };
images.bullet.onload = () => { loadedImages++; checkAllImagesLoaded(); };
images.leftPet.onload = () => { loadedImages++; checkAllImagesLoaded(); };
images.rightPet.onload = () => { loadedImages++; checkAllImagesLoaded(); };
images.meteor.onload = () => { loadedImages++; checkAllImagesLoaded(); };

images.spaceship.onerror = handleImageError;
images.bullet.onerror = handleImageError;
images.leftPet.onerror = handleImageError;
images.rightPet.onerror = handleImageError;
images.meteor.onerror = handleImageError;

function handleImageError() {
    console.error('Failed to load image:', this.src);
}

function checkAllImagesLoaded() {
    if (loadedImages === totalImages) {
        console.log('All images loaded successfully');
        startGame();
    }
}

// Set image sources
images.spaceship.src = 'images/spaceship.png';
images.bullet.src = 'images/bullet.png';
images.leftPet.src = 'images/LP.png';
images.rightPet.src = 'images/RP.png';
images.meteor.src = 'images/meteor.png';

// Game constants
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const COLORS = {
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    RED: '#FF0000',
    BLUE: '#00FFFF',
    GREEN: '#00FF00',
    YELLOW: '#FFFF00',
    PURPLE: '#800080',
    CYAN: '#00FFFF',
    ORANGE: '#FFA500',
    LIGHT_BLUE: '#87CEEB',
    DARK_GRAY: '#404040',
    GRAY: '#808080'
};

// Stars setup
const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: Math.random() * 2,
    speed: Math.random() * 2 + 1
}));

// Game state
let gameState = {
    playerX: WIDTH / 2,
    playerWidth: 50,
    playerSpeed: 3,
    arrows: [],
    bubbles: [],
    powerUps: [],
    pets: [],
    score: 0,
    baseDamage: 1,
    permDamageMultiplier: 1,
    tempDamageMultiplier: 1,
    hp: 200,
    shotType: 1,
    shootTimer: 0,
    shootSpeed: 20,
    permShootSpeedMultiplier: 1,
    tempShootSpeedMultiplier: 1,
    speedBoostTimer: 0,
    damageTimer: 0,
    bubbleSpawnTime: 0,
    baseSpawnInterval: 120,
    baseBubbleSpeed: 1,
    highScore: loadHighScore(),
    gameOver: false,
    maxPets: 8,
    MAX_PERM_MULTIPLIER: 3,
    MAX_TEMP_MULTIPLIER: 5,
    MAX_BUBBLE_HITS: 199,
    PET_DROP_CHANCE: 10,
    explosions: [],
    gameOverSoundPlayed: false
};

// Classes
class Arrow {
    constructor(x, y, damage) {
        this.x = x;
        this.y = y;
        this.speed = 3;
        this.damage = damage;
        this.width = 10;
        this.height = 20;
    }

    move() {
        this.y -= this.speed;
    }

    draw() {
        ctx.drawImage(images.bullet, this.x - this.width/2, this.y, this.width, this.height);
    }
}

class Meteor {
    constructor(x, y, hits, speed) {
        this.x = x;
        this.y = y;
        this.hits = hits;
        this.initialHits = hits;  // Store initial hits
        this.baseRadius = 30;
        this.radius = Math.min(this.baseRadius + hits * 3, this.baseRadius * 2);
        this.speed = speed;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.width = this.radius * 2;
        this.height = this.radius * 2;
    }

    move() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw meteor image
        ctx.drawImage(images.meteor, 
            -this.width/2, -this.height/2, 
            this.width, this.height
        );

        ctx.restore();

        // Hit points text
        ctx.fillStyle = COLORS.RED;
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.max(0, this.hits), this.x, this.y);
    }

    explode() {
        // Phát âm thanh nổ
        playSound(sounds.explosion);
        gameState.explosions.push(new Explosion(this.x, this.y, this.radius));
        spawnPowerUpFromBubble(this.x, this.y);
        gameState.score += this.initialHits;
    }
}

class PowerUp {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = value;
        this.speed = 1;
        this.radius = 15;
    }

    move() {
        this.y += this.speed;
    }

    getColor() {
        if (this.type === 'shot') return COLORS.YELLOW;
        if (this.type === 'damage') {
            if (this.value <= 3) return COLORS.GREEN;
            return COLORS.RED;
        }
        if (this.type === 'perm_speed') return '#90EE90';
        if (this.type === 'temp_speed') return '#FF69B4';
        if (this.type === 'boom') return '#FF4500';
        return COLORS.PURPLE;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.getColor();
        ctx.fill();

        ctx.fillStyle = COLORS.BLACK;
        ctx.font = (this.type === 'perm_speed' || this.type === 'temp_speed' || this.type === 'boom') ? '12px Arial' : '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let displayText = this.type === 'pet' ? 'P' : 
                         this.type === 'boom' ? 'B' :
                         (this.type === 'perm_speed' || this.type === 'temp_speed') ? 
                         `${this.value}%` : 
                         this.value;
        ctx.fillText(displayText, this.x, this.y);
    }
}

class Pet {
    constructor(x, y, offset, isRight) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.offset = offset;
        this.isRight = isRight;
        this.shootTimer = 0;
    }

    move(playerX) {
        this.x = playerX + this.offset;
    }

    shoot() {
        gameState.arrows.push(new Arrow(this.x, this.y, 
            gameState.baseDamage * gameState.permDamageMultiplier * gameState.tempDamageMultiplier));
        this.shootTimer = 0;
    }

    draw() {
        const img = this.isRight ? images.rightPet : images.leftPet;
        ctx.drawImage(img, this.x - this.width/2, this.y, this.width, this.height);
    }
}

class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.particles = [];
        this.lifetime = 30;
        this.createParticles();
    }

    createParticles() {
        const numParticles = 15;
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const speed = Math.random() * 3 + 2;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 2,
                color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`
            });
        }
    }

    update() {
        this.lifetime--;
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.size *= 0.95;
        });
    }

    draw() {
        this.particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
        });
    }

    isDead() {
        return this.lifetime <= 0;
    }
}

// Game functions
function loadHighScore() {
    return parseInt(localStorage.getItem('highScore')) || 0;
}

function saveHighScore(score) {
    localStorage.setItem('highScore', score);
}

function resetGame() {
    gameState = {
        ...gameState,
        playerX: WIDTH / 2,
        playerWidth: 50,
        arrows: [],
        bubbles: [],
        powerUps: [],
        pets: [],
        explosions: [],
        score: 0,
        baseDamage: 1,
        permDamageMultiplier: 1,
        tempDamageMultiplier: 1,
        hp: 200,
        shotType: 1,
        shootTimer: 0,
        shootSpeed: 20,
        permShootSpeedMultiplier: 1,
        tempShootSpeedMultiplier: 1,
        speedBoostTimer: 0,
        damageTimer: 0,
        bubbleSpawnTime: 0,
        gameOver: false
    };
    gameOverScreen.style.display = 'none';
    // Phát nhạc khi bắt đầu game mới
    playSound(sounds.gameStart);
}

function spawnMeteor() {
    const x = Math.random() * (WIDTH - 100) + 50;
    let hits;

    if (gameState.score >= 100000) {
        const rand = Math.random() * 100;
        if (rand < 90) {  // Tăng tỷ lệ lên 90%
            hits = Math.floor(Math.random() * (gameState.MAX_BUBBLE_HITS - 30) + 30);
        } else if (rand < 95) {
            hits = Math.floor(Math.random() * 15 + 15);
        } else {
            hits = Math.floor(Math.random() * 14 + 1);
        }
    } else if (gameState.score >= 50000) {
        const rand = Math.random() * 100;
        if (rand < 80) {  // Tăng tỷ lệ lên 80%
            hits = Math.floor(Math.random() * (gameState.MAX_BUBBLE_HITS - 30) + 30);
        } else if (rand < 90) {
            hits = Math.floor(Math.random() * 15 + 15);
        } else {
            hits = Math.floor(Math.random() * 14 + 1);
        }
    } else if (gameState.score >= 20000) {
        const rand = Math.random() * 100;
        if (rand < 70) {
            hits = Math.floor(Math.random() * (gameState.MAX_BUBBLE_HITS - 30) + 30);
        } else if (rand < 90) {
            hits = Math.floor(Math.random() * 15 + 15);
        } else {
            hits = Math.floor(Math.random() * 14 + 1);
        }
    } else if (gameState.score >= 2000) {
        const rand = Math.random() * 100;
        if (rand < 60) {
            hits = Math.floor(Math.random() * (gameState.MAX_BUBBLE_HITS - 30) + 30);
        } else if (rand < 90) {
            hits = Math.floor(Math.random() * 15 + 15);
        } else {
            hits = Math.floor(Math.random() * 14 + 1);
        }
    } else if (gameState.score >= 500) {
        const rand = Math.random() * 100;
        if (rand < 50) {
            hits = Math.floor(Math.random() * (gameState.MAX_BUBBLE_HITS - 30) + 30);
        } else if (rand < 80) {
            hits = Math.floor(Math.random() * 15 + 15);
        } else {
            hits = Math.floor(Math.random() * 14 + 1);
        }
    } else if (gameState.score >= 100) {
        const rand = Math.random() * 100;
        if (rand < 30) {
            hits = Math.floor(Math.random() * 31 + 20);
        } else {
            hits = Math.floor(Math.random() * 19 + 1);
        }
    } else {
        const baseMaxHits = 5 + Math.floor(gameState.score / 30);
        hits = Math.floor(Math.random() * Math.min(baseMaxHits, gameState.MAX_BUBBLE_HITS) + 1);
    }

    const baseSpeed = 0.5 + Math.min(Math.floor(gameState.score / 200), 1);
    const speed = baseSpeed + (Math.random() - 0.5) * 0.3;
    
    gameState.bubbles.push(new Meteor(x, 0, hits, Math.max(speed, 0.3)));
}

function spawnPowerUpFromBubble(x, y) {
    if (Math.random() * 100 < gameState.PET_DROP_CHANCE) {
        gameState.powerUps.push(new PowerUp(x, y, 'pet', 1));
    }
}

function spawnPowerUp() {
    if (Math.random() * 100 < 15) {
        const x = Math.random() * (WIDTH - 100) + 50;
        const rand = Math.random() * 10 + 1;
        
        // Add boom power-up with low probability when score > 1000
        if (gameState.score >= 1000 && Math.random() < 0.15) {
            const boomValue = [-20, -30, -40, -50, -60, -70][Math.floor(Math.random() * 6)];
            gameState.powerUps.push(new PowerUp(x, 0, 'boom', boomValue));
            return;
        }
        
        if (rand <= 4) {
            const shotType = Math.random() * 100 < 90 ? 
                Math.floor(Math.random() * 4 + 2) : 
                Math.floor(Math.random() * 2 + 6);
            gameState.powerUps.push(new PowerUp(x, 0, 'shot', shotType));
        } else if (rand <= 7) {
            const damageMult = Math.floor(Math.random() * 4 + 2);
            gameState.powerUps.push(new PowerUp(x, 0, 'damage', damageMult));
        } else if (rand <= 9) {
            if (Math.random() < 0.4) {
                const speedBoost = [10, 20][Math.floor(Math.random() * 2)];
                gameState.powerUps.push(new PowerUp(x, 0, 'perm_speed', speedBoost));
            } else {
                const speedBoost = [30, 40, 50][Math.floor(Math.random() * 3)];
                gameState.powerUps.push(new PowerUp(x, 0, 'temp_speed', speedBoost));
            }
        } else {
            gameState.powerUps.push(new PowerUp(x, 0, 'pet', 1));
        }
    }
}

function shootArrows() {
    const damage = gameState.baseDamage * gameState.permDamageMultiplier * gameState.tempDamageMultiplier;
    
    // Phát âm thanh bắn
    playSound(sounds.shoot);
    
    switch(gameState.shotType) {
        case 1:
            gameState.arrows.push(new Arrow(gameState.playerX, HEIGHT - 50, damage));
            break;
        case 2:
            gameState.arrows.push(new Arrow(gameState.playerX - 20, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 20, HEIGHT - 50, damage));
            break;
        case 3:
            gameState.arrows.push(new Arrow(gameState.playerX - 20, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 20, HEIGHT - 50, damage));
            break;
        case 4:
            gameState.arrows.push(new Arrow(gameState.playerX - 30, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX - 10, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 10, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 30, HEIGHT - 50, damage));
            break;
        case 5:
            gameState.arrows.push(new Arrow(gameState.playerX - 40, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX - 20, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 20, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 40, HEIGHT - 50, damage));
            break;
        case 6:
            gameState.arrows.push(new Arrow(gameState.playerX - 50, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX - 30, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX - 10, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 10, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 30, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 50, HEIGHT - 50, damage));
            break;
        case 7:
            gameState.arrows.push(new Arrow(gameState.playerX - 60, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX - 40, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX - 20, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 20, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 40, HEIGHT - 50, damage));
            gameState.arrows.push(new Arrow(gameState.playerX + 60, HEIGHT - 50, damage));
            break;
    }
}

function drawStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > HEIGHT) {
            star.y = 0;
            star.x = Math.random() * WIDTH;
        }
        ctx.fillStyle = COLORS.WHITE;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function gameLoop() {
    if (gameState.gameOver) {
        // Phát âm thanh game over
        if (!gameState.gameOverSoundPlayed) {
            playSound(sounds.gameOver);
            gameState.gameOverSoundPlayed = true;
        }
        return;
    }

    // Clear canvas
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw stars
    drawStars();

    // Player movement (chỉ sử dụng mũi tên)
    if (keys.ArrowLeft) {
        gameState.playerX = Math.max(gameState.playerWidth / 2, gameState.playerX - gameState.playerSpeed);
    }
    if (keys.ArrowRight) {
        gameState.playerX = Math.min(WIDTH - gameState.playerWidth / 2, gameState.playerX + gameState.playerSpeed);
    }

    // Auto shoot
    gameState.shootTimer++;
    const totalSpeedMultiplier = gameState.permShootSpeedMultiplier * gameState.tempShootSpeedMultiplier;
    const adjustedShootTimer = Math.floor(20 / totalSpeedMultiplier);
    if (gameState.shootTimer >= adjustedShootTimer) {
        shootArrows();
        gameState.pets.forEach(pet => pet.shoot());
        gameState.shootTimer = 0;
    }

    // Update pets
    gameState.pets.forEach(pet => pet.move(gameState.playerX));

    // Update damage timer
    if (gameState.damageTimer > 0) {
        gameState.damageTimer--;
        if (gameState.damageTimer === 0) {
            gameState.tempDamageMultiplier = 1;
        }
    }

    // Spawn meteors and power-ups
    gameState.bubbleSpawnTime++;
    const spawnInterval = Math.max(30, gameState.baseSpawnInterval - Math.floor(gameState.score / 20));
    if (gameState.bubbleSpawnTime > spawnInterval) {
        spawnMeteor();
        spawnPowerUp();
        gameState.bubbleSpawnTime = 0;
    }

    // Update arrows
    gameState.arrows = gameState.arrows.filter(arrow => {
        arrow.move();
        return arrow.y > 0;
    });

    // Update meteors
    gameState.bubbles = gameState.bubbles.filter(meteor => {
        meteor.move();
        if (meteor.y > HEIGHT) {
            gameState.hp -= Math.abs(meteor.hits);
            if (gameState.hp <= 0) {
                gameState.gameOver = true;
                gameState.gameOverSoundPlayed = false;  // Reset trạng thái âm thanh game over
                if (gameState.score > gameState.highScore) {
                    gameState.highScore = gameState.score;
                    saveHighScore(gameState.highScore);
                }
            }
            return false;
        }

        // Check collision with arrows
        for (let i = gameState.arrows.length - 1; i >= 0; i--) {
            const arrow = gameState.arrows[i];
            const dx = meteor.x - arrow.x;
            const dy = meteor.y - arrow.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < meteor.radius + arrow.width / 2) {
                meteor.hits -= arrow.damage;
                gameState.arrows.splice(i, 1);
                gameState.explosions.push(new Explosion(arrow.x, arrow.y, 10));
                if (meteor.hits <= 0) {
                    meteor.explode();
                    return false;
                }
            }
        }
        return true;
    });

    // Update power-ups
    const playerRect = {
        x: gameState.playerX - gameState.playerWidth / 2,
        y: HEIGHT - 50,
        width: gameState.playerWidth,
        height: 20
    };

    gameState.powerUps = gameState.powerUps.filter(powerUp => {
        powerUp.move();
        if (powerUp.y > HEIGHT) return false;

        const dx = powerUp.x - (playerRect.x + playerRect.width / 2);
        const dy = powerUp.y - (playerRect.y + playerRect.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < powerUp.radius + playerRect.width / 2) {
            // Phát âm thanh khi nhặt power-up
            playSound(sounds.powerUp);
            
            if (powerUp.type === 'boom') {
                // Apply damage to all meteors
                gameState.bubbles.forEach(meteor => {
                    meteor.hits += powerUp.value; // Subtract points from all meteors
                    if (meteor.hits <= 0) {
                        gameState.explosions.push(new Explosion(meteor.x, meteor.y, meteor.radius));
                        spawnPowerUpFromBubble(meteor.x, meteor.y);
                        gameState.score += meteor.initialHits;
                    }
                });
                // Create explosions across the screen
                for(let i = 0; i < 5; i++) {
                    const randX = Math.random() * WIDTH;
                    const randY = Math.random() * (HEIGHT - 200);
                    gameState.explosions.push(new Explosion(randX, randY, 30));
                }
            } else if (powerUp.type === 'shot') {
                if (powerUp.value > gameState.shotType) {
                    gameState.shotType = powerUp.value;
                    gameState.playerWidth += 10;
                }
            } else if (powerUp.type === 'damage') {
                if (powerUp.value <= 3) {
                    gameState.permDamageMultiplier = Math.min(
                        gameState.permDamageMultiplier * powerUp.value,
                        gameState.MAX_PERM_MULTIPLIER
                    );
                } else {
                    gameState.tempDamageMultiplier = Math.min(
                        powerUp.value,
                        gameState.MAX_TEMP_MULTIPLIER
                    );
                    gameState.damageTimer = 1800;
                }
            } else if (powerUp.type === 'perm_speed') {
                const newSpeed = 1 + (powerUp.value / 100);
                if (newSpeed > gameState.permShootSpeedMultiplier) {
                    gameState.permShootSpeedMultiplier = newSpeed;
                }
            } else if (powerUp.type === 'temp_speed') {
                const newSpeed = 1 + (powerUp.value / 100);
                if (newSpeed > gameState.tempShootSpeedMultiplier) {
                    gameState.tempShootSpeedMultiplier = newSpeed;
                    gameState.speedBoostTimer = 1800;
                }
            } else if (powerUp.type === 'pet' && gameState.pets.length < gameState.maxPets) {
                const isRight = gameState.pets.length % 2 === 0;
                const pairIndex = Math.floor(gameState.pets.length / 2);
                const offset = 60 * (isRight ? 1 : -1) * (pairIndex + 1);
                const pet = new Pet(gameState.playerX, HEIGHT - 70, offset, isRight);
                gameState.pets.push(pet);
            }
            return false;
        }
        return true;
    });

    // Draw everything
    drawPlayer();
    gameState.arrows.forEach(arrow => arrow.draw());
    gameState.bubbles.forEach(meteor => meteor.draw());
    gameState.powerUps.forEach(powerUp => powerUp.draw());
    gameState.pets.forEach(pet => pet.draw());
    drawUI();

    // Update and draw explosions
    gameState.explosions = gameState.explosions.filter(explosion => {
        explosion.update();
        explosion.draw();
        return !explosion.isDead();
    });

    // Check game over
    if (gameState.gameOver) {
        gameOverScreen.style.display = 'block';
        finalScoreElement.textContent = gameState.score;
        highScoreElement.textContent = gameState.highScore;
    }

    // Update speed boost timer
    if (gameState.speedBoostTimer > 0) {
        gameState.speedBoostTimer--;
        if (gameState.speedBoostTimer === 0) {
            gameState.tempShootSpeedMultiplier = 1;
        }
    }

    requestAnimationFrame(gameLoop);
}

function drawPlayer() {
    const baseWidth = 80 + (gameState.shotType - 1) * 10;
    const baseHeight = 80 + (gameState.shotType - 1) * 5;
    
    // Draw spaceship
    ctx.drawImage(images.spaceship, 
        gameState.playerX - baseWidth/2, 
        HEIGHT - 90, 
        baseWidth, 
        baseHeight
    );

    // Draw barrels based on shot type
    const barrelSpacing = baseWidth / (gameState.shotType + 1);
    for (let i = 0; i < gameState.shotType; i++) {
        const x = gameState.playerX - baseWidth/2 + barrelSpacing * (i + 1);
        
        // Draw barrel glow
        const gradient = ctx.createRadialGradient(x, HEIGHT - 120, 2, x, HEIGHT - 120, 10);
        gradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, HEIGHT - 120, 10, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawUI() {
    // Score ở giữa trên cùng
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${gameState.score}`, WIDTH/2, 40);
    
    // Thông số bên trái
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.GREEN;
    ctx.fillText(`High score: ${gameState.highScore}`, 10, 70);
    
    // HP với màu động
    if (gameState.hp > 100) {
        ctx.fillStyle = COLORS.GREEN;
    } else if (gameState.hp > 50) {
        ctx.fillStyle = COLORS.YELLOW;
    } else {
        ctx.fillStyle = COLORS.RED;
    }
    ctx.fillText(`HP: ${gameState.hp}`, 10, 100);
    
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillText(`Damage: ${gameState.baseDamage}x${gameState.permDamageMultiplier}x${gameState.tempDamageMultiplier}`, 10, 130);
    ctx.fillText(`Shots: ${gameState.shotType}`, 10, 160);

    // Thông số bên phải
    ctx.textAlign = 'right';
    const permSpeedBoost = Math.floor((gameState.permShootSpeedMultiplier - 1) * 100);
    const tempSpeedBoost = Math.floor((gameState.tempShootSpeedMultiplier - 1) * 100);
    ctx.fillText(`Speed: ${permSpeedBoost}%${tempSpeedBoost > 0 ? ` + ${tempSpeedBoost}%` : ''}`, WIDTH - 10, 70);
    
    ctx.fillText(`Pets: ${gameState.pets.length}/${gameState.maxPets}`, WIDTH - 10, 100);
    
    if (gameState.damageTimer > 0) {
        ctx.fillStyle = COLORS.BLUE;
        ctx.fillText(`Boost time: ${Math.floor(gameState.damageTimer / 60)}s`, WIDTH - 10, 130);
    }
    
    if (gameState.speedBoostTimer > 0) {
        ctx.fillStyle = '#FF69B4';
        ctx.fillText(`Speed boost: ${Math.floor(gameState.speedBoostTimer / 60)}s`, WIDTH - 10, 160);
    }
}

// Input handling
const keys = {};
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keys[e.key] = true;
    }
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keys[e.key] = false;
    }
});

// Mobile controls
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

// Touch events for left button
leftButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys.ArrowLeft = true;
});
leftButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.ArrowLeft = false;
});

// Touch events for right button
rightButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys.ArrowRight = true;
});
rightButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.ArrowRight = false;
});

// Mouse events for testing on desktop
leftButton.addEventListener('mousedown', () => keys.ArrowLeft = true);
leftButton.addEventListener('mouseup', () => keys.ArrowLeft = false);
leftButton.addEventListener('mouseleave', () => keys.ArrowLeft = false);

rightButton.addEventListener('mousedown', () => keys.ArrowRight = true);
rightButton.addEventListener('mouseup', () => keys.ArrowRight = false);
rightButton.addEventListener('mouseleave', () => keys.ArrowRight = false);

// Add event listener for Play Again button
document.getElementById('playAgainButton').addEventListener('click', () => {
    resetGame();
    gameLoop();
});

// Function to capture game over area
function captureGameOver() {
    const gameOverArea = document.createElement('canvas');
    gameOverArea.width = 400;
    gameOverArea.height = 200;
    const ctx = gameOverArea.getContext('2d');
    
    // Draw black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, gameOverArea.width, gameOverArea.height);
    
    // Draw GAME OVER text
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', gameOverArea.width/2, 60);
    
    // Draw Score with larger font
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(gameState.score, gameOverArea.width/2, 100);
    
    // Draw High Score with smaller font
    ctx.font = '20px Arial';
    ctx.fillText(`high score: ${gameState.highScore}`, gameOverArea.width/2, 140);
    
    return gameOverArea.toDataURL();
}

function shareToFacebook() {
    const text = encodeURIComponent(`I achieved ${gameState.score} points in Meteor Shooter game, how about you? Let's play Meteor Shooter game together!\n\nhttps://meteor-shooter.vercel.app/\nA web-based shooting game where you shoot meteors and collect power-ups.`);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=https://meteor-shooter.vercel.app/&quote=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareToX() {
    const text = encodeURIComponent(`I achieved ${gameState.score} points in Meteor Shooter game, how about you? Let's play Meteor Shooter game together!\n\nhttps://meteor-shooter.vercel.app/\nA web-based shooting game where you shoot meteors and collect power-ups.`);
    const shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareToTelegram() {
    const text = encodeURIComponent(`I achieved ${gameState.score} points in Meteor Shooter game, how about you? Let's play Meteor Shooter game together!\n\nhttps://meteor-shooter.vercel.app/\nA web-based shooting game where you shoot meteors and collect power-ups.`);
    const shareUrl = `https://t.me/share/url?url=https://meteor-shooter.vercel.app/&text=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

// Add event listeners for share buttons
document.getElementById('shareToFB').addEventListener('click', shareToFacebook);
document.getElementById('shareToX').addEventListener('click', shareToX);
document.getElementById('shareToTelegram').addEventListener('click', shareToTelegram);

// Start game
gameLoop(); 
