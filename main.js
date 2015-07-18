var Game, GameState;

Game = {
    name: "Fluppy Bird",
    html: {
        id: "gameDiv"
    },
    css: {
        bgcolor: "#FF0000",
        bird: {
            anchor: {
                x: -0.2,
                y: 0.5
            }
        },
        score: {
            x: 20,
            y: 20,
            font: "30px Arial",
            color: "#FFFFFF"
        }
    },
    body: {
        width: 1280,
        height: 720
    },
    physics: {
        fall: {
            speed: 1000,
            angle: 20,
            step: 1
        },
        jump: {
            speed: -350,
            angle: -20,
            time: 100
        },
        pipe: {
            total: 10,
            speed: -200
        },
        game_speed: 1500
    },
    setpercolumn: {
        pipe: 8,
        hole: 4
    },
    key: {
        jump: 13,
        sound: 32
    },
    sound: {
        active: false,
        jump: {
            name: "jump",
            path: "assets/jump.wav",
            duration: 10
        },
        dead: {
            name: "dead",
            path: "assets/dead.wav",
            duration: 5000
        },
        play: function(sound)
        {
            if(Game.sound.active)
            {
                var player = document.getElementById(sound.name);
                if(player)
                {
                    player.play();
                }
                else
                {
                    Game.debug.print("no player for " + sound.name);
                }
            }
        },
        toggle: function()
        {
            Game.sound.active = !(Game.sound.active);
        }
    },
    image: {
        bird: {
            name: "bird",
            path: "assets/bird.png",
            dimension: {
                width: 50,
                height: 50
            }
        },
        pipe: {
            name: "pipe",
            path: "assets/pipe.png",
            top: 10,
            margin: 10,
            dimension: {
                width: 50,
                height: 50
            }
        }
    },
    dimension: {
        width: 400,
        height: 0 //see calculateHeight
    },
    debug: {
        active: true,
        print: function(text)
        {
            if(Game.debug.active)
            {
                window["console"].log(text);
            }
        }
    },
    state: {
        name: "main"
    },
    alignHTML: function()
    {
        var gameDiv = document.getElementById(Game.html.id);
        gameDiv.style.width = Game.dimension.width + "px";
        gameDiv.style.height = Game.dimension.height + "px";
        gameDiv.style.marginLeft = (Game.body.width - Game.dimension.width) / 2 + "px";
        gameDiv.style.marginTop = (Game.body.height - Game.dimension.height) / 2 + "px";
    },
    calculateHeight: function()
    {
        Game.dimension.height = Game.image.pipe.top + Game.setpercolumn.pipe * (Game.image.pipe.margin + Game.image.pipe.dimension.height);
    },
    handleKey: function(event)
    {
        if(event.keyCode == this.key.sound)
        {
            this.sound.toggle();
        }
    },
    init: function()
    {
        this.calculateHeight();
        this.alignHTML();
        this.game = new Phaser.Game(this.dimension.width, this.dimension.height, Phaser.AUTO, this.html.id);
        this.game.state.add(this.state.name, GameState);
        this.game.state.start(this.state.name);
        var self = this;
        window.onkeydown = function(event)
        {
            self.handleKey(event);
        }
    }
}

GameState = {
    preload: function()
    {
        Game.game.stage.backgroundColor = Game.css.bgcolor;
        Game.game.load.image(Game.image.bird.name, Game.image.bird.path);
        Game.game.load.image(Game.image.pipe.name, Game.image.pipe.path);
        Game.game.load.audio(Game.sound.jump.name, Game.sound.jump.path);
        Game.game.load.audio(Game.sound.dead.name, Game.sound.dead.path);
    },
    create: function()
    {
        Game.game.physics.startSystem(Phaser.Physics.ARCADE);
        
        this.pipes = Game.game.add.group();
        this.pipes.enableBody = true;
        this.pipes.createMultiple(Game.physics.pipe.total, Game.image.pipe.name);
        this.timer = Game.game.time.events.loop(Game.physics.game_speed, this.addRowOfPipes, this);

        this.bird = Game.game.add.sprite(Game.dimension.width / 4, Game.dimension.height / 2, Game.image.bird.name);
        Game.game.physics.arcade.enable(this.bird);
        this.bird.body.gravity.y = Game.physics.fall.speed;

        // New anchor position
        this.bird.anchor.setTo(Game.css.bird.anchor.x, Game.css.bird.anchor.y);
 
        var jumpKey = Game.game.input.keyboard.addKey(Game.key.jump);
        jumpKey.onDown.add(this.jump, this);

        this.score = 0;
        this.labelScore = Game.game.add.text(Game.css.score.x, Game.css.score.y, this.score.toString(), {font: Game.css.score.font, fill: Game.css.score.color});

        this.jumpSound = Game.game.add.audio(Game.sound.jump.name);
        this.deadSound = Game.game.add.audio(Game.sound.dead.name);

        this.isStarting = false;
    },
    update: function()
    {
        if(this.bird.inWorld == false)
        {
            this.hitPipe();
            this.restartGame();
        }

        Game.game.physics.arcade.overlap(this.bird, this.pipes, this.hitPipe, null, this); 

        // Slowly rotate the bird downward, up to a certain point.
        if(this.bird.angle < Game.physics.fall.angle)
            this.bird.angle += Game.physics.fall.step;
    },
    jump: function()
    {
        // If the bird is dead, he can't jump
        if (this.bird.alive == false)
            return;

        this.bird.body.velocity.y = Game.physics.jump.speed;

        // Jump animation
        Game.game.add.tween(this.bird).to({angle: Game.physics.jump.angle}, Game.physics.jump.time).start();

        Game.sound.play(Game.sound.jump);
    },
    hitPipe: function()
    {
        // If the bird has already hit a pipe, we have nothing to do
        if (this.bird.alive == false)
            return;

        // Set the alive property of the bird to false
        this.bird.alive = false;

        // Prevent new pipes from appearing
        Game.game.time.events.remove(this.timer);
    
        // Go through all the pipes, and stop their movement
        this.pipes.forEachAlive
        (
            function(p)
            {
                p.body.velocity.x = 0;
            },
            this
        );
    },
    restartGame: function()
    {
        if(this.isStarting)
            return;
        this.isStarting = true;
        Game.sound.play(Game.sound.dead);
        setTimeout(
            function(){
                Game.game.state.start(Game.state.name);
                this.isStarting = false;
            },
            Game.sound.dead.duration);
    },
    addOnePipe: function(x, y)
    {
        var pipe = this.pipes.getFirstDead();
        pipe.reset(x, y);
        pipe.body.velocity.x = Game.physics.pipe.speed;
        pipe.checkWorldBounds = true;
        pipe.outOfBoundsKill = true;
    },
    addRowOfPipes: function()
    {
        var hole = Math.floor(Math.random()*(Game.setpercolumn.pipe - Game.setpercolumn.hole + 1));
        var x,y;
        x = Game.dimension.width;
        for (var i=0; i<Game.setpercolumn.pipe; i++)
        {
            if(i < hole || i >= hole + Game.setpercolumn.hole)
            {
                y = i * (Game.image.pipe.dimension.height + Game.image.pipe.margin) + Game.image.pipe.top;
                this.addOnePipe(x, y);
            }
        }
        this.labelScore.text = this.score;
        this.score += 1;
    }
};

var init = function()
{
    Game.init();
}