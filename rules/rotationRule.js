var axes = ["Axis.X", "Axis.Y", "Axis.Z"];
var degrad = ["deg", "rad"];
rotationConfig = {
    type: 'Rotation',
    mode: true,
    options: [
        {
            label: 'Axis',
            inputType: INPUTTYPE.DROPDOWN,
            values: axes
        },
        {
            label: 'Amount',
            inputType: INPUTTYPE.DOUBLE,
            values: 0
        },
        {
            label: 'Degrad',
            inputType: INPUTTYPE.DROPDOWN,
            values: degrad
        }
    ]
};

generateRotationRule = function () {

    var rotation = generateCustomRule(self.rotationConfig);

    rotation.generateRuleString = function () {
        var amount = null;
        if (rotation.selections[2] == "deg") amount = "Deg(" + rotation.selections[1] + ")";
        else if (rotation.selections[2] == "rad") amount = "Rad(" + rotation.selections[1] + ")";
        var ruleString = "new Rules.Rotate(" + rotation.selections[0] + ", " + amount + ", " + rotation.mode + ")";
        ruleString = addTags(rotation, ruleString);
        ruleString += ";";

        rotation.lastRuleString = ruleString;

        return ruleString;
    };
    rotation.generateShortString = function () {
        return ("Rotation by " + rotation.selections[1] + " " + rotation.selections[2] + " on " + rotation.selections[0] + ", " + rotation.mode);
    };
    rotation.applyRule = function (shape) {
        var amount = rotation.selections[1];
        if (rotation.selections[2] == 'deg') {
            amount = Math.PI * amount / 180;
        }

        switch (rotation.selections[0]) {
            case 'Axis.X':
                matrix = new THREE.Matrix4().makeRotationX(amount);
                break;
            case 'Axis.Y':
                matrix = new THREE.Matrix4().makeRotationY(amount);
                break;
            case 'Axis.Z':
                matrix = new THREE.Matrix4().makeRotationZ(amount);
                break;
            default:
                break;
        }

        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.premultiply(matrix);
        if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.multiply(matrix);
        shape.appearance.transformation = m.toArray();
    };
    rotation.unapplyRule = function (shape) {
        var amount = -rotation.selections[1];
        if (rotation.selections[2] == 'deg') {
            amount = Math.PI * amount / 180;
        }

        switch (rotation.selections[0]) {
            case 'Axis.X':
                matrix = new THREE.Matrix4().makeRotationX(amount);
                break;
            case 'Axis.Y':
                matrix = new THREE.Matrix4().makeRotationY(amount);
                break;
            case 'Axis.Z':
                matrix = new THREE.Matrix4().makeRotationZ(amount);
                break;
            default:
                break;
        }

        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        if (this.mode == "Mode.Local" || this.mode == "Mode.LocalMid") m.premultiply(matrix);
        if (this.mode == "Mode.Global" || this.mode == "Mode.GlobalMid") m.multiply(matrix);
        shape.appearance.transformation = m.toArray();
    };
    rotation.createHandles = function (scene, shape) {
        this.draggingHelpers.scene = scene;

        // switch circle color
        var colors = [0xAA0000, 0x00AA00, 0x0000AA];
        var toSwitch = null;
        if (rotation.draggingHelpers.activeHandle) toSwitch = rotation.draggingHelpers.activeHandle;
        else if (rotation.draggingHelpers.overHandle) toSwitch = rotation.draggingHelpers.overHandle;
        switch (toSwitch) {
            case null:
                break;
            case 'x':
                colors[0] = 0xFF0000;
                break;
            case 'y':
                colors[1] = 0x00FF00;
                break;
            case 'z':
                colors[2] = 0x0066FF;
                break;
            default:
                break;
        }

        // Turn circle depending on axis
        var material = null;
        switch (rotation.selections[0]) {
            case 'Axis.X':
                material = new THREE.LineBasicMaterial({color: colors[0]});
                var rotationMat = new THREE.Matrix4().makeRotationY(Math.PI / 2);
                break;
            case 'Axis.Y':
                material = new THREE.LineBasicMaterial({color: colors[1]});
                var rotationMat = new THREE.Matrix4().makeRotationX(Math.PI / 2);
                break;
            case 'Axis.Z':
                material = new THREE.LineBasicMaterial({color: colors[2]});
                var rotationMat = new THREE.Matrix4().makeRotationZ(0);
                break;
            default:
                break;
        }

        // Generate circle geometry
        var radius = 0.8,
            segments = 64,
            geometry = new THREE.CircleGeometry(radius, segments);

        // Remove center vertex
        geometry.vertices.shift();

        // Move circle to correct position
        mat = shape.shape.appearance.transformation;
        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        geometry.applyMatrix(rotationMat);
        geometry.applyMatrix(m);

        // Generate circle
        var circle = new THREE.Line(geometry, material);
        scene.add(circle);
        rotation.draggingHelpers.id = circle.id;
    };
    rotation.onMouseOverHandle = function (id) {
        if (rotation.draggingHelpers.overHandle) var oldHandle = rotation.draggingHelpers.overHandle;
        switch (rotation.selections[0]) {
            case 'Axis.X':
                this.draggingHelpers.overHandle = 'x';
                break;
            case 'Axis.Y':
                this.draggingHelpers.overHandle = 'y';
                break;
            case 'Axis.Z':
                this.draggingHelpers.overHandle = 'z';
                break;
            default:
                break;
        }
        if (oldHandle != rotation.draggingHelpers.overHandle) inputChanged();
    };
    rotation.onMouseNotOverHandle = function () {
        oldHandle = rotation.draggingHelpers.overHandle;
        rotation.draggingHelpers.overHandle = null;
        if (rotation.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    rotation.onHandlePressed = function (id, mouse, intersection, scene, camera) {
        rotation.draggingHelpers.cam = camera;
        rotation.draggingHelpers.activeHandle = id;
        rotation.draggingHelpers.intersection = intersection;
        rotation.draggingHelpers.scene = scene;
        rotation.draggingHelpers.startValue = rotation.selections[1];

        var segment = rotation.draggingHelpers.scene.getObjectById(id);
        rotation.draggingHelpers.vertices = segment.geometry.vertices
    };
    rotation.onHandleDragged = function (mouse) {
        var vertices = rotation.draggingHelpers.vertices;

        // project mouse into scene
        var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
        mousePoint.unproject(rotation.draggingHelpers.cam);
        var mouseRay = new THREE.Ray(rotation.draggingHelpers.cam.position, mousePoint.sub(rotation.draggingHelpers.cam.position).normalize());

        // calc target point
        var distance = null;
        var minDist = Number.MAX_VALUE;
        var nearestPoint = new THREE.Vector3();
        var currentPoint = new THREE.Vector3();
        var startIndex = null;
        for (var i = 0; i < 64; i++) {
            distance = mouseRay.distanceSqToSegment(vertices[i], vertices[i + 1], null, currentPoint);
            if (distance < minDist) {
                minDist = distance;
                nearestPoint = currentPoint.clone();
                startIndex = i;
            }
        }

        // calc mid of circle
        var oppositeIndex = startIndex + 32;
        if (oppositeIndex > 64) {
            oppositeIndex -= 64;
        }
        var offset = nearestPoint.clone().sub(vertices[startIndex]);
        var oppositePoint = vertices[oppositeIndex].clone().sub(offset);
        var mid = oppositePoint.clone().sub(nearestPoint).multiplyScalar(0.5).add(nearestPoint);

        // calc rotation direction
        var startDir = rotation.draggingHelpers.intersection.clone().sub(mid).normalize();
        var endDir = nearestPoint.clone().sub(mid).normalize();
        var normal = startDir.clone().cross(endDir);
        var viewingAngle = normal.angleTo(rotation.draggingHelpers.cam.position.clone().sub(mid));
        var standard1 = vertices[0];
        var standard2 = vertices[1];
        var standard1Dir = standard1.clone().sub(mid).normalize();
        var standard2Dir = standard2.clone().sub(mid).normalize();
        var standardNormal = standard1Dir.clone().cross(standard2Dir);
        var standardAngle = standardNormal.angleTo(rotation.draggingHelpers.cam.position.clone().sub(mid));
        var direction = 1;
        if (viewingAngle < (0.5 * Math.PI)) direction *= -1;
        if (standardAngle > (0.5 * Math.PI)) direction *= -1;
        if (rotation.selections[0] == "Axis.Y") direction *= -1;

        // calc rotation angle
        var angle = startDir.angleTo(endDir);

        // update input fields
        if (rotation.selections[2] == "rad") {
            document.getElementById("input_field1").value = '' + (rotation.draggingHelpers.startValue + direction * angle).round();
        } else {
            document.getElementById("input_field1").value = '' + (rotation.draggingHelpers.startValue + direction * ((angle * 180) / Math.PI)).round();
        }

        inputChanged();
    };
    rotation.onHandleReleased = function () {
        oldHandle = rotation.draggingHelpers.activeHandle;
        rotation.draggingHelpers.activeHandle = null;
        if (rotation.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };

    return rotation;
};

getRuleController().addRuleFactory(rotationConfig.type, generateRotationRule);