
/*
    3XyzMedia Independent Snow Plugin
    krpano 1.24
    Screen-space snow: independent of model rotation.
*/

var krpanoplugin = function () {
    var krpano = null;
    var plugin = null;
    var canvas = null;
    var ctx = null;
    var timer = null;
    var particles = [];
    var lastCount = -1;
    var frame = 0;

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    function getNumber(value, fallback) {
        var n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function getColor(value) {
        var n;

        if (typeof value === "string") {
            n = parseInt(value.replace(/^0x/i, ""), 16);
        } else {
            n = Number(value);
        }

        if (!Number.isFinite(n)) n = 0xFFFFFF;

        return {
            r: (n >> 16) & 255,
            g: (n >> 8) & 255,
            b: n & 255
        };
    }

    function makeParticle(width, height, randomY) {
        return {
            x: random(0, Math.max(1, width)),
            y: randomY ? random(0, Math.max(1, height)) : random(-20, -2),
            size: random(0.8, 2.2),
            fall: random(0.65, 1.6),
            drift: random(-0.35, 0.35),
            alpha: random(0.45, 1),
            phase: random(0, Math.PI * 2)
        };
    }

    function resizeParticles(count, width, height) {
        particles.length = count;

        for (var i = 0; i < count; i++) {
            if (!particles[i]) {
                particles[i] = makeParticle(width, height, true);
            }
        }

        lastCount = count;
    }

    function drawSnow() {
        if (!canvas || !ctx || !plugin || !krpano) return;

        var width = canvas.width;
        var height = canvas.height;

        if (width < 1 || height < 1) return;

        ctx.clearRect(0, 0, width, height);

        var count = Math.floor(getNumber(plugin.flakes, 1500));
        count = Math.max(0, Math.min(count, 4000));

        if (krpano.ismobile || krpano.istablet) {
            count = Math.min(count, 1000);
        }

        if (count !== lastCount) {
            resizeParticles(count, width, height);
        }

        var speed = getNumber(plugin.speed, 1);
        var shake = getNumber(plugin.shake, 4);
        var wind = getNumber(plugin.wind, 0);
        var direction = getNumber(plugin.winddir, 0) * Math.PI / 180;

        var windX = wind * Math.cos(direction) * 0.025;
        var windY = wind * Math.sin(direction) * 0.025;
        var color = getColor(plugin.color);
        var invert = plugin.invert === true ||
                     plugin.invert === "true";

        ctx.fillStyle = "rgb(" +
            color.r + "," + color.g + "," + color.b + ")";

        frame++;

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            // Movement is in screen pixels, not model coordinates.
            p.y += p.fall * speed * (invert ? -1 : 1) + windY;
            p.x += p.drift + windX +
                Math.sin(frame * 0.025 + p.phase) * shake * 0.025;

            if (p.x < -5) p.x = width + 5;
            if (p.x > width + 5) p.x = -5;

            if (!invert && p.y > height + 5) {
                particles[i] = makeParticle(width, height, false);
                p = particles[i];
            } else if (invert && p.y < -5) {
                p.y = height + random(0, 20);
                p.x = random(0, width);
            }

            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }

        ctx.globalAlpha = 1;
    }

    this.registerplugin = function (krpanoInterface, pluginPath, pluginObject) {
        krpano = krpanoInterface;
        plugin = pluginObject;

        plugin.registerattribute("mode", "snow");
        plugin.registerattribute("imageurl", "");
        plugin.registerattribute("flakes", 1500);
        plugin.registerattribute("color", 0xFFFFFF);
        plugin.registerattribute("floor", 0.3);
        plugin.registerattribute("invert", false);
        plugin.registerattribute("speed", 1);
        plugin.registerattribute("spreading", 4);
        plugin.registerattribute("shake", 4);
        plugin.registerattribute("speedvariance", 2);
        plugin.registerattribute("wind", 0);
        plugin.registerattribute("winddir", 0);
        plugin.registerattribute("rainwidth", 0.5);
        plugin.registerattribute("rainalpha", 0.5);
        plugin.registerattribute("imagescale", 1);

        plugin.enabled = false;
        plugin.align = "lefttop";
        plugin.edge = "lefttop";
        plugin.width = "100%";
        plugin.height = "100%";
        plugin.x = 0;
        plugin.y = 0;
        plugin.registercontentsize(256, 256);

        canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.pointerEvents = "none";

        ctx = canvas.getContext("2d");
        plugin.sprite.appendChild(canvas);

        timer = setInterval(drawSnow, 1000 / 30);

        krpano.set(
            "events[" + plugin.name + "_snowevents].keep",
            plugin.keep
        );

        krpano.set(
            "events[" + plugin.name + "_snowevents].onviewchanged",
            function () {
                // Camera/model rotation does not rotate screen-space snow.
                drawSnow();
            }
        );
    };

    this.onresize = function (width, height) {
        if (canvas) {
            canvas.width = Math.max(1, width | 0);
            canvas.height = Math.max(1, height | 0);
            lastCount = -1;
        }

        return false;
    };

    this.unloadplugin = function () {
        if (timer) clearInterval(timer);

        if (krpano && plugin) {
            krpano.set(
                "events[" + plugin.name + "_snowevents].keep",
                false
            );
            krpano.set(
                "events[" + plugin.name + "_snowevents].onviewchanged",
                null
            );
        }

        if (plugin && canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }

        timer = null;
        canvas = null;
        ctx = null;
        plugin = null;
        krpano = null;
        particles = [];
    };
};
