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

const PHASES = [
    { mineralTarget: 5, meteorSpawnDelay: 5000 },
    { mineralTarget: 8, meteorSpawnDelay: 4700 },
    { mineralTarget: 10, meteorSpawnDelay: 4400 },
    { mineralTarget: 15, meteorSpawnDelay: 4000 },
];

const MINERAL_SPAWN_DELAY = 2500;
const FUEL_STAR_SPAWN_DELAY = 3000;
const FUEL_CONSUMPTION_DELAY = 100;

const STAR_LAYER_SETTINGS = [
    { qty: 200, size: 1, alpha: 0.4, speed: 0.05 },
    { qty: 100, size: 2, alpha: 0.7, speed: 0.15 },
    { qty: 40, size: 3, alpha: 0.9, speed: 0.4 },
];

// Tutorial steps configuration
const TUTORIAL_STEPS = [
    {
        id: "welcome",
        message: "Bem-vindo, piloto! Sou seu comandante de missão. Vou te guiar nesta primeira órbita de treino.",
        waitForAction: false,
        delay: 3000,
    },
    {
        id: "orbit_explain",
        message: "Use os propulsores laterais para mudar de órbita! Clique em INNER ou OUTER para navegar.",
        waitForAction: true,
        actionType: "orbit_change",
        highlight: "buttons",
    },
    {
        id: "orbit_success",
        message: "Perfeito! Você dominou a navegação entre órbitas!",
        waitForAction: false,
        delay: 2500,
        showThumbsUp: true,
    },
    {
        id: "safe_orbit",
        message: "A órbita INTERNA é uma zona SEGURA - meteoros não aparecem lá! Use-a para se proteger.",
        waitForAction: false,
        delay: 4000,
    },
    {
        id: "fuel_explain",
        message: "Veja a barra LARANJA? É seu combustível - ele está acabando! Colete a ESTRELA AMARELA para reabastecer!",
        waitForAction: true,
        actionType: "collect_fuel",
        highlight: "fuel",
        spawnItem: "fuel",
    },
    {
        id: "fuel_success",
        message: "Excelente! Combustível reabastecido! Sem ele sua nave para.",
        waitForAction: false,
        delay: 2500,
        showThumbsUp: true,
    },
    {
        id: "mineral_explain",
        message: "Agora colete o MINERAL AZUL! Preencha a barra azul para completar cada fase.",
        waitForAction: true,
        actionType: "collect_mineral",
        highlight: "mineral",
        spawnItem: "mineral",
    },
    {
        id: "mineral_success",
        message: "Muito bem! Colete minerais suficientes para avançar de fase!",
        waitForAction: false,
        delay: 2500,
        showThumbsUp: true,
    },
    {
        id: "game_start",
        message: "Tutorial completo! Boa sorte, piloto! O jogo de verdade começa agora!",
        waitForAction: false,
        delay: 3000,
        isFinal: true,
    },
];

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
        this.phaseIndex = 0;
        this.isPhaseTransition = false;
        this.finalPhaseComplete = false;
        this.shipVelocity = 0;

        // Tutorial state
        this.isTutorialActive = true;
        this.tutorialStep = 0;
        this.tutorialWaitingForAction = false;
        this.tutorialCompleted = false;
    }

    create() {
        // Reset do estado
        this.fuel = 100;
        this.mineral = 0;
        this.maxMineral = PHASES[0].mineralTarget;
        this.isGameOver = false;
        this.isPhaseTransition = false;
        this.finalPhaseComplete = false;
        this.phaseIndex = 0;
        this.currentOrbit = "MIDDLE";
        this.orbitRadius = ORBITS.MIDDLE;
        this.targetOrbitRadius = ORBITS.MIDDLE;
        this.orbitCooldown = false;

        // Tutorial state reset - check if should skip (on restart)
        const skipTutorial = this.registry.get("skipTutorial") || false;
        this.isTutorialActive = !skipTutorial;
        this.tutorialStep = 0;
        this.tutorialWaitingForAction = false;
        this.tutorialCompleted = skipTutorial;

        // Centro dinâmico baseado no tamanho da tela
        this.centerX = this.scale.width / 2;
        this.centerY = this.scale.height / 2;

        // Listener para redimensionamento
        this.scale.on("resize", this.handleResize, this);

        // 1. Fundo dinamico
        this.createDynamicBackground();

        // 2. Cria as órbitas visuais (guias)
        this.createOrbitGuides();

        // 3. Cria o Planeta Yotur 5 no centro
        this.createPlanet();

        // 4. Grupos para meteoros, minerais e estrelas de combustível
        this.meteors = this.add.group();
        this.collectibles = this.add.group();
        this.fuelStars = this.add.group();

        // 4.1 Spawner de estrelas de combustível (dinâmico)
        this.fuelStarEvent = this.time.addEvent({
            delay: FUEL_STAR_SPAWN_DELAY,
            callback: this.spawnFuelStar,
            callbackScope: this,
            loop: true,
        });
        // Spawn inicial
        this.spawnFuelStar();

        // 5. HUD
        this.createHUD();
        this.createPhaseOverlay();

        // 5.1 Tutorial UI
        this.createTutorialUI();

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
        this.meteorEvent = this.time.addEvent({
            delay: PHASES[0].meteorSpawnDelay,
            callback: this.spawnMeteor,
            callbackScope: this,
            loop: true,
        });

        this.mineralEvent = this.time.addEvent({
            delay: MINERAL_SPAWN_DELAY,
            callback: this.spawnMineral,
            callbackScope: this,
            loop: true,
        });

        // 9. Consumo de combustível
        this.fuelConsumptionEvent = this.time.addEvent({
            delay: FUEL_CONSUMPTION_DELAY,
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
        if (this.backgroundRect) {
            this.redrawDynamicBackground();
        }

        // Reposiciona HUD
        if (this.mineralBar) {
            this.mineralBarBg.setPosition(width - 100, 30);
            this.mineralBar.x = width - 176;
            this.mineralLabel.setPosition(width - 26, 50);
            this.orbitText.setPosition(this.centerX, height - 38);
            if (this.mineralBarHighlight) {
                this.mineralBarHighlight.setPosition(width - 176, 24);
            }
            if (this.mineralBarSegments) {
                this.drawBarSegments(
                    this.mineralBarSegments,
                    width - 176,
                    30,
                    150,
                    16,
                    10,
                    0xffffff,
                    0.12
                );
            }
        }
        if (this.fuelBarHighlight) {
            this.fuelBarHighlight.setPosition(26, 24);
        }
        if (this.fuelBarSegments) {
            this.drawBarSegments(
                this.fuelBarSegments,
                26,
                30,
                150,
                16,
                10,
                0xffffff,
                0.12
            );
        }
        if (this.phaseOverlay) {
            this.phaseOverlayBg.setPosition(this.centerX, this.centerY);
            this.phaseOverlayBg.setSize(width, height);
            this.phaseOverlayTitle.setPosition(this.centerX, this.centerY - 80);
            this.phaseOverlaySubtitle.setPosition(
                this.centerX,
                this.centerY - 40
            );
            this.phaseOverlayCountdown.setPosition(
                this.centerX,
                this.centerY + 20
            );
            this.phaseOverlayLabel.setPosition(
                this.centerX,
                this.centerY + 70
            );
        }

        // Reposiciona botões
        const btnY = height - 120;
        if (this.btnLeft) {
            if (this.btnLeftGlow) {
                this.btnLeftGlow.setPosition(80, btnY);
            }
            this.btnLeft.setPosition(80, btnY);
            this.arrowLeft.setPosition(80, btnY);
            this.btnRight.setPosition(width - 80, btnY);
            this.arrowRight.setPosition(width - 80, btnY);
            if (this.btnRightGlow) {
                this.btnRightGlow.setPosition(width - 80, btnY);
            }
            this.innerLabel.setPosition(80, btnY + 50);
            this.outerLabel.setPosition(width - 80, btnY + 50);
        }

        if (this.fsBtn) {
            this.fsBtn.setPosition(width - 26, height - 38);
        }

        // Reposition tutorial UI
        if (this.tutorialContainer) {
            this.tutorialContainer.setPosition(width - 40, 80);
            // Update pilot image mask
            if (this.tutorialPilotImage && this.pilotData) {
                const panelHeight = 130;
                const pilotSize = 80;
                const maskGraphics = this.make.graphics();
                maskGraphics.fillCircle(width - 40 - 50, 80 + panelHeight / 2, pilotSize / 2);
                this.tutorialPilotImage.setMask(maskGraphics.createGeometryMask());
            }
        }

        // Update highlight positions if visible
        if (this.mineralHighlight && this.mineralHighlight.visible) {
            this.mineralHighlight.clear();
            this.mineralHighlight.lineStyle(3, 0xffff00, 1);
            this.mineralHighlight.strokeRoundedRect(width - 182, 18, 160, 28, 5);
        }
        if (this.buttonsHighlight && this.buttonsHighlight.visible) {
            this.buttonsHighlight.clear();
            this.buttonsHighlight.lineStyle(4, 0xffff00, 1);
            this.buttonsHighlight.strokeCircle(80, btnY, 50);
            this.buttonsHighlight.strokeCircle(width - 80, btnY, 50);
        }
    }

    createDynamicBackground() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Static background image
        this.backgroundImage = this.add.image(this.centerX, this.centerY, "game_bg");

        // Scale to cover the entire screen
        const scaleX = width / this.backgroundImage.width;
        const scaleY = height / this.backgroundImage.height;
        const scale = Math.max(scaleX, scaleY);
        this.backgroundImage.setScale(scale);

        // Slight darkening overlay for better contrast
        this.backgroundOverlay = this.add
            .rectangle(0, 0, width, height, 0x000000, 0.3)
            .setOrigin(0);
    }

    redrawDynamicBackground() {
        const width = this.scale.width;
        const height = this.scale.height;

        if (this.backgroundImage) {
            this.backgroundImage.setPosition(this.centerX, this.centerY);
            const scaleX = width / this.backgroundImage.width;
            const scaleY = height / this.backgroundImage.height;
            const scale = Math.max(scaleX, scaleY);
            this.backgroundImage.setScale(scale);
        }

        if (this.backgroundOverlay) {
            this.backgroundOverlay.setSize(width, height);
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
        this.orbitGraphics.strokeCircle(
            this.centerX,
            this.centerY,
            ORBITS.INNER
        );

        this.orbitGraphics.lineStyle(1, 0xffffff, 0.2);
        this.orbitGraphics.strokeCircle(
            this.centerX,
            this.centerY,
            ORBITS.MIDDLE
        );

        this.orbitGraphics.lineStyle(1, 0xffffff, 0.15);
        this.orbitGraphics.strokeCircle(
            this.centerX,
            this.centerY,
            ORBITS.OUTER
        );
    }

    spawnFuelStar() {
        if (this.isGameOver || this.isPhaseTransition || !this.pilotData || this.isTutorialActive)
            return;

        // Escolhe órbita e posição aleatória
        const orbitKeys = Object.keys(ORBITS);
        const randomOrbit =
            orbitKeys[Phaser.Math.Between(0, orbitKeys.length - 1)];
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
        this.planet = this.add.image(0, 0, "planet");
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
        this.fuelBarSegments = this.add.graphics();
        this.drawBarSegments(
            this.fuelBarSegments,
            26,
            30,
            150,
            16,
            10,
            0xffffff,
            0.12
        );
        this.fuelBarHighlight = this.add.rectangle(
            26,
            24,
            150,
            2,
            0xffffff,
            0.1
        );
        this.fuelBarHighlight.setOrigin(0, 0.5);

        this.fuelLabel = this.add.text(26, 50, "FUEL", {
            fontSize: "12px",
            color: "#666",
            fontFamily: "monospace",
        });

        // Barra de mineral (direita)
        this.mineralBarBg = this.add.rectangle(
            width - 100,
            30,
            150,
            20,
            0x333333
        );
        this.mineralBar = this.add.rectangle(
            width - 100,
            30,
            150,
            16,
            0x0066ff
        );
        this.mineralBar.setOrigin(0, 0.5);
        this.mineralBar.x = width - 176;
        this.mineralBar.scaleX = 0; // Começa vazia
        this.mineralBarSegments = this.add.graphics();
        this.drawBarSegments(
            this.mineralBarSegments,
            width - 176,
            30,
            150,
            16,
            10,
            0xffffff,
            0.12
        );
        this.mineralBarHighlight = this.add.rectangle(
            width - 176,
            24,
            150,
            2,
            0xffffff,
            0.1
        );
        this.mineralBarHighlight.setOrigin(0, 0.5);

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

    drawBarSegments(graphics, x, y, width, height, segments, color, alpha) {
        graphics.clear();
        const segmentGap = 2;
        const totalGap = segmentGap * (segments - 1);
        const segmentWidth = (width - totalGap) / segments;

        graphics.lineStyle(0, color, alpha);
        graphics.fillStyle(color, alpha);

        for (let i = 0; i < segments; i++) {
            const segmentX = x + i * (segmentWidth + segmentGap);
            graphics.fillRect(segmentX, y - height / 2, segmentWidth, height);
        }
    }

    createPhaseOverlay() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.phaseOverlayBg = this.add
            .rectangle(this.centerX, this.centerY, width, height, 0x000000, 0.55)
            .setVisible(false);

        this.phaseOverlayTitle = this.add
            .text(this.centerX, this.centerY - 80, "", {
                fontSize: "24px",
                color: "#ffd700",
                fontFamily: "monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setVisible(false);

        this.phaseOverlaySubtitle = this.add
            .text(this.centerX, this.centerY - 40, "", {
                fontSize: "14px",
                color: "#cccccc",
                fontFamily: "monospace",
            })
            .setOrigin(0.5)
            .setVisible(false);

        this.phaseOverlayCountdown = this.add
            .text(this.centerX, this.centerY + 20, "", {
                fontSize: "60px",
                color: "#ff4500",
                fontFamily: "monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setVisible(false);

        this.phaseOverlayLabel = this.add
            .text(this.centerX, this.centerY + 70, "", {
                fontSize: "16px",
                color: "#ff8c00",
                fontFamily: "monospace",
            })
            .setOrigin(0.5)
            .setVisible(false);

        this.phaseOverlay = true;
    }

    createTouchControls() {
        const width = this.scale.width;
        const height = this.scale.height;
        const btnY = height - 120;

        this.btnLeftGlow = this.add
            .circle(80, btnY, 50, 0xff6a00, 0.2)
            .setBlendMode(Phaser.BlendModes.ADD);
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
        this.btnLeft.on("pointerup", () =>
            this.btnLeft.setFillStyle(0x333333, 0.6)
        );
        this.btnLeft.on("pointerout", () =>
            this.btnLeft.setFillStyle(0x333333, 0.6)
        );

        this.btnRightGlow = this.add
            .circle(width - 80, btnY, 50, 0xff6a00, 0.2)
            .setBlendMode(Phaser.BlendModes.ADD);
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
        this.btnRight.on("pointerup", () =>
            this.btnRight.setFillStyle(0x333333, 0.6)
        );
        this.btnRight.on("pointerout", () =>
            this.btnRight.setFillStyle(0x333333, 0.6)
        );

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
            this.onOrbitChanged();
        } else if (this.currentOrbit === "MIDDLE") {
            this.targetOrbitRadius = ORBITS.INNER;
            this.currentOrbit = "INNER";
            this.orbitText.setText("ÓRBITA: INTERNA");
            this.startOrbitCooldown();
            this.onOrbitChanged();
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
            this.onOrbitChanged();
        } else if (this.currentOrbit === "MIDDLE") {
            this.targetOrbitRadius = ORBITS.OUTER;
            this.currentOrbit = "OUTER";
            this.orbitText.setText("ÓRBITA: EXTERNA");
            this.startOrbitCooldown();
            this.onOrbitChanged();
        }
    }

    onOrbitChanged() {
        // Check if tutorial is waiting for orbit change action
        if (this.isTutorialActive && this.tutorialWaitingForAction) {
            const currentStep = TUTORIAL_STEPS[this.tutorialStep];
            if (currentStep && currentStep.actionType === "orbit_change") {
                this.tutorialWaitingForAction = false;
                this.advanceTutorial();
            }
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

        // Setup tutorial pilot image
        this.setupTutorialPilotImage();

        // Start tutorial instead of phase
        if (this.isTutorialActive) {
            this.pauseSpawners();
            this.time.delayedCall(500, () => {
                this.startTutorial();
            });
        } else {
            this.startPhase(0);
        }
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
        if (this.isGameOver || this.isPhaseTransition || !this.pilotData || this.isTutorialActive)
            return;

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
        if (this.isGameOver || this.isPhaseTransition || !this.pilotData || this.isTutorialActive)
            return;

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
        if (
            this.isGameOver ||
            this.isPhaseTransition ||
            this.finalPhaseComplete ||
            !this.pilotData
        )
            return;

        // Consome combustível (mais lento para naves com mais tanque)
        const consumption = 0.5;
        this.fuel = Math.max(0, this.fuel - consumption);

        this.updateFuelBar();

        // Game Over se acabar combustível
        if (this.fuel <= 0) {
            this.gameOver("SEM COMBUSTÍVEL");
        }
    }

    checkCollisions() {
        if (
            !this.ship ||
            this.isGameOver ||
            this.isPhaseTransition ||
            this.finalPhaseComplete
        )
            return;

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
                this.mineral = Math.min(
                    this.maxMineral,
                    this.mineral + mineral.value
                );
                this.updateMineralBar();

                // Efeito de coleta
                this.tweens.add({
                    targets: mineral,
                    scale: 2,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => mineral.destroy(),
                });

                // Check if tutorial mineral collected
                if (mineral.isTutorialItem && this.isTutorialActive && this.tutorialWaitingForAction) {
                    const currentStep = TUTORIAL_STEPS[this.tutorialStep];
                    if (currentStep && currentStep.actionType === "collect_mineral") {
                        this.tutorialWaitingForAction = false;
                        this.advanceTutorial();
                    }
                }

                // Verifica se completou a fase (only when not in tutorial)
                if (!this.isTutorialActive && this.mineral >= this.maxMineral) {
                    this.completePhase();
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
            if (dist < 18) {
                // Marca como coletado imediatamente
                star.collected = true;

                // Adiciona combustível
                this.fuel = Math.min(this.maxFuel, this.fuel + star.fuelValue);
                this.updateFuelBar();

                // Efeito de coleta e destroi
                this.tweens.add({
                    targets: star,
                    scale: 2,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => star.destroy(),
                });

                // Check if tutorial fuel collected
                if (star.isTutorialItem && this.isTutorialActive && this.tutorialWaitingForAction) {
                    const currentStep = TUTORIAL_STEPS[this.tutorialStep];
                    if (currentStep && currentStep.actionType === "collect_fuel") {
                        this.tutorialWaitingForAction = false;
                        this.advanceTutorial();
                    }
                }
            }
        });
    }

    gameOver(reason) {
        this.isGameOver = true;

        // Para a nave
        this.rotationSpeed = 0;
        this.shipVelocity = 0;

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
            .text(
                this.centerX,
                this.centerY + 80,
                `PONTUAÇÃO FINAL: ${this.score}`,
                {
                    fontSize: "24px",
                    color: "#ff6a00",
                    fontFamily: "monospace",
                }
            )
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
            // Skip tutorial on restart
            this.registry.set("skipTutorial", true);
            this.scene.restart();
            EventBus.emit("current-scene-ready", this);
        });
    }

    completePhase() {
        if (this.isPhaseTransition || this.finalPhaseComplete) return;

        this.isPhaseTransition = true;
        this.pauseSpawners();
        this.clearHazardsAndPickups();
        const isLastPhase = this.phaseIndex + 1 >= PHASES.length;
        this.showPhaseOverlay(isLastPhase);

        if (isLastPhase) {
            this.finalPhaseComplete = true;
            return;
        }

        this.startPhaseCountdown();
    }

    showPhaseOverlay(isLastPhase) {
        const phaseNumber = this.phaseIndex + 1;

        this.phaseOverlayBg.setVisible(true);
        this.phaseOverlayTitle
            .setText(
                isLastPhase
                    ? "TODAS AS FASES CONCLUIDAS"
                    : `SETOR ${phaseNumber} CONCLUIDO!`
            )
            .setVisible(true);

        this.phaseOverlaySubtitle
            .setText(
                isLastPhase
                    ? "Missao completa. Excelente trabalho!"
                    : "Orbita estabilizada. Bom trabalho, piloto."
            )
            .setVisible(true);

        if (isLastPhase) {
            this.phaseOverlayCountdown.setVisible(false);
            this.phaseOverlayLabel.setVisible(false);
            return;
        }

        this.phaseOverlayCountdown.setVisible(true);
        this.phaseOverlayLabel
            .setText(`Iniciando Fase ${phaseNumber + 1} em...`)
            .setVisible(true);
    }

    startPhaseCountdown() {
        let countdown = 3;
        this.phaseOverlayCountdown.setText(`${countdown}`);

        if (this.phaseCountdownEvent) {
            this.phaseCountdownEvent.remove();
        }

        this.phaseCountdownEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                countdown -= 1;
                if (countdown <= 0) {
                    this.phaseCountdownEvent.remove();
                    this.hidePhaseOverlay();
                    this.advancePhase();
                    return;
                }
                this.phaseOverlayCountdown.setText(`${countdown}`);
            },
        });
    }

    hidePhaseOverlay() {
        this.phaseOverlayBg.setVisible(false);
        this.phaseOverlayTitle.setVisible(false);
        this.phaseOverlaySubtitle.setVisible(false);
        this.phaseOverlayCountdown.setVisible(false);
        this.phaseOverlayLabel.setVisible(false);
    }

    advancePhase() {
        const nextPhaseIndex = this.phaseIndex + 1;

        if (nextPhaseIndex >= PHASES.length) {
            return;
        }

        this.startPhase(nextPhaseIndex);
    }

    startPhase(phaseIndex) {
        this.phaseIndex = phaseIndex;
        this.isPhaseTransition = false;
        this.maxMineral = PHASES[phaseIndex].mineralTarget;
        this.mineral = 0;

        if (this.maxFuel !== undefined) {
            this.fuel = this.maxFuel;
        }

        this.updateFuelBar();
        this.updateMineralBar();
        this.resumeSpawners();
    }

    pauseSpawners() {
        if (this.meteorEvent) this.meteorEvent.paused = true;
        if (this.mineralEvent) this.mineralEvent.paused = true;
        if (this.fuelStarEvent) this.fuelStarEvent.paused = true;
        if (this.fuelConsumptionEvent) this.fuelConsumptionEvent.paused = true;
    }

    resumeSpawners() {
        if (this.meteorEvent) this.meteorEvent.remove();
        this.meteorEvent = this.time.addEvent({
            delay: PHASES[this.phaseIndex].meteorSpawnDelay,
            callback: this.spawnMeteor,
            callbackScope: this,
            loop: true,
        });

        if (this.mineralEvent) this.mineralEvent.paused = false;
        if (this.fuelStarEvent) this.fuelStarEvent.paused = false;
        if (this.fuelConsumptionEvent) this.fuelConsumptionEvent.paused = false;
    }

    clearHazardsAndPickups() {
        if (this.meteors) this.meteors.clear(true, true);
        if (this.collectibles) this.collectibles.clear(true, true);
        if (this.fuelStars) this.fuelStars.clear(true, true);
    }

    updateFuelBar() {
        if (!this.fuelBar || !this.maxFuel) return;

        const fuelPercent = this.fuel / this.maxFuel;
        this.fuelBar.scaleX = fuelPercent;

        if (fuelPercent < 0.25) {
            this.fuelBar.fillColor = 0xff0000;
        } else if (fuelPercent < 0.5) {
            this.fuelBar.fillColor = 0xffaa00;
        } else {
            this.fuelBar.fillColor = 0xff6a00;
        }
    }

    updateMineralBar() {
        if (!this.mineralBar) return;
        this.mineralBar.scaleX =
            this.maxMineral > 0 ? this.mineral / this.maxMineral : 0;
    }

    // ==================== TUTORIAL SYSTEM ====================

    createTutorialUI() {
        const width = this.scale.width;

        // Container for the entire tutorial popup (top-right corner with more spacing)
        this.tutorialContainer = this.add.container(width - 40, 80);
        this.tutorialContainer.setVisible(false);
        this.tutorialContainer.setDepth(1000);

        // Background panel with rounded corners effect
        const panelWidth = 300;
        const panelHeight = 130;
        const pilotSize = 80; // Circular pilot image size

        // Main background
        this.tutorialBg = this.add.graphics();
        this.tutorialBg.fillStyle(0x1a1a2e, 0.95);
        this.tutorialBg.fillRoundedRect(-panelWidth, 0, panelWidth, panelHeight, 12);
        this.tutorialBg.lineStyle(2, 0xff6a00, 0.8);
        this.tutorialBg.strokeRoundedRect(-panelWidth, 0, panelWidth, panelHeight, 12);
        this.tutorialContainer.add(this.tutorialBg);

        // Pilot image container (circular frame) - on the right side of panel
        this.pilotFrame = this.add.graphics();
        this.pilotFrame.fillStyle(0x0a0a15, 1);
        this.pilotFrame.fillCircle(-50, panelHeight / 2, pilotSize / 2 + 4);
        this.pilotFrame.lineStyle(3, 0xff6a00, 1);
        this.pilotFrame.strokeCircle(-50, panelHeight / 2, pilotSize / 2 + 4);
        this.tutorialContainer.add(this.pilotFrame);

        // Pilot image - circular images fill the frame completely
        this.tutorialPilotImage = this.add.image(-50, panelHeight / 2, "pilot_kaio");
        this.tutorialPilotImage.setDisplaySize(pilotSize, pilotSize);
        // Create circular mask for pilot image
        const maskGraphics = this.make.graphics();
        maskGraphics.fillCircle(width - 40 - 50, 80 + panelHeight / 2, pilotSize / 2);
        this.tutorialPilotImage.setMask(maskGraphics.createGeometryMask());
        this.tutorialContainer.add(this.tutorialPilotImage);

        // Speech bubble triangle pointing to pilot
        this.speechTriangle = this.add.triangle(
            -100, panelHeight / 2,
            0, 0,
            12, -8,
            12, 8,
            0x1a1a2e
        );
        this.tutorialContainer.add(this.speechTriangle);

        // Message text area (to the left of pilot)
        this.tutorialText = this.add.text(-panelWidth + 15, 15, "", {
            fontSize: "12px",
            color: "#ffffff",
            fontFamily: "monospace",
            wordWrap: { width: panelWidth - 115 },
            lineSpacing: 3,
        });
        this.tutorialContainer.add(this.tutorialText);

        // Pilot name label
        this.tutorialPilotName = this.add.text(-panelWidth + 15, panelHeight - 25, "", {
            fontSize: "10px",
            color: "#ff6a00",
            fontFamily: "monospace",
            fontStyle: "bold",
        });
        this.tutorialContainer.add(this.tutorialPilotName);

        // Continue indicator (for non-action steps)
        this.tutorialContinue = this.add.text(-panelWidth / 2 - 20, panelHeight - 18, "", {
            fontSize: "9px",
            color: "#666666",
            fontFamily: "monospace",
        });
        this.tutorialContainer.add(this.tutorialContinue);

        // Thumbs up emoji for success feedback
        this.tutorialThumbsUp = this.add.text(-50, panelHeight / 2, "👍", {
            fontSize: "36px",
        }).setOrigin(0.5);
        this.tutorialThumbsUp.setVisible(false);
        this.tutorialContainer.add(this.tutorialThumbsUp);

        // Highlight effects for HUD elements
        this.createTutorialHighlights();
    }

    createTutorialHighlights() {
        // Fuel bar highlight
        this.fuelHighlight = this.add.graphics();
        this.fuelHighlight.setVisible(false);
        this.fuelHighlight.setDepth(999);

        // Mineral bar highlight
        this.mineralHighlight = this.add.graphics();
        this.mineralHighlight.setVisible(false);
        this.mineralHighlight.setDepth(999);

        // Buttons highlight
        this.buttonsHighlight = this.add.graphics();
        this.buttonsHighlight.setVisible(false);
        this.buttonsHighlight.setDepth(999);
    }

    setupTutorialPilotImage() {
        if (!this.pilotData || !this.tutorialPilotImage) return;

        // Map pilot id to texture key
        const pilotTextureMap = {
            kaio: "pilot_kaio",
            cesar: "pilot_cesar",
            kyra: "pilot_kyra",
        };

        const textureKey = pilotTextureMap[this.pilotData.id] || "pilot_kaio";
        this.tutorialPilotImage.setTexture(textureKey);

        // Images are already circular, just set display size to fill the frame
        const pilotSize = 80;
        this.tutorialPilotImage.setDisplaySize(pilotSize, pilotSize);

        // Update pilot name
        if (this.tutorialPilotName) {
            this.tutorialPilotName.setText(`- ${this.pilotData.pilot}`);
        }

        // Update mask position for circular crop
        const width = this.scale.width;
        const panelHeight = 130;
        const maskGraphics = this.make.graphics();
        maskGraphics.fillCircle(width - 40 - 50, 80 + panelHeight / 2, pilotSize / 2);
        this.tutorialPilotImage.setMask(maskGraphics.createGeometryMask());
    }

    startTutorial() {
        this.tutorialStep = 0;
        this.showTutorialStep();
    }

    showTutorialStep() {
        if (this.tutorialStep >= TUTORIAL_STEPS.length) {
            this.completeTutorial();
            return;
        }

        const step = TUTORIAL_STEPS[this.tutorialStep];

        // Show container with animation
        this.tutorialContainer.setVisible(true);
        this.tutorialContainer.setAlpha(0);
        this.tweens.add({
            targets: this.tutorialContainer,
            alpha: 1,
            duration: 300,
            ease: "Power2",
        });

        // Set message text with typewriter effect
        this.typewriterText(step.message);

        // Handle thumbs up display
        if (step.showThumbsUp) {
            this.tutorialThumbsUp.setVisible(true);
            this.tutorialPilotImage.setVisible(false);
            this.tweens.add({
                targets: this.tutorialThumbsUp,
                scale: { from: 0, to: 1 },
                duration: 300,
                ease: "Back.easeOut",
            });
        } else {
            this.tutorialThumbsUp.setVisible(false);
            this.tutorialPilotImage.setVisible(true);
        }

        // Handle highlights
        this.clearHighlights();
        if (step.highlight) {
            this.showHighlight(step.highlight);
        }

        // Spawn tutorial items if needed
        if (step.spawnItem) {
            this.time.delayedCall(800, () => {
                this.spawnTutorialItem(step.spawnItem);
            });
        }

        // Reduce fuel for fuel tutorial step
        if (step.id === "fuel_explain") {
            this.fuel = this.maxFuel * 0.3; // Set fuel to 30%
            this.updateFuelBar();
        }

        // Handle action waiting or auto-advance
        if (step.waitForAction) {
            this.tutorialWaitingForAction = true;
            this.tutorialContinue.setText("Aguardando sua ação...");
        } else {
            this.tutorialWaitingForAction = false;
            this.tutorialContinue.setText("");

            // Auto-advance after delay
            if (step.delay) {
                this.time.delayedCall(step.delay, () => {
                    if (this.isTutorialActive && !this.tutorialWaitingForAction) {
                        this.advanceTutorial();
                    }
                });
            }
        }
    }

    spawnTutorialItem(type) {
        if (!this.ship) return;

        // Spawn item near the ship's current position but ahead of it
        const spawnAngle = this.angle + 0.8; // Slightly ahead
        const radius = this.orbitRadius;

        const x = this.centerX + Math.cos(spawnAngle) * radius;
        const y = this.centerY + Math.sin(spawnAngle) * radius;

        if (type === "fuel") {
            const star = this.add.star(x, y, 5, 6, 12, 0xffff00);
            star.setAlpha(1);
            star.orbitRadius = radius;
            star.angle = spawnAngle;
            star.fuelValue = 20;
            star.isTutorialItem = true;

            // Larger glow effect
            this.tweens.add({
                targets: star,
                alpha: 0.6,
                scale: 1.3,
                duration: 400,
                yoyo: true,
                repeat: -1,
            });

            this.fuelStars.add(star);
        } else if (type === "mineral") {
            const mineral = this.add.rectangle(x, y, 18, 18, 0x0066ff);
            mineral.setStrokeStyle(3, 0x00aaff);
            mineral.orbitRadius = radius;
            mineral.angle = spawnAngle;
            mineral.value = 1;
            mineral.isTutorialItem = true;

            this.tweens.add({
                targets: mineral,
                scale: 1.4,
                alpha: 0.8,
                duration: 400,
                yoyo: true,
                repeat: -1,
            });

            this.collectibles.add(mineral);
        }
    }

    typewriterText(fullText) {
        this.tutorialText.setText("");
        let charIndex = 0;
        const typeSpeed = 25;

        if (this.typewriterEvent) {
            this.typewriterEvent.remove();
        }

        this.typewriterEvent = this.time.addEvent({
            delay: typeSpeed,
            callback: () => {
                if (charIndex < fullText.length) {
                    this.tutorialText.setText(fullText.substring(0, charIndex + 1));
                    charIndex++;
                } else {
                    this.typewriterEvent.remove();
                }
            },
            loop: true,
        });
    }

    showHighlight(type) {
        const width = this.scale.width;
        const height = this.scale.height;

        if (type === "fuel") {
            this.fuelHighlight.clear();
            this.fuelHighlight.lineStyle(3, 0xffff00, 1);
            this.fuelHighlight.strokeRoundedRect(20, 18, 160, 28, 5);
            this.fuelHighlight.setVisible(true);

            // Pulse animation
            this.tweens.add({
                targets: this.fuelHighlight,
                alpha: { from: 1, to: 0.3 },
                duration: 500,
                yoyo: true,
                repeat: -1,
            });
        } else if (type === "mineral") {
            this.mineralHighlight.clear();
            this.mineralHighlight.lineStyle(3, 0xffff00, 1);
            this.mineralHighlight.strokeRoundedRect(width - 182, 18, 160, 28, 5);
            this.mineralHighlight.setVisible(true);

            this.tweens.add({
                targets: this.mineralHighlight,
                alpha: { from: 1, to: 0.3 },
                duration: 500,
                yoyo: true,
                repeat: -1,
            });
        } else if (type === "buttons") {
            const btnY = height - 120;
            this.buttonsHighlight.clear();
            this.buttonsHighlight.lineStyle(4, 0xffff00, 1);
            this.buttonsHighlight.strokeCircle(80, btnY, 50);
            this.buttonsHighlight.strokeCircle(width - 80, btnY, 50);
            this.buttonsHighlight.setVisible(true);

            this.tweens.add({
                targets: this.buttonsHighlight,
                alpha: { from: 1, to: 0.3 },
                duration: 400,
                yoyo: true,
                repeat: -1,
            });
        }
    }

    clearHighlights() {
        this.tweens.killTweensOf(this.fuelHighlight);
        this.tweens.killTweensOf(this.mineralHighlight);
        this.tweens.killTweensOf(this.buttonsHighlight);

        this.fuelHighlight.setVisible(false);
        this.fuelHighlight.setAlpha(1);
        this.mineralHighlight.setVisible(false);
        this.mineralHighlight.setAlpha(1);
        this.buttonsHighlight.setVisible(false);
        this.buttonsHighlight.setAlpha(1);
    }

    advanceTutorial() {
        const currentStep = TUTORIAL_STEPS[this.tutorialStep];

        // Hide current step with animation
        this.tweens.add({
            targets: this.tutorialContainer,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.tutorialStep++;

                if (currentStep && currentStep.isFinal) {
                    this.completeTutorial();
                } else {
                    this.time.delayedCall(300, () => {
                        this.showTutorialStep();
                    });
                }
            },
        });
    }

    completeTutorial() {
        this.isTutorialActive = false;
        this.tutorialCompleted = true;

        // Clear all highlights
        this.clearHighlights();

        // Clear any remaining tutorial items and reset mineral/fuel
        this.clearHazardsAndPickups();
        this.mineral = 0;
        this.updateMineralBar();
        this.fuel = this.maxFuel;
        this.updateFuelBar();

        // Hide tutorial UI
        this.tweens.add({
            targets: this.tutorialContainer,
            alpha: 0,
            y: this.tutorialContainer.y - 50,
            duration: 500,
            onComplete: () => {
                this.tutorialContainer.setVisible(false);
            },
        });

        // Show "game starting" transition
        this.showGameStartTransition();
    }

    showGameStartTransition() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Overlay background
        const overlay = this.add.rectangle(
            this.centerX,
            this.centerY,
            width,
            height,
            0x000000,
            0.7
        );
        overlay.setDepth(1001);

        // Main title
        const title = this.add
            .text(this.centerX, this.centerY - 40, "INICIANDO MISSÃO", {
                fontSize: "32px",
                color: "#ff6a00",
                fontFamily: "monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(1002);

        // Countdown
        const countdownText = this.add
            .text(this.centerX, this.centerY + 30, "3", {
                fontSize: "72px",
                color: "#ffffff",
                fontFamily: "monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(1002);

        let count = 3;
        const countdownEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                count--;
                if (count > 0) {
                    countdownText.setText(`${count}`);
                    // Scale animation
                    this.tweens.add({
                        targets: countdownText,
                        scale: { from: 1.5, to: 1 },
                        duration: 300,
                        ease: "Power2",
                    });
                } else {
                    countdownEvent.remove();

                    // Show GO!
                    countdownText.setText("GO!");
                    countdownText.setColor("#00ff00");
                    this.tweens.add({
                        targets: countdownText,
                        scale: { from: 2, to: 1 },
                        duration: 300,
                        ease: "Back.easeOut",
                    });

                    // Fade out and start game
                    this.time.delayedCall(800, () => {
                        this.tweens.add({
                            targets: [overlay, title, countdownText],
                            alpha: 0,
                            duration: 500,
                            onComplete: () => {
                                overlay.destroy();
                                title.destroy();
                                countdownText.destroy();

                                // Start the actual game
                                this.startPhase(0);
                            },
                        });
                    });
                }
            },
            loop: true,
        });
    }

    // ==================== END TUTORIAL SYSTEM ====================

    update(time) {
        // Input por teclado
        if (
            Phaser.Input.Keyboard.JustDown(this.keyA) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.left)
        ) {
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
                this.onOrbitChanged();
            }
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.keyD) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.right)
        ) {
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
                this.onOrbitChanged();
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
            const adjustedSpeed =
                this.rotationSpeed * (BASE_ORBIT / this.orbitRadius);
            this.angle += adjustedSpeed;

            this.ship.x =
                this.centerX + Math.cos(this.angle) * this.orbitRadius;
            this.ship.y =
                this.centerY + Math.sin(this.angle) * this.orbitRadius;
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

            this.shipVelocity = adjustedSpeed * 120;
        }

        // Fundo dinamico com parallax
        if (this.starLayers) {
            this.starLayers.forEach((layer) => {
                layer.obj.x -= this.shipVelocity * layer.speed;

                if (layer.obj.x < -this.scale.width) layer.obj.x = 0;
                if (layer.obj.x > this.scale.width) layer.obj.x = 0;
            });
        }

        if (this.nebulaGlow) {
            this.nebulaGlow.alpha = 0.1 + Math.abs(Math.sin(time / 1000) * 0.1);
        }

        // Movimento dos meteoros
        this.meteors.getChildren().forEach((meteor) => {
            meteor.angle += meteor.speed * meteor.direction;
            meteor.x =
                this.centerX + Math.cos(meteor.angle) * meteor.orbitRadius;
            meteor.y =
                this.centerY + Math.sin(meteor.angle) * meteor.orbitRadius;
        });

        // Checa colisões
        this.checkCollisions();
    }
}
