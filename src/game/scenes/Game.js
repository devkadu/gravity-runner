import { EventBus } from "../EventBus";
import { Scene } from "phaser";

// Constantes das órbitas
const ORBITS = {
    INNER: 80,
    MIDDLE: 140,
    OUTER: 200,
};

// Órbita de referência para velocidade constante (usamos INNER como base)
const BASE_ORBIT = ORBITS.INNER;

export class Game extends Scene {
    constructor() {
        super("Game");
        this.pilotData = null;
        this.currentOrbit = "MIDDLE";
        this.orbitRadius = ORBITS.MIDDLE;
        this.targetOrbitRadius = ORBITS.MIDDLE;
        this.angle = 0;

        // Grupos de objetos
        this.meteors = null;
        this.collectibles = null;

        // Estado do jogo
        this.fuel = 100;
        this.score = 0;
        this.isGameOver = false;
    }

    create() {
        // Reset do estado
        this.fuel = 100;
        this.mineral = 0;
        this.maxMineral = 7; // Primeira missão: coletar 7 minerais
        this.isGameOver = false;
        this.missionComplete = false;
        this.currentOrbit = "MIDDLE";
        this.orbitRadius = ORBITS.MIDDLE;
        this.targetOrbitRadius = ORBITS.MIDDLE;
        this.orbitCooldown = false;

        // Centro dinâmico baseado no tamanho da tela
        this.centerX = this.scale.width / 2;
        this.centerY = this.scale.height / 2;

        // Listener para redimensionamento
        this.scale.on("resize", this.handleResize, this);

        // 1. Fundo estrelado
        this.createStarfield();

        // 2. Cria as órbitas visuais (guias)
        this.createOrbitGuides();

        // 3. Cria o Planeta Yotur 5 no centro
        this.createPlanet();

        // 4. Grupos para meteoros, minerais e estrelas de combustível
        this.meteors = this.add.group();
        this.collectibles = this.add.group();
        this.fuelStars = this.add.group();

        // 4.1 Spawner de estrelas de combustível (dinâmico)
        this.time.addEvent({
            delay: 3000,
            callback: this.spawnFuelStar,
            callbackScope: this,
            loop: true,
        });
        // Spawn inicial
        this.spawnFuelStar();

        // 5. HUD
        this.createHUD();

        // 6. Input - Clique/Toque para mudar órbita
        this.input.on("pointerdown", (pointer, currentlyOver) => {
            if (this.isGameOver) return;
            if (currentlyOver && currentlyOver.length) return;
            this.changeOrbit(pointer);
        });

        // 7. Teclas alternativas (A/D ou setas)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.A
        );
        this.keyD = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.D
        );

        // 8. Spawners
        this.time.addEvent({
            delay: 5000,
            callback: this.spawnMeteor,
            callbackScope: this,
            loop: true,
        });

        this.time.addEvent({
            delay: 2500,
            callback: this.spawnMineral,
            callbackScope: this,
            loop: true,
        });

        // 9. Consumo de combustível
        this.time.addEvent({
            delay: 100,
            callback: this.consumeFuel,
            callbackScope: this,
            loop: true,
        });

        // 10. PRIMEIRO registra o listener para receber os dados do piloto
        EventBus.on("send-pilot-data", (pilot) => {
            console.log("Game.js recebeu pilot data:", pilot);
            this.setupPlayer(pilot);
        });

        // 11. DEPOIS avisa o React que está pronto (React vai responder com send-pilot-data)
        EventBus.emit("current-scene-ready", this);
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;

        this.centerX = width / 2;
        this.centerY = height / 2;

        // Reposiciona planeta
        if (this.planetContainer) {
            this.planetContainer.setPosition(this.centerX, this.centerY);
        }

        // Redesenha órbitas
        if (this.orbitGraphics) {
            this.drawOrbitGuides();
        }

        // Reposiciona HUD
        if (this.mineralBar) {
            this.mineralBarBg.setPosition(width - 100, 30);
            this.mineralBar.x = width - 176;
            this.mineralLabel.setPosition(width - 26, 50);
            this.orbitText.setPosition(this.centerX, height - 38);
        }

        // Reposiciona botões
        const btnY = height - 120;
        if (this.btnLeft) {
            this.btnLeft.setPosition(80, btnY);
            this.arrowLeft.setPosition(80, btnY);
            this.btnRight.setPosition(width - 80, btnY);
            this.arrowRight.setPosition(width - 80, btnY);
            this.innerLabel.setPosition(80, btnY + 50);
            this.outerLabel.setPosition(width - 80, btnY + 50);
        }

        if (this.fsBtn) {
            this.fsBtn.setPosition(width - 26, height - 38);
        }
    }

    createStarfield() {
        const width = this.scale.width;
        const height = this.scale.height;

        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Phaser.Math.Between(1, 2);
            const alpha = Phaser.Math.FloatBetween(0.3, 0.8);

            const star = this.add.circle(x, y, size, 0xffffff, alpha);

            // Algumas estrelas piscam
            if (Math.random() > 0.7) {
                this.tweens.add({
                    targets: star,
                    alpha: 0.2,
                    duration: Phaser.Math.Between(1000, 3000),
                    yoyo: true,
                    loop: -1,
                });
            }
        }
    }

    createOrbitGuides() {
        // Órbitas como círculos (brancas, mais visíveis)
        this.orbitGraphics = this.add.graphics();
        this.drawOrbitGuides();
    }

    drawOrbitGuides() {
        this.orbitGraphics.clear();

        this.orbitGraphics.lineStyle(1, 0xffffff, 0.15);
        this.orbitGraphics.strokeCircle(this.centerX, this.centerY, ORBITS.INNER);

        this.orbitGraphics.lineStyle(1, 0xffffff, 0.2);
        this.orbitGraphics.strokeCircle(this.centerX, this.centerY, ORBITS.MIDDLE);

        this.orbitGraphics.lineStyle(1, 0xffffff, 0.15);
        this.orbitGraphics.strokeCircle(this.centerX, this.centerY, ORBITS.OUTER);
    }

    spawnFuelStar() {
        if (this.isGameOver || !this.pilotData) return;

        // Escolhe órbita e posição aleatória
        const orbitKeys = Object.keys(ORBITS);
        const randomOrbit = orbitKeys[Phaser.Math.Between(0, orbitKeys.length - 1)];
        const radius = ORBITS[randomOrbit];
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;

        const star = this.add.star(x, y, 5, 4, 8, 0xffff00);
        star.setAlpha(0.8);
        star.orbitRadius = radius;
        star.angle = angle;
        star.fuelValue = 8; // Cada estrela dá 8 de combustível

        // Efeito de brilho suave
        this.tweens.add({
            targets: star,
            alpha: 0.4,
            scale: 0.8,
            duration: 500,
            yoyo: true,
            loop: -1,
        });

        this.fuelStars.add(star);

        // Remove após 5 segundos
        this.time.delayedCall(5000, () => {
            if (star && star.active) {
                // Efeito de fade out antes de destruir
                this.tweens.add({
                    targets: star,
                    alpha: 0,
                    scale: 0,
                    duration: 300,
                    onComplete: () => star.destroy(),
                });
            }
        });
    }

    createPlanet() {
        // Container para agrupar os elementos do planeta
        this.planetContainer = this.add.container(this.centerX, this.centerY);

        // Imagem do planeta com escala uniforme
        this.planet = this.add.image(0, 0, 'planet');
        // Calcula escala para que o maior lado fique com ~100px
        const maxDimension = Math.max(this.planet.width, this.planet.height);
        const targetSize = 100;
        const uniformScale = targetSize / maxDimension;
        this.planet.setScale(uniformScale);

        this.planetContainer.add([this.planet]);
    }

    createHUD() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Barra de combustível (esquerda)
        this.fuelBarBg = this.add.rectangle(100, 30, 150, 20, 0x333333);
        this.fuelBar = this.add.rectangle(100, 30, 150, 16, 0xff6a00);
        this.fuelBar.setOrigin(0, 0.5);
        this.fuelBar.x = 26;

        this.fuelLabel = this.add.text(26, 50, "FUEL", {
            fontSize: "12px",
            color: "#666",
            fontFamily: "monospace",
        });

        // Barra de mineral (direita)
        this.mineralBarBg = this.add.rectangle(width - 100, 30, 150, 20, 0x333333);
        this.mineralBar = this.add.rectangle(width - 100, 30, 150, 16, 0x0066ff);
        this.mineralBar.setOrigin(0, 0.5);
        this.mineralBar.x = width - 176;
        this.mineralBar.scaleX = 0; // Começa vazia

        this.mineralLabel = this.add
            .text(width - 26, 50, "MINERAL", {
                fontSize: "12px",
                color: "#666",
                fontFamily: "monospace",
            })
            .setOrigin(1, 0);

        // Indicador de órbita
        this.orbitText = this.add
            .text(this.centerX, height - 38, "ÓRBITA: MÉDIA", {
                fontSize: "14px",
                color: "#555",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        // Botões touch para mobile
        this.createTouchControls();
    }

    createTouchControls() {
        const width = this.scale.width;
        const height = this.scale.height;
        const btnY = height - 120;

        // Botão esquerda (aproximar do planeta)
        this.btnLeft = this.add.circle(80, btnY, 40, 0x333333, 0.6);
        this.btnLeft.setStrokeStyle(2, 0xff6a00, 0.5);
        this.btnLeft.setInteractive();

        this.arrowLeft = this.add.triangle(
            80,
            btnY,
            15,
            0,
            0,
            12,
            15,
            24,
            0xff6a00
        );
        this.arrowLeft.setAngle(-90);

        this.btnLeft.on("pointerdown", () => {
            if (this.isGameOver) return;
            this.moveToInnerOrbit();
            this.btnLeft.setFillStyle(0x555555, 0.8);
        });
        this.btnLeft.on("pointerup", () => this.btnLeft.setFillStyle(0x333333, 0.6));
        this.btnLeft.on("pointerout", () => this.btnLeft.setFillStyle(0x333333, 0.6));

        // Botão direita (afastar do planeta)
        this.btnRight = this.add.circle(width - 80, btnY, 40, 0x333333, 0.6);
        this.btnRight.setStrokeStyle(2, 0xff6a00, 0.5);
        this.btnRight.setInteractive();

        this.arrowRight = this.add.triangle(
            width - 80,
            btnY,
            15,
            0,
            0,
            12,
            15,
            24,
            0xff6a00
        );
        this.arrowRight.setAngle(90);

        this.btnRight.on("pointerdown", () => {
            if (this.isGameOver) return;
            this.moveToOuterOrbit();
            this.btnRight.setFillStyle(0x555555, 0.8);
        });
        this.btnRight.on("pointerup", () => this.btnRight.setFillStyle(0x333333, 0.6));
        this.btnRight.on("pointerout", () => this.btnRight.setFillStyle(0x333333, 0.6));

        // Labels dos botões
        this.innerLabel = this.add
            .text(80, btnY + 50, "INNER", {
                fontSize: "10px",
                color: "#555",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        this.outerLabel = this.add
            .text(width - 80, btnY + 50, "OUTER", {
                fontSize: "10px",
                color: "#555",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        // Botão fullscreen
        this.createFullscreenButton();
    }

    createFullscreenButton() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Criamos um ícone ou texto discreto no canto
        this.fsBtn = this.add
            .text(width - 26, height - 38, "⛶ FULLSCREEN", {
                fontSize: "14px",
                color: "#444",
                fontFamily: "monospace",
            })
            .setOrigin(1, 0.5)
            .setInteractive();

        this.fsBtn.on("pointerdown", () => {
            if (!this.scale.isFullscreen) {
                this.scale.startFullscreen();
            } else {
                this.scale.stopFullscreen();
            }
        });

        // Feedback visual quando mudar
        this.scale.on("fullscreenchange", () => {
            if (this.scale.isFullscreen) {
                this.fsBtn.setText("✖ EXIT FULLSCREEN");
                this.fsBtn.setColor("#ff0000");
            } else {
                this.fsBtn.setText("⛶ FULLSCREEN");
                this.fsBtn.setColor("#444");
            }
        });
    }

    moveToInnerOrbit() {
        // Evita múltiplos cliques rápidos
        if (this.orbitCooldown) return;

        if (this.currentOrbit === "OUTER") {
            this.targetOrbitRadius = ORBITS.MIDDLE;
            this.currentOrbit = "MIDDLE";
            this.orbitText.setText("ÓRBITA: MÉDIA");
            this.startOrbitCooldown();
        } else if (this.currentOrbit === "MIDDLE") {
            this.targetOrbitRadius = ORBITS.INNER;
            this.currentOrbit = "INNER";
            this.orbitText.setText("ÓRBITA: INTERNA");
            this.startOrbitCooldown();
        }
    }

    moveToOuterOrbit() {
        // Evita múltiplos cliques rápidos
        if (this.orbitCooldown) return;

        if (this.currentOrbit === "INNER") {
            this.targetOrbitRadius = ORBITS.MIDDLE;
            this.currentOrbit = "MIDDLE";
            this.orbitText.setText("ÓRBITA: MÉDIA");
            this.startOrbitCooldown();
        } else if (this.currentOrbit === "MIDDLE") {
            this.targetOrbitRadius = ORBITS.OUTER;
            this.currentOrbit = "OUTER";
            this.orbitText.setText("ÓRBITA: EXTERNA");
            this.startOrbitCooldown();
        }
    }

    startOrbitCooldown() {
        this.orbitCooldown = true;
        this.time.delayedCall(300, () => {
            this.orbitCooldown = false;
        });
    }

    setupPlayer(pilot) {
        this.pilotData = pilot;

        // Inicializa combustível baseado no piloto
        this.fuel = pilot.fuelMax;
        this.maxFuel = pilot.fuelMax;

        // Cor da nave
        const shipColor = parseInt(pilot.color.replace("#", "0x"));

        // Cria a nave (triângulo) - posição inicial na órbita média
        const startX = this.centerX + Math.cos(this.angle) * this.orbitRadius;
        const startY = this.centerY + Math.sin(this.angle) * this.orbitRadius;

        this.ship = this.add.triangle(
            startX,
            startY,
            0,
            20,
            40,
            20,
            20,
            0,
            shipColor
        );
        this.ship.setStrokeStyle(2, 0xffffff, 0.5);

        // Trail simples usando círculos (sem depender de textura)
        this.trailPositions = [];
        this.trailGraphics = this.add.graphics();

        // Velocidade baseada na agilidade
        this.rotationSpeed = pilot.orbitSpeed;

        console.log(`Piloto ${pilot.pilot} iniciado com nave ${pilot.ship}`);
    }

    changeOrbit(pointer) {
        // Calcula distância do clique ao centro
        const distance = Phaser.Math.Distance.Between(
            pointer.x,
            pointer.y,
            this.centerX,
            this.centerY
        );

        const orbitOrder = ["INNER", "MIDDLE", "OUTER"];
        const targetOrbit =
            distance < 110 ? "INNER" : distance < 170 ? "MIDDLE" : "OUTER";
        const currentIndex = orbitOrder.indexOf(this.currentOrbit);
        const targetIndex = orbitOrder.indexOf(targetOrbit);

        if (targetIndex < currentIndex) {
            this.moveToInnerOrbit();
        } else if (targetIndex > currentIndex) {
            this.moveToOuterOrbit();
        }
    }

    spawnMeteor() {
        if (this.isGameOver || !this.pilotData) return;

        // Meteoros só aparecem nas órbitas MIDDLE e OUTER (INNER é safe zone)
        const dangerOrbits = ["MIDDLE", "OUTER"];
        const randomOrbit =
            dangerOrbits[Phaser.Math.Between(0, dangerOrbits.length - 1)];
        const radius = ORBITS[randomOrbit];

        // Posição inicial aleatória na órbita
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;

        // Cria o meteoro
        const meteor = this.add.circle(
            x,
            y,
            Phaser.Math.Between(8, 15),
            0x8b4513
        );
        meteor.setStrokeStyle(2, 0x555555);
        meteor.orbitRadius = radius;
        meteor.angle = angle;
        meteor.speed = Phaser.Math.FloatBetween(0.01, 0.025);
        meteor.direction = Math.random() > 0.5 ? 1 : -1; // Direção aleatória

        this.meteors.add(meteor);

        // Remove após 15 segundos
        this.time.delayedCall(15000, () => {
            if (meteor && meteor.active) {
                meteor.destroy();
            }
        });
    }

    spawnMineral() {
        if (this.isGameOver || this.missionComplete || !this.pilotData) return;

        // Escolhe órbita e posição
        const orbitKeys = Object.keys(ORBITS);
        const randomOrbit =
            orbitKeys[Phaser.Math.Between(0, orbitKeys.length - 1)];
        const radius = ORBITS[randomOrbit];
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;

        // Mineral é um quadrado azul
        const mineral = this.add.rectangle(x, y, 15, 15, 0x0066ff);
        mineral.setStrokeStyle(2, 0x00aaff);
        mineral.orbitRadius = radius;
        mineral.angle = angle;
        mineral.value = 1; // Cada mineral vale 1 unidade

        // Efeito de brilho
        this.tweens.add({
            targets: mineral,
            scale: 1.3,
            alpha: 0.7,
            duration: 500,
            yoyo: true,
            loop: -1,
        });

        this.collectibles.add(mineral);

        // Remove após 5 segundos
        this.time.delayedCall(5000, () => {
            if (mineral && mineral.active) {
                // Efeito de fade out antes de destruir
                this.tweens.add({
                    targets: mineral,
                    alpha: 0,
                    scale: 0,
                    duration: 300,
                    onComplete: () => mineral.destroy(),
                });
            }
        });
    }

    consumeFuel() {
        if (this.isGameOver || !this.pilotData) return;

        // Consome combustível (mais lento para naves com mais tanque)
        const consumption = 0.5;
        this.fuel = Math.max(0, this.fuel - consumption);

        // Atualiza barra
        const fuelPercent = this.fuel / this.maxFuel;
        this.fuelBar.scaleX = fuelPercent;

        // Muda cor baseado no nível
        if (fuelPercent < 0.25) {
            this.fuelBar.fillColor = 0xff0000;
        } else if (fuelPercent < 0.5) {
            this.fuelBar.fillColor = 0xffaa00;
        } else {
            this.fuelBar.fillColor = 0xff6a00;
        }

        // Game Over se acabar combustível
        if (this.fuel <= 0) {
            this.gameOver("SEM COMBUSTÍVEL");
        }
    }

    checkCollisions() {
        if (!this.ship || this.isGameOver || this.missionComplete) return;

        const shipX = this.ship.x;
        const shipY = this.ship.y;

        // Checa colisão com meteoros
        this.meteors.getChildren().forEach((meteor) => {
            const dist = Phaser.Math.Distance.Between(
                shipX,
                shipY,
                meteor.x,
                meteor.y
            );
            if (dist < 25) {
                this.gameOver("COLISÃO COM METEORO");
            }
        });

        // Checa coleta de minerais (quadrados azuis)
        this.collectibles.getChildren().forEach((mineral) => {
            if (mineral.collected) return; // Evita coleta dupla

            const dist = Phaser.Math.Distance.Between(
                shipX,
                shipY,
                mineral.x,
                mineral.y
            );
            if (dist < 20) {
                // Marca como coletado imediatamente
                mineral.collected = true;

                // Adiciona mineral
                this.mineral = Math.min(this.maxMineral, this.mineral + mineral.value);
                this.mineralBar.scaleX = this.mineral / this.maxMineral;

                // Efeito de coleta
                this.tweens.add({
                    targets: mineral,
                    scale: 2,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => mineral.destroy(),
                });

                // Verifica se completou a missão
                if (this.mineral >= this.maxMineral) {
                    this.missionComplete = true;
                    this.showVictory();
                }
            }
        });

        // Checa coleta de estrelas de combustível
        this.fuelStars.getChildren().forEach((star) => {
            if (star.collected) return; // Evita coleta dupla

            const dist = Phaser.Math.Distance.Between(
                shipX,
                shipY,
                star.x,
                star.y
            );
            if (dist < 15) {
                // Marca como coletado imediatamente
                star.collected = true;

                // Adiciona combustível
                this.fuel = Math.min(this.maxFuel, this.fuel + star.fuelValue);

                // Efeito de coleta e destroi
                this.tweens.add({
                    targets: star,
                    scale: 2,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => star.destroy(),
                });
            }
        });
    }

    gameOver(reason) {
        this.isGameOver = true;

        // Para a nave
        this.rotationSpeed = 0;

        // Texto de Game Over
        const gameOverText = this.add
            .text(this.centerX, this.centerY - 50, "MISSÃO FALHOU", {
                fontSize: "48px",
                color: "#ff0000",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        this.add
            .text(this.centerX, this.centerY + 10, reason, {
                fontSize: "20px",
                color: "#888",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        this.add
            .text(this.centerX, this.centerY + 80, `PONTUAÇÃO FINAL: ${this.score}`, {
                fontSize: "24px",
                color: "#ff6a00",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        // Botão de reiniciar
        const restartBtn = this.add
            .text(this.centerX, this.centerY + 150, "[ TENTAR NOVAMENTE ]", {
                fontSize: "18px",
                color: "#666",
                fontFamily: "monospace",
            })
            .setOrigin(0.5)
            .setInteractive();

        restartBtn.on("pointerover", () => restartBtn.setColor("#ff6a00"));
        restartBtn.on("pointerout", () => restartBtn.setColor("#666"));
        restartBtn.on("pointerdown", () => {
            EventBus.removeListener("send-pilot-data");
            this.scene.restart();
            EventBus.emit("current-scene-ready", this);
        });
    }

    showVictory() {
        // Para a nave
        this.rotationSpeed = 0;

        // Texto de Vitória
        this.add
            .text(this.centerX, this.centerY - 50, "MISSÃO COMPLETA!", {
                fontSize: "42px",
                color: "#00ff00",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        this.add
            .text(this.centerX, this.centerY + 10, `MINERAL COLETADO: ${this.maxMineral}/${this.maxMineral}`, {
                fontSize: "20px",
                color: "#0066ff",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        this.add
            .text(this.centerX, this.centerY + 50, "Fase 1 Concluída", {
                fontSize: "18px",
                color: "#888",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        // Botão de jogar novamente
        const playAgainBtn = this.add
            .text(this.centerX, this.centerY + 120, "[ JOGAR NOVAMENTE ]", {
                fontSize: "18px",
                color: "#666",
                fontFamily: "monospace",
            })
            .setOrigin(0.5)
            .setInteractive();

        playAgainBtn.on("pointerover", () => playAgainBtn.setColor("#00ff00"));
        playAgainBtn.on("pointerout", () => playAgainBtn.setColor("#666"));
        playAgainBtn.on("pointerdown", () => {
            EventBus.removeListener("send-pilot-data");
            this.scene.restart();
            EventBus.emit("current-scene-ready", this);
        });
    }

    update() {
        // Input por teclado
        if (this.keyA.isDown || this.cursors.left.isDown) {
            if (this.currentOrbit !== "INNER") {
                this.targetOrbitRadius =
                    this.currentOrbit === "OUTER"
                        ? ORBITS.MIDDLE
                        : ORBITS.INNER;
                this.currentOrbit =
                    this.currentOrbit === "OUTER" ? "MIDDLE" : "INNER";
                this.orbitText.setText(
                    `ÓRBITA: ${
                        this.currentOrbit === "INNER" ? "INTERNA" : "MÉDIA"
                    }`
                );
                this.keyA.isDown = false;
            }
        }

        if (this.keyD.isDown || this.cursors.right.isDown) {
            if (this.currentOrbit !== "OUTER") {
                this.targetOrbitRadius =
                    this.currentOrbit === "INNER"
                        ? ORBITS.MIDDLE
                        : ORBITS.OUTER;
                this.currentOrbit =
                    this.currentOrbit === "INNER" ? "MIDDLE" : "OUTER";
                this.orbitText.setText(
                    `ÓRBITA: ${
                        this.currentOrbit === "OUTER" ? "EXTERNA" : "MÉDIA"
                    }`
                );
                this.keyD.isDown = false;
            }
        }

        // Suaviza transição de órbita
        this.orbitRadius = Phaser.Math.Linear(
            this.orbitRadius,
            this.targetOrbitRadius,
            0.1
        );

        // Movimento da nave
        if (this.ship && this.pilotData && !this.isGameOver) {
            // Ajusta velocidade angular para manter velocidade linear constante
            // Velocidade linear = velocidade angular * raio
            // Para manter constante: velocidade angular = base_speed * (base_orbit / current_orbit)
            const adjustedSpeed = this.rotationSpeed * (BASE_ORBIT / this.orbitRadius);
            this.angle += adjustedSpeed;

            this.ship.x = this.centerX + Math.cos(this.angle) * this.orbitRadius;
            this.ship.y = this.centerY + Math.sin(this.angle) * this.orbitRadius;
            this.ship.rotation = this.angle + Math.PI / 2;

            // Atualiza trail
            this.trailPositions.unshift({ x: this.ship.x, y: this.ship.y });
            if (this.trailPositions.length > 15) {
                this.trailPositions.pop();
            }

            // Desenha trail
            const shipColor = parseInt(this.pilotData.color.replace("#", "0x"));
            this.trailGraphics.clear();
            this.trailPositions.forEach((pos, i) => {
                const alpha = 1 - i / this.trailPositions.length;
                const size = 3 * (1 - i / this.trailPositions.length);
                this.trailGraphics.fillStyle(shipColor, alpha * 0.5);
                this.trailGraphics.fillCircle(pos.x, pos.y, size);
            });
        }

        // Movimento dos meteoros
        this.meteors.getChildren().forEach((meteor) => {
            meteor.angle += meteor.speed * meteor.direction;
            meteor.x = this.centerX + Math.cos(meteor.angle) * meteor.orbitRadius;
            meteor.y = this.centerY + Math.sin(meteor.angle) * meteor.orbitRadius;
        });

        // Checa colisões
        this.checkCollisions();
    }
}
