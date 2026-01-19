import { EventBus } from "../EventBus";
import { Scene } from "phaser";
import {
    ORBITS,
    BASE_ORBIT,
    PHASES,
    SPAWN_TIMING,
    SPRITE_SIZES,
    COLLISION,
    ITEM_VALUES,
    FUEL,
    COLORS,
    HUD,
    BUTTONS,
    METEORS,
    COLLECTIBLES,
    TUTORIAL,
    ORBIT_MECHANICS,
    TRAIL,
} from "../../config/gameConfig";

// Tutorial steps configuration
const TUTORIAL_STEPS = [
    {
        id: "welcome",
        message:
            "Bem-vindo, piloto! Sou seu comandante de missão. Vou te guiar nesta primeira órbita de treino.",
        waitForAction: false,
        delay: 3000,
    },
    {
        id: "orbit_explain",
        message:
            "Use os propulsores laterais para mudar de órbita! Clique em INNER ou OUTER para navegar.",
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
        message:
            "A órbita INTERNA é uma zona SEGURA - meteoros não aparecem lá! Use-a para se proteger.",
        waitForAction: false,
        delay: 4000,
    },
    {
        id: "fuel_explain",
        message:
            "Veja a barra LARANJA? É seu combustível - ele está acabando! Colete o ITEM PULSANTE para reabastecer!",
        waitForAction: true,
        actionType: "collect_fuel",
        highlight: "fuel",
        spawnItem: "fuel",
    },
    {
        id: "fuel_success",
        message:
            "Excelente! Combustível reabastecido! Sem ele sua nave para E VOCE PERDE O JOGO.",
        waitForAction: false,
        delay: 2500,
        showThumbsUp: true,
    },
    {
        id: "mineral_explain",
        message:
            "Agora colete o MINERAL PULSANTE! Preencha a barra azul para completar cada fase.",
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
        message:
            "Tutorial completo! Boa sorte, piloto! O jogo de verdade começa agora!",
        waitForAction: false,
        delay: 3000,
        isFinal: true,
    },
];

const TUTORIAL_TYPE_SPEED = TUTORIAL.TYPE_SPEED;
const TUTORIAL_DELAY_MULTIPLIER = TUTORIAL.DELAY_MULTIPLIER;

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
        this.score = 0;
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
            delay: SPAWN_TIMING.FUEL_STAR_DELAY,
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
            Phaser.Input.Keyboard.KeyCodes.A,
        );
        this.keyD = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.D,
        );

        // 8. Spawners
        this.meteorEvent = this.time.addEvent({
            delay: PHASES[0].meteorSpawnDelay,
            callback: this.spawnMeteor,
            callbackScope: this,
            loop: true,
        });

        this.mineralEvent = this.time.addEvent({
            delay: SPAWN_TIMING.MINERAL_DELAY,
            callback: this.spawnMineral,
            callbackScope: this,
            loop: true,
        });

        // 9. Consumo de combustível
        this.fuelConsumptionEvent = this.time.addEvent({
            delay: SPAWN_TIMING.FUEL_CONSUMPTION_DELAY,
            callback: this.consumeFuel,
            callbackScope: this,
            loop: true,
        });

        // 10. PRIMEIRO remove listeners antigos e registra o novo listener
        EventBus.removeListener("send-pilot-data");
        this.pilotDataHandler = (pilot) => {
            console.log("Game.js recebeu pilot data:", pilot);
            this.setupPlayer(pilot);
        };
        EventBus.on("send-pilot-data", this.pilotDataHandler);

        // 11. DEPOIS avisa o React que está pronto (React vai responder com send-pilot-data)
        EventBus.emit("current-scene-ready", this);
    }

    shutdown() {
        // Limpa listeners quando a cena é destruída
        if (this.pilotDataHandler) {
            EventBus.removeListener("send-pilot-data", this.pilotDataHandler);
        }
        this.scale.off("resize", this.handleResize, this);
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
        this.updateHudLayout(width, height);
        this.orbitText.setPosition(this.centerX, height - 38);
        if (this.phaseOverlay) {
            this.phaseOverlayBg.setPosition(this.centerX, this.centerY);
            this.phaseOverlayBg.setSize(width, height);
            this.phaseOverlayTitle.setPosition(this.centerX, this.centerY - 80);
            this.phaseOverlaySubtitle.setPosition(
                this.centerX,
                this.centerY - 40,
            );
            this.phaseOverlayCountdown.setPosition(
                this.centerX,
                this.centerY + 20,
            );
            this.phaseOverlayLabel.setPosition(this.centerX, this.centerY + 70);
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
                const pilotSize = this.tutorialPilotSize || 80;
                const maskGraphics = this.make.graphics();
                maskGraphics.fillCircle(
                    width - 40 - 50,
                    80 + panelHeight / 2,
                    pilotSize / 2,
                );
                this.tutorialPilotImage.setMask(
                    maskGraphics.createGeometryMask(),
                );
            }
        }

        // Update highlight positions if visible
        if (this.fuelHighlight && this.fuelHighlight.visible) {
            this.fuelHighlight.clear();
            this.fuelHighlight.lineStyle(3, 0xffff00, 1);
            this.fuelHighlight.strokeCircle(
                this.hudFuelX,
                this.hudGaugeY,
                this.hudGaugeRadius + 8,
            );
        }
        if (this.mineralHighlight && this.mineralHighlight.visible) {
            this.mineralHighlight.clear();
            this.mineralHighlight.lineStyle(3, 0xffff00, 1);
            this.mineralHighlight.strokeCircle(
                this.hudMineralX,
                this.hudGaugeY,
                this.hudGaugeRadius + 8,
            );
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
        this.backgroundImage = this.add.image(
            this.centerX,
            this.centerY,
            "game_bg",
        );

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
            ORBITS.INNER,
        );

        this.orbitGraphics.lineStyle(1, 0xffffff, 0.2);
        this.orbitGraphics.strokeCircle(
            this.centerX,
            this.centerY,
            ORBITS.MIDDLE,
        );

        this.orbitGraphics.lineStyle(1, 0xffffff, 0.15);
        this.orbitGraphics.strokeCircle(
            this.centerX,
            this.centerY,
            ORBITS.OUTER,
        );
    }

    spawnFuelStar() {
        if (
            this.isGameOver ||
            this.isPhaseTransition ||
            !this.pilotData ||
            this.isTutorialActive
        )
            return;

        // Escolhe órbita e posição aleatória
        const orbitKeys = Object.keys(ORBITS);
        const randomOrbit =
            orbitKeys[Phaser.Math.Between(0, orbitKeys.length - 1)];
        const radius = ORBITS[randomOrbit];
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;

        const star = this.add.image(x, y, "fuel");
        const starSize = SPRITE_SIZES.FUEL;
        star.setDisplaySize(starSize, starSize);
        star.setAlpha(0.8);
        star.orbitRadius = radius;
        star.angle = angle;
        star.fuelValue = ITEM_VALUES.FUEL_STAR; // Cada estrela dá combustível

        // Efeito de brilho suave
        const baseScale = star.scaleX;
        this.tweens.add({
            targets: star,
            alpha: 0.4,
            scale: baseScale * 0.85,
            duration: 500,
            yoyo: true,
            loop: -1,
        });

        this.fuelStars.add(star);

        // Remove após tempo definido
        this.time.delayedCall(COLLECTIBLES.FUEL_STAR_LIFETIME, () => {
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
        const targetSize = SPRITE_SIZES.PLANET_TARGET;
        const uniformScale = targetSize / maxDimension;
        this.planet.setScale(uniformScale);

        this.planetContainer.add([this.planet]);
    }

    createHUD() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.hudGaugeRadius = HUD.GAUGE_RADIUS;
        this.hudGaugeThickness = HUD.GAUGE_THICKNESS;
        const gaugeOffset = this.hudGaugeRadius + HUD.GAUGE_OFFSET;
        const gaugeY = HUD.GAUGE_Y;

        this.hudGaugeY = gaugeY;
        this.hudFuelX = gaugeOffset;
        this.hudMineralX = width - gaugeOffset;

        this.fuelGaugeBg = this.add.circle(
            this.hudFuelX,
            this.hudGaugeY,
            this.hudGaugeRadius - this.hudGaugeThickness,
            0x0f0f0f,
            0.8,
        );
        this.fuelGaugeRing = this.add.graphics();
        this.fuelGaugeText = this.add
            .text(this.hudFuelX, this.hudGaugeY, "0%", {
                fontSize: "16px",
                color: COLORS.TEXT_PRIMARY,
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        this.hudLabelOffset = 42;
        this.fuelGaugeLabel = this.add
            .text(this.hudFuelX, this.hudGaugeY + this.hudLabelOffset, "COMBUSTÍVEL", {
                fontSize: "9px",
                color: COLORS.TEXT_DARK,
                fontFamily: "Orbitron, monospace",
            })
            .setOrigin(0.5);

        this.mineralGaugeBg = this.add.circle(
            this.hudMineralX,
            this.hudGaugeY,
            this.hudGaugeRadius - this.hudGaugeThickness,
            0x0f0f0f,
            0.8,
        );
        this.mineralGaugeRing = this.add.graphics();
        this.mineralGaugeText = this.add
            .text(this.hudMineralX, this.hudGaugeY, "0", {
                fontSize: "16px",
                color: COLORS.TEXT_SECONDARY,
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        this.mineralGaugeLabel = this.add
            .text(this.hudMineralX, this.hudGaugeY + this.hudLabelOffset, "MINERAL", {
                fontSize: "9px",
                color: COLORS.TEXT_DARK,
                fontFamily: "Orbitron, monospace",
            })
            .setOrigin(0.5);

        this.scoreText = this.add
            .text(this.centerX, this.hudGaugeY, "SCORE 0", {
                fontSize: "16px",
                color: COLORS.TEXT_LIGHT,
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        // Indicador de órbita
        this.orbitText = this.add
            .text(this.centerX, height - 38, "ÓRBITA: MÉDIA", {
                fontSize: "14px",
                color: "#555",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        this.updateFuelBar();
        this.updateMineralBar();
        this.updateScoreText();

        // Botões touch para mobile
        this.createTouchControls();
    }

    createPhaseOverlay() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.phaseOverlayBg = this.add
            .rectangle(
                this.centerX,
                this.centerY,
                width,
                height,
                0x000000,
                0.55,
            )
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
                color: COLORS.TEXT_LIGHT,
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
        const btnY = height - BUTTONS.BOTTOM_Y_OFFSET;
        const btnLeftX = BUTTONS.LEFT_X;
        const btnRightX = width - BUTTONS.RIGHT_X_OFFSET;

        this.btnLeftGlow = this.add
            .circle(btnLeftX, btnY, BUTTONS.GLOW_RADIUS, COLORS.PRIMARY, 0.2)
            .setBlendMode(Phaser.BlendModes.ADD);
        // Botão esquerda (aproximar do planeta)
        this.btnLeft = this.add.circle(btnLeftX, btnY, BUTTONS.RADIUS, COLORS.BUTTON, 0.6);
        this.btnLeft.setStrokeStyle(2, COLORS.PRIMARY, 0.5);
        this.btnLeft.setInteractive();

        this.arrowLeft = this.add.triangle(
            btnLeftX,
            btnY,
            15,
            0,
            0,
            12,
            15,
            24,
            COLORS.PRIMARY,
        );
        this.arrowLeft.setAngle(-90);

        this.btnLeft.on("pointerdown", () => {
            if (this.isGameOver) return;
            this.moveToInnerOrbit();
            this.btnLeft.setFillStyle(COLORS.BUTTON_HOVER, 0.8);
        });
        this.btnLeft.on("pointerup", () =>
            this.btnLeft.setFillStyle(COLORS.BUTTON, 0.6),
        );
        this.btnLeft.on("pointerout", () =>
            this.btnLeft.setFillStyle(COLORS.BUTTON, 0.6),
        );

        this.btnRightGlow = this.add
            .circle(btnRightX, btnY, BUTTONS.GLOW_RADIUS, COLORS.PRIMARY, 0.2)
            .setBlendMode(Phaser.BlendModes.ADD);
        // Botão direita (afastar do planeta)
        this.btnRight = this.add.circle(btnRightX, btnY, BUTTONS.RADIUS, COLORS.BUTTON, 0.6);
        this.btnRight.setStrokeStyle(2, COLORS.PRIMARY, 0.5);
        this.btnRight.setInteractive();

        this.arrowRight = this.add.triangle(
            btnRightX,
            btnY,
            15,
            0,
            0,
            12,
            15,
            24,
            COLORS.PRIMARY,
        );
        this.arrowRight.setAngle(90);

        this.btnRight.on("pointerdown", () => {
            if (this.isGameOver) return;
            this.moveToOuterOrbit();
            this.btnRight.setFillStyle(COLORS.BUTTON_HOVER, 0.8);
        });
        this.btnRight.on("pointerup", () =>
            this.btnRight.setFillStyle(COLORS.BUTTON, 0.6),
        );
        this.btnRight.on("pointerout", () =>
            this.btnRight.setFillStyle(COLORS.BUTTON, 0.6),
        );

        // Labels dos botões
        this.innerLabel = this.add
            .text(btnLeftX, btnY + BUTTONS.LABEL_OFFSET, "INNER", {
                fontSize: "10px",
                color: "#555",
                fontFamily: "monospace",
            })
            .setOrigin(0.5);

        this.outerLabel = this.add
            .text(btnRightX, btnY + BUTTONS.LABEL_OFFSET, "OUTER", {
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
        this.time.delayedCall(SPAWN_TIMING.ORBIT_COOLDOWN, () => {
            this.orbitCooldown = false;
        });
    }

    setupPlayer(pilot) {
        this.pilotData = pilot;

        // Inicializa combustível baseado no piloto
        this.fuel = pilot.fuelMax;
        this.maxFuel = pilot.fuelMax;

        // Cria a nave (imagem) - posição inicial na órbita média
        const startX = this.centerX + Math.cos(this.angle) * this.orbitRadius;
        const startY = this.centerY + Math.sin(this.angle) * this.orbitRadius;
        const shipTextureMap = {
            kaio: "ship_kaio",
            cesar: "ship_cesar",
            kyra: "ship_kyra",
        };
        const shipTextureKey = shipTextureMap[pilot.id] || "ship_kaio";

        this.ship = this.add.image(startX, startY, shipTextureKey);
        const shipTargetSize = SPRITE_SIZES.SHIP_TARGET;
        const shipTexture = this.textures.get(shipTextureKey);
        const shipSource = shipTexture.getSourceImage();
        if (shipSource?.width && shipSource?.height) {
            const maxDimension = Math.max(shipSource.width, shipSource.height);
            const scale = shipTargetSize / maxDimension;
            this.ship.setScale(scale);
        } else {
            this.ship.setDisplaySize(shipTargetSize, shipTargetSize);
        }

        const shipRotationMap = {
            kaio: -Math.PI / 2,
            cesar: Math.PI / 2,
            kyra: Math.PI,
        };
        this.ship.setRotation(shipRotationMap[pilot.id] ?? 0);

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
            this.centerY,
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
        if (
            this.isGameOver ||
            this.isPhaseTransition ||
            !this.pilotData ||
            this.isTutorialActive
        )
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
        const meteor = this.add.image(x, y, "asteroid");
        const meteorSize = Phaser.Math.Between(METEORS.SIZE_MIN, METEORS.SIZE_MAX);
        meteor.setDisplaySize(meteorSize, meteorSize);
        meteor.orbitRadius = radius;
        meteor.angle = angle;
        meteor.speed = Phaser.Math.FloatBetween(METEORS.SPEED_MIN, METEORS.SPEED_MAX);
        meteor.direction = Math.random() > 0.5 ? 1 : -1; // Direção aleatória

        this.meteors.add(meteor);

        // Remove após tempo definido
        this.time.delayedCall(METEORS.LIFETIME, () => {
            if (meteor && meteor.active) {
                meteor.destroy();
            }
        });
    }

    spawnMineral() {
        if (
            this.isGameOver ||
            this.isPhaseTransition ||
            !this.pilotData ||
            this.isTutorialActive
        )
            return;

        // Escolhe órbita e posição
        const orbitKeys = Object.keys(ORBITS);
        const randomOrbit =
            orbitKeys[Phaser.Math.Between(0, orbitKeys.length - 1)];
        const radius = ORBITS[randomOrbit];
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

        const x = this.centerX + Math.cos(angle) * radius;
        const y = this.centerY + Math.sin(angle) * radius;

        // Mineral image
        const mineral = this.add.image(x, y, "mineral");
        const mineralSize = SPRITE_SIZES.MINERAL;
        mineral.setDisplaySize(mineralSize, mineralSize);
        mineral.orbitRadius = radius;
        mineral.angle = angle;
        mineral.value = ITEM_VALUES.MINERAL; // Cada mineral vale 1 unidade

        // Efeito de brilho
        const baseScale = mineral.scaleX;
        this.tweens.add({
            targets: mineral,
            scale: baseScale * 1.2,
            alpha: 0.7,
            duration: 500,
            yoyo: true,
            loop: -1,
        });

        this.collectibles.add(mineral);

        // Remove após tempo definido
        this.time.delayedCall(COLLECTIBLES.MINERAL_LIFETIME, () => {
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
        const consumption = FUEL.CONSUMPTION_RATE;
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
                meteor.y,
            );
            if (dist < COLLISION.METEOR_RADIUS) {
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
                mineral.y,
            );
            if (dist < COLLISION.MINERAL_RADIUS) {
                // Marca como coletado imediatamente
                mineral.collected = true;

                // Adiciona mineral
                this.mineral = Math.min(
                    this.maxMineral,
                    this.mineral + mineral.value,
                );
                this.updateMineralBar();
                this.score += mineral.value;
                this.updateScoreText();

                // Efeito de coleta
                this.tweens.add({
                    targets: mineral,
                    scale: 2,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => mineral.destroy(),
                });

                // Check if tutorial mineral collected
                if (
                    mineral.isTutorialItem &&
                    this.isTutorialActive &&
                    this.tutorialWaitingForAction
                ) {
                    const currentStep = TUTORIAL_STEPS[this.tutorialStep];
                    if (
                        currentStep &&
                        currentStep.actionType === "collect_mineral"
                    ) {
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
                star.y,
            );
            if (dist < COLLISION.FUEL_RADIUS) {
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
                if (
                    star.isTutorialItem &&
                    this.isTutorialActive &&
                    this.tutorialWaitingForAction
                ) {
                    const currentStep = TUTORIAL_STEPS[this.tutorialStep];
                    if (
                        currentStep &&
                        currentStep.actionType === "collect_fuel"
                    ) {
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

        const width = this.scale.width;
        const height = this.scale.height;

        // Overlay escurecido (mesmo estilo da transição de fase)
        const overlay = this.add
            .rectangle(this.centerX, this.centerY, width, height, 0x000000, 0)
            .setDepth(1001);

        // Anima o overlay escurecendo
        this.tweens.add({
            targets: overlay,
            fillAlpha: 0.7,
            duration: 500,
            ease: "Power2",
        });

        // Container para os elementos do game over
        const gameOverContainer = this.add.container(this.centerX, this.centerY);
        gameOverContainer.setDepth(1002);
        gameOverContainer.setAlpha(0);

        // Título "MISSÃO FALHOU"
        const title = this.add
            .text(0, -100, "MISSÃO FALHOU", {
                fontSize: "42px",
                color: "#ff0000",
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        gameOverContainer.add(title);

        // Motivo
        const reasonText = this.add
            .text(0, -50, reason, {
                fontSize: "16px",
                color: "#888888",
                fontFamily: "Orbitron, monospace",
            })
            .setOrigin(0.5);
        gameOverContainer.add(reasonText);

        // Pontuação
        const scoreText = this.add
            .text(0, 0, `PONTUAÇÃO FINAL: ${this.score}`, {
                fontSize: "20px",
                color: "#ff6a00",
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        gameOverContainer.add(scoreText);

        // Botões estilizados (mesmo estilo dos botões de início)
        const btnWidth = 220;
        const btnHeight = 50;
        const btnSpacing = 70;

        // Botão "TENTAR NOVAMENTE"
        const retryBtnBg = this.add.graphics();
        retryBtnBg.fillStyle(0x333333, 0.9);
        retryBtnBg.fillRoundedRect(-btnWidth / 2, 60, btnWidth, btnHeight, 10);
        retryBtnBg.lineStyle(2, COLORS.PRIMARY, 1);
        retryBtnBg.strokeRoundedRect(-btnWidth / 2, 60, btnWidth, btnHeight, 10);
        gameOverContainer.add(retryBtnBg);

        const retryBtnText = this.add
            .text(0, 60 + btnHeight / 2, "TENTAR NOVAMENTE", {
                fontSize: "14px",
                color: "#ffffff",
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        gameOverContainer.add(retryBtnText);

        const retryBtnHitArea = this.add
            .rectangle(0, 60 + btnHeight / 2, btnWidth, btnHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        gameOverContainer.add(retryBtnHitArea);

        retryBtnHitArea.on("pointerover", () => {
            retryBtnBg.clear();
            retryBtnBg.fillStyle(0x555555, 0.9);
            retryBtnBg.fillRoundedRect(-btnWidth / 2, 60, btnWidth, btnHeight, 10);
            retryBtnBg.lineStyle(3, COLORS.PRIMARY, 1);
            retryBtnBg.strokeRoundedRect(-btnWidth / 2, 60, btnWidth, btnHeight, 10);
            retryBtnText.setColor("#ff6a00");
        });
        retryBtnHitArea.on("pointerout", () => {
            retryBtnBg.clear();
            retryBtnBg.fillStyle(0x333333, 0.9);
            retryBtnBg.fillRoundedRect(-btnWidth / 2, 60, btnWidth, btnHeight, 10);
            retryBtnBg.lineStyle(2, COLORS.PRIMARY, 1);
            retryBtnBg.strokeRoundedRect(-btnWidth / 2, 60, btnWidth, btnHeight, 10);
            retryBtnText.setColor("#ffffff");
        });
        retryBtnHitArea.on("pointerdown", () => {
            this.startGameOverCountdown(overlay, gameOverContainer, "restart");
        });

        // Botão "FIM DE JOGO"
        const exitBtnBg = this.add.graphics();
        exitBtnBg.fillStyle(0x333333, 0.9);
        exitBtnBg.fillRoundedRect(-btnWidth / 2, 60 + btnSpacing, btnWidth, btnHeight, 10);
        exitBtnBg.lineStyle(2, 0x4da6ff, 1);
        exitBtnBg.strokeRoundedRect(-btnWidth / 2, 60 + btnSpacing, btnWidth, btnHeight, 10);
        gameOverContainer.add(exitBtnBg);

        const exitBtnText = this.add
            .text(0, 60 + btnSpacing + btnHeight / 2, "FIM DE JOGO", {
                fontSize: "14px",
                color: "#ffffff",
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        gameOverContainer.add(exitBtnText);

        const exitBtnHitArea = this.add
            .rectangle(0, 60 + btnSpacing + btnHeight / 2, btnWidth, btnHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        gameOverContainer.add(exitBtnHitArea);

        exitBtnHitArea.on("pointerover", () => {
            exitBtnBg.clear();
            exitBtnBg.fillStyle(0x555555, 0.9);
            exitBtnBg.fillRoundedRect(-btnWidth / 2, 60 + btnSpacing, btnWidth, btnHeight, 10);
            exitBtnBg.lineStyle(3, 0x4da6ff, 1);
            exitBtnBg.strokeRoundedRect(-btnWidth / 2, 60 + btnSpacing, btnWidth, btnHeight, 10);
            exitBtnText.setColor("#4da6ff");
        });
        exitBtnHitArea.on("pointerout", () => {
            exitBtnBg.clear();
            exitBtnBg.fillStyle(0x333333, 0.9);
            exitBtnBg.fillRoundedRect(-btnWidth / 2, 60 + btnSpacing, btnWidth, btnHeight, 10);
            exitBtnBg.lineStyle(2, 0x4da6ff, 1);
            exitBtnBg.strokeRoundedRect(-btnWidth / 2, 60 + btnSpacing, btnWidth, btnHeight, 10);
            exitBtnText.setColor("#ffffff");
        });
        exitBtnHitArea.on("pointerdown", () => {
            this.startGameOverCountdown(overlay, gameOverContainer, "exit");
        });

        // Animação de entrada do container
        this.tweens.add({
            targets: gameOverContainer,
            alpha: 1,
            y: this.centerY,
            duration: 500,
            delay: 300,
            ease: "Back.easeOut",
        });

        // Guarda referências para o countdown
        this.gameOverOverlay = overlay;
        this.gameOverContainer = gameOverContainer;
    }

    startGameOverCountdown(overlay, container, action) {
        // Esconde os botões e mostra contagem regressiva
        container.removeAll(true);

        // Título durante contagem
        const countdownTitle = this.add
            .text(0, -60, action === "restart" ? "REINICIANDO..." : "VOLTANDO...", {
                fontSize: "28px",
                color: "#ff6a00",
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        container.add(countdownTitle);

        // Número da contagem
        const countdownNumber = this.add
            .text(0, 20, "3", {
                fontSize: "72px",
                color: "#ffffff",
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        container.add(countdownNumber);

        let count = 3;
        const countdownEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                count--;
                if (count > 0) {
                    countdownNumber.setText(`${count}`);
                    // Animação de escala
                    this.tweens.add({
                        targets: countdownNumber,
                        scale: { from: 1.5, to: 1 },
                        duration: 300,
                        ease: "Power2",
                    });
                } else {
                    countdownEvent.remove();

                    if (action === "restart") {
                        // Mostra "GO!" apenas para reiniciar
                        countdownNumber.setText("GO!");
                        countdownNumber.setColor("#00ff00");
                        this.tweens.add({
                            targets: countdownNumber,
                            scale: { from: 2, to: 1 },
                            duration: 300,
                            ease: "Back.easeOut",
                        });

                        this.time.delayedCall(500, () => {
                            EventBus.removeListener("send-pilot-data");
                            this.registry.set("skipTutorial", true);
                            this.scene.restart();
                            EventBus.emit("current-scene-ready", this);
                        });
                    } else if (action === "exit") {
                        // Para fim de jogo, vai direto para o menu
                        EventBus.emit("return-to-menu");
                    }
                }
            },
            loop: true,
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
                    : `SETOR ${phaseNumber} CONCLUIDO!`,
            )
            .setVisible(true);

        this.phaseOverlaySubtitle
            .setText(
                isLastPhase
                    ? "Missao completa. Excelente trabalho!"
                    : "Orbita estabilizada. Bom trabalho, piloto.",
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

    updateHudLayout(width, height) {
        if (!this.hudGaugeRadius) return;

        const gaugeOffset = this.hudGaugeRadius + 28;
        this.hudGaugeY = 70;
        this.hudFuelX = gaugeOffset;
        this.hudMineralX = width - gaugeOffset;

        if (this.fuelGaugeBg) {
            this.fuelGaugeBg.setPosition(this.hudFuelX, this.hudGaugeY);
        }
        if (this.fuelGaugeText) {
            this.fuelGaugeText.setPosition(this.hudFuelX, this.hudGaugeY);
        }
        if (this.fuelGaugeLabel) {
            this.fuelGaugeLabel.setPosition(
                this.hudFuelX,
                this.hudGaugeY + (this.hudLabelOffset || 42),
            );
        }
        if (this.mineralGaugeBg) {
            this.mineralGaugeBg.setPosition(this.hudMineralX, this.hudGaugeY);
        }
        if (this.mineralGaugeText) {
            this.mineralGaugeText.setPosition(this.hudMineralX, this.hudGaugeY);
        }
        if (this.mineralGaugeLabel) {
            this.mineralGaugeLabel.setPosition(
                this.hudMineralX,
                this.hudGaugeY + (this.hudLabelOffset || 42),
            );
        }
        if (this.scoreText) {
            this.scoreText.setPosition(this.centerX, this.hudGaugeY);
        }

        this.updateFuelBar();
        this.updateMineralBar();
        this.updateScoreText();
    }

    drawGaugeRing(graphics, x, y, radius, thickness, progress, color) {
        graphics.clear();
        graphics.lineStyle(thickness, 0x333333, 0.6);
        graphics.beginPath();
        graphics.arc(x, y, radius, 0, Math.PI * 2);
        graphics.strokePath();

        const clamped = Phaser.Math.Clamp(progress, 0, 1);
        if (clamped <= 0) return;

        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + clamped * Math.PI * 2;
        graphics.lineStyle(thickness, color, 1);
        graphics.beginPath();
        graphics.arc(x, y, radius, startAngle, endAngle);
        graphics.strokePath();
    }

    updateFuelBar() {
        if (!this.fuelGaugeRing || !this.maxFuel) return;

        const fuelPercent = Phaser.Math.Clamp(
            this.fuel / this.maxFuel,
            0,
            1,
        );
        let ringColor = COLORS.FUEL;

        if (fuelPercent < 0.25) {
            ringColor = 0xff0000;
        } else if (fuelPercent < 0.5) {
            ringColor = 0xffaa00;
        }

        this.drawGaugeRing(
            this.fuelGaugeRing,
            this.hudFuelX,
            this.hudGaugeY,
            this.hudGaugeRadius,
            this.hudGaugeThickness,
            fuelPercent,
            ringColor,
        );

        if (this.fuelGaugeText) {
            const ringColorHex = ringColor.toString(16).padStart(6, "0");
            this.fuelGaugeText.setText(`${Math.round(fuelPercent * 100)}%`);
            this.fuelGaugeText.setColor(`#${ringColorHex}`);
        }
    }

    updateMineralBar() {
        if (!this.mineralGaugeRing) return;
        const progress =
            this.maxMineral > 0 ? this.mineral / this.maxMineral : 0;

        this.drawGaugeRing(
            this.mineralGaugeRing,
            this.hudMineralX,
            this.hudGaugeY,
            this.hudGaugeRadius,
            this.hudGaugeThickness,
            progress,
            COLORS.MINERAL,
        );

        if (this.mineralGaugeText) {
            this.mineralGaugeText.setText(`${this.mineral}`);
        }
    }

    updateScoreText() {
        if (!this.scoreText) return;
        this.scoreText.setText(`SCORE ${this.score}`);
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
        this.tutorialPilotSize = 80; // Circular pilot image size

        // Main background
        this.tutorialBg = this.add.graphics();
        this.tutorialBg.fillStyle(0x1a1a2e, 0.95);
        this.tutorialBg.fillRoundedRect(
            -panelWidth,
            0,
            panelWidth,
            panelHeight,
            12,
        );
        this.tutorialBg.lineStyle(2, COLORS.PRIMARY, 0.8);
        this.tutorialBg.strokeRoundedRect(
            -panelWidth,
            0,
            panelWidth,
            panelHeight,
            12,
        );
        this.tutorialContainer.add(this.tutorialBg);

        // Pilot image container (circular frame) - on the right side of panel
        this.pilotFrame = this.add.graphics();
        this.pilotFrame.fillStyle(0x0a0a15, 1);
        this.pilotFrame.fillCircle(
            -50,
            panelHeight / 2,
            this.tutorialPilotSize / 2 + 4,
        );
        this.pilotFrame.lineStyle(3, COLORS.PRIMARY, 1);
        this.pilotFrame.strokeCircle(
            -50,
            panelHeight / 2,
            this.tutorialPilotSize / 2 + 4,
        );
        this.tutorialContainer.add(this.pilotFrame);

        // Pilot image - circular images fill the frame completely
        this.tutorialPilotImage = this.add.image(
            -50,
            panelHeight / 2,
            "pilot_kaio",
        );
        this.applyPilotImageSizing();
        // Create circular mask for pilot image
        const maskGraphics = this.make.graphics();
        maskGraphics.fillCircle(
            width - 40 - 50,
            80 + panelHeight / 2,
            this.tutorialPilotSize / 2,
        );
        this.tutorialPilotImage.setMask(maskGraphics.createGeometryMask());
        this.tutorialContainer.add(this.tutorialPilotImage);

        // Speech bubble triangle pointing to pilot
        this.speechTriangle = this.add.triangle(
            -100,
            panelHeight / 2,
            0,
            0,
            12,
            -8,
            12,
            8,
            0x1a1a2e,
        );
        this.tutorialContainer.add(this.speechTriangle);

        // Message text area (to the left of pilot)
        this.tutorialText = this.add.text(-panelWidth + 15, 15, "", {
            fontSize: "12px",
            color: "#ffffff",
            fontFamily: "Orbitron, monospace",
            wordWrap: { width: panelWidth - 115 },
            lineSpacing: 3,
        });
        this.tutorialContainer.add(this.tutorialText);

        // Pilot name label
        this.tutorialPilotName = this.add.text(
            -panelWidth + 15,
            panelHeight - 25,
            "",
            {
                fontSize: "10px",
                color: "#ff6a00",
                fontFamily: "Orbitron, monospace",
                fontStyle: "bold",
            },
        );
        this.tutorialContainer.add(this.tutorialPilotName);

        // Continue indicator (for non-action steps)
        this.tutorialContinue = this.add.text(
            -panelWidth / 2 - 20,
            panelHeight - 18,
            "",
            {
                fontSize: "9px",
                color: "#666666",
                fontFamily: "Orbitron, monospace",
            },
        );
        this.tutorialContainer.add(this.tutorialContinue);

        // Thumbs up emoji for success feedback
        this.tutorialThumbsUp = this.add
            .text(-50, panelHeight / 2, "👍", {
                fontSize: "36px",
            })
            .setOrigin(0.5);
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

        this.applyPilotImageSizing();

        // Update pilot name
        if (this.tutorialPilotName) {
            this.tutorialPilotName.setText(`- ${this.pilotData.pilot}`);
        }

        // Update mask position for circular crop
        const width = this.scale.width;
        const panelHeight = 130;
        const maskGraphics = this.make.graphics();
        maskGraphics.fillCircle(
            width - 40 - 50,
            80 + panelHeight / 2,
            this.tutorialPilotSize / 2,
        );
        this.tutorialPilotImage.setMask(maskGraphics.createGeometryMask());
    }

    applyPilotImageSizing() {
        if (!this.tutorialPilotImage) return;

        const pilotSize = this.tutorialPilotSize || 80;
        const texture = this.textures.get(this.tutorialPilotImage.texture.key);
        const source = texture.getSourceImage();

        if (source?.width && source?.height) {
            const scale = pilotSize / Math.min(source.width, source.height);
            this.tutorialPilotImage.setScale(scale);
        } else {
            this.tutorialPilotImage.setDisplaySize(pilotSize, pilotSize);
        }
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
                this.time.delayedCall(
                    step.delay * TUTORIAL_DELAY_MULTIPLIER,
                    () => {
                        if (
                            this.isTutorialActive &&
                            !this.tutorialWaitingForAction
                        ) {
                            this.advanceTutorial();
                        }
                    },
                );
            }
        }
    }

    spawnTutorialItem(type) {
        if (!this.ship) return;

        // Spawn in a different orbit to force the player to move
        const orbitKeys = Object.keys(ORBITS);
        const currentOrbitKey = orbitKeys.find(
            (key) => ORBITS[key] === this.orbitRadius,
        );
        const availableOrbits = orbitKeys.filter(
            (key) => key !== currentOrbitKey,
        );
        const targetOrbitKey =
            availableOrbits[
                Phaser.Math.Between(0, availableOrbits.length - 1)
            ] || currentOrbitKey;
        const radius = ORBITS[targetOrbitKey] ?? this.orbitRadius;

        // Spawn item ahead of the ship
        const spawnAngle = this.angle + 0.8;

        const x = this.centerX + Math.cos(spawnAngle) * radius;
        const y = this.centerY + Math.sin(spawnAngle) * radius;

        if (type === "fuel") {
            const star = this.add.image(x, y, "fuel");
            const starSize = SPRITE_SIZES.FUEL + 6;
            star.setDisplaySize(starSize, starSize);
            star.setAlpha(1);
            star.orbitRadius = radius;
            star.angle = spawnAngle;
            star.fuelValue = ITEM_VALUES.FUEL_STAR_TUTORIAL;
            star.isTutorialItem = true;

            // Larger glow effect
            const baseScale = star.scaleX;
            this.tweens.add({
                targets: star,
                alpha: 0.6,
                scale: baseScale * 1.2,
                duration: 400,
                yoyo: true,
                repeat: -1,
            });

            this.fuelStars.add(star);
        } else if (type === "mineral") {
            const mineral = this.add.image(x, y, "mineral");
            const mineralSize = SPRITE_SIZES.MINERAL + 6;
            mineral.setDisplaySize(mineralSize, mineralSize);
            mineral.orbitRadius = radius;
            mineral.angle = spawnAngle;
            mineral.value = 1;
            mineral.isTutorialItem = true;

            const baseScale = mineral.scaleX;
            this.tweens.add({
                targets: mineral,
                scale: baseScale * 1.25,
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
        const typeSpeed = TUTORIAL_TYPE_SPEED;

        if (this.typewriterEvent) {
            this.typewriterEvent.remove();
        }

        this.typewriterEvent = this.time.addEvent({
            delay: typeSpeed,
            callback: () => {
                if (charIndex < fullText.length) {
                    this.tutorialText.setText(
                        fullText.substring(0, charIndex + 1),
                    );
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
            this.fuelHighlight.strokeCircle(
                this.hudFuelX,
                this.hudGaugeY,
                this.hudGaugeRadius + 8,
            );
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
            this.mineralHighlight.strokeCircle(
                this.hudMineralX,
                this.hudGaugeY,
                this.hudGaugeRadius + 8,
            );
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
            0.7,
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
                    }`,
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
                    }`,
                );
                this.onOrbitChanged();
            }
        }

        // Suaviza transição de órbita
        this.orbitRadius = Phaser.Math.Linear(
            this.orbitRadius,
            this.targetOrbitRadius,
            ORBIT_MECHANICS.TRANSITION_FACTOR,
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
            if (this.trailPositions.length > TRAIL.MAX_LENGTH) {
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
