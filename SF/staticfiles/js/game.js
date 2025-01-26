app.controller('GameController', function($scope, $http) {
    $scope.players = [];
    $scope.messages = [];
    $scope.newMessage = '';
    let gameSocket = null;
    
    // Initialize game state
    const initGame = () => {
        const gameId = window.location.pathname.split('/').filter(Boolean).pop();
        gameSocket = new WebSocket(
            `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/game/${gameId}/`
        );

        gameSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleGameEvent(data);
        };
    };

    // Handle game events from WebSocket
    const handleGameEvent = (data) => {
        switch (data.action) {
            case 'move':
                game.events.emit('playerMove', data);
                break;
            case 'attack':
                game.events.emit('playerAttack', data);
                break;
            case 'chat':
                $scope.$apply(() => {
                    $scope.messages.push(data.message);
                });
                break;
        }
    };

    // Send chat message
    $scope.sendMessage = () => {
        if ($scope.newMessage.trim()) {
            gameSocket.send(JSON.stringify({
                action: 'chat',
                message: $scope.newMessage
            }));
            $scope.newMessage = '';
        }
    };

    // Phaser game configuration
    const config = {
        type: Phaser.AUTO,
        parent: 'gameCanvas',
        width: 800,
        height: 600,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 300 },
                debug: false
            }
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    function preload() {
        this.load.image('sky', '/static/img/game/sky.png');
        this.load.image('ground', '/static/img/game/platform.png');
        this.load.spritesheet('warrior', '/static/img/game/warrior.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('archer', '/static/img/game/archer.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('mage', '/static/img/game/mage.png', { frameWidth: 32, frameHeight: 48 });
        this.load.spritesheet('bandit', '/static/img/game/bandit.png', { frameWidth: 32, frameHeight: 48 });
    }

    function create() {
        // Add game world
        this.add.image(400, 300, 'sky');
        
        // Add platforms
        const platforms = this.physics.add.staticGroup();
        platforms.create(400, 568, 'ground').setScale(2).refreshBody();
        platforms.create(600, 400, 'ground');
        platforms.create(50, 250, 'ground');
        platforms.create(750, 220, 'ground');

        // Add player
        this.player = this.physics.add.sprite(100, 450, 'warrior');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        
        // Add bandits
        this.bandits = this.physics.add.group({
            key: 'bandit',
            repeat: 3,
            setXY: { x: 200, y: 0, stepX: 150 }
        });

        // Colliders
        this.physics.add.collider(this.player, platforms);
        this.physics.add.collider(this.bandits, platforms);
        
        // Player animations
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('warrior', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'turn',
            frames: [ { key: 'warrior', frame: 4 } ],
            frameRate: 20
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('warrior', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Attack key
        this.input.keyboard.on('keydown-SPACE', () => {
            // Send attack event
            gameSocket.send(JSON.stringify({
                action: 'attack',
                position: {
                    x: this.player.x,
                    y: this.player.y
                }
            }));
        });
    }

    function update() {
        // Player movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.anims.play('left', true);
            
            gameSocket.send(JSON.stringify({
                action: 'move',
                position: {
                    x: this.player.x,
                    y: this.player.y
                }
            }));
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.player.anims.play('right', true);
            
            gameSocket.send(JSON.stringify({
                action: 'move',
                position: {
                    x: this.player.x,
                    y: this.player.y
                }
            }));
        }
        else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-330);
        }
    }

    // Start the game
    const game = new Phaser.Game(config);
    
    // Initialize WebSocket connection
    initGame();
});
