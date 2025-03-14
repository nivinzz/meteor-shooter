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
    playerSpeed: 5,
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
    explosions: []
};

// Classes
class Arrow {
    constructor(x, y, damage) {
        this.x = x;
        this.y = y;
        this.speed = 10;
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
        ctx.fillText(this.hits, this.x, this.y);
    }
}

class PowerUp {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = value;
        this.speed = 3;
        this.radius = 15;
    }

    move() {
        this.y += this.speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.getColor();
        ctx.fill();

        ctx.fillStyle = COLORS.BLACK;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'pet' ? 'P' : this.value, this.x, this.y);
    }

    getColor() {
        if (this.type === 'shot') return COLORS.YELLOW;
        if (this.type === 'damage') {
            if (this.value <= 3) return COLORS.GREEN;
            return COLORS.RED;
        }
        return COLORS.PURPLE;
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
        damageTimer: 0,
        bubbleSpawnTime: 0,
        gameOver: false
    };
    gameOverScreen.style.display = 'none';
}

function spawnMeteor() {
    const x = Math.random() * (WIDTH - 100) + 50;
    let hits;

    if (gameState.score >= 500) {
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

    const baseSpeed = gameState.baseBubbleSpeed + Math.min(Math.floor(gameState.score / 50), 5);
    const speed = baseSpeed + (Math.random() - 0.5);
    
    gameState.bubbles.push(new Meteor(x, 0, hits, Math.max(speed, 0.8)));
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
        
        if (rand <= 5) {
            const shotType = Math.random() * 100 < 90 ? 
                Math.floor(Math.random() * 4 + 2) : 
                Math.floor(Math.random() * 2 + 6);
            gameState.powerUps.push(new PowerUp(x, 0, 'shot', shotType));
        } else if (rand <= 9) {
            const damageMult = Math.floor(Math.random() * 4 + 2);
            gameState.powerUps.push(new PowerUp(x, 0, 'damage', damageMult));
        } else {
            gameState.powerUps.push(new PowerUp(x, 0, 'pet', 1));
        }
    }
}

function shootArrows() {
    const damage = gameState.baseDamage * gameState.permDamageMultiplier * gameState.tempDamageMultiplier;
    
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
    if (gameState.gameOver) return;

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
    if (gameState.shootTimer >= 20) {
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
            gameState.hp -= meteor.hits;
            if (gameState.hp <= 0) {
                gameState.gameOver = true;
                if (gameState.score > gameState.highScore) {
                    gameState.highScore = gameState.score;
                    saveHighScore(gameState.highScore);
                }
                return false;
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
                    gameState.explosions.push(new Explosion(meteor.x, meteor.y, meteor.radius));
                    spawnPowerUpFromBubble(meteor.x, meteor.y);
                    gameState.score += 10;
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
            if (powerUp.type === 'shot') {
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
            } else if (powerUp.type === 'pet' && gameState.pets.length < gameState.maxPets) {
                const isRight = gameState.pets.length % 2 === 0;
                const offset = 60 * (isRight ? 1 : -1) * (Math.floor(gameState.pets.length / 2) + 1);
                gameState.pets.push(new Pet(gameState.playerX, HEIGHT - 70, offset, isRight));
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
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${gameState.score}`, 10, 10);
    ctx.fillStyle = COLORS.GREEN;
    ctx.fillText(`HIGH SCORE: ${gameState.highScore}`, 10, 30);
    
    // Thay đổi màu HP dựa theo mức độ
    if (gameState.hp > 100) {
        ctx.fillStyle = COLORS.GREEN;
    } else if (gameState.hp > 50) {
        ctx.fillStyle = COLORS.YELLOW;
    } else {
        ctx.fillStyle = COLORS.RED;
    }
    ctx.fillText(`HP: ${gameState.hp}`, 10, 50);
    
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillText(`Damage: ${gameState.baseDamage}x${gameState.permDamageMultiplier}x${gameState.tempDamageMultiplier}`, 10, 70);
    ctx.fillText(`Shots: ${gameState.shotType}`, 10, 90);
    ctx.fillText(`Pets: ${gameState.pets.length}/${gameState.maxPets}`, 10, 110);
    if (gameState.damageTimer > 0) {
        ctx.fillStyle = COLORS.BLUE;
        ctx.fillText(`Boost Time: ${Math.floor(gameState.damageTimer / 60)}s`, 10, 130);
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

// Add event listener for Play Again button
document.getElementById('playAgainButton').addEventListener('click', () => {
    resetGame();
    gameLoop();
});

// Start game
gameLoop(); 
