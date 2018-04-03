growConfig = {
    type: 'Grow',
    mode: true,
    options: [
        {
            label: 'Vector',
            inputType: INPUTTYPE.VEC3,
            values: [0, 0, 0]
        }
    ]
};

generateGrowRule = function () {

    var grow = generateCustomRule(growConfig);

    grow.applyRule = function (shape) {
        var transform = shape.appearance.transformation;
        var sizeX = new THREE.Vector3(transform[0], transform[1], transform[2]).length();
        var sizeY = new THREE.Vector3(transform[4], transform[5], transform[6]).length();
        var sizeZ = new THREE.Vector3(transform[8], transform[9], transform[10]).length();
        var scaleX = (sizeX + this.selections[0].toNumber()[0]) / sizeX;
        var scaleY = (sizeY + this.selections[0].toNumber()[1]) / sizeY;
        var scaleZ = (sizeZ + this.selections[0].toNumber()[2]) / sizeZ;

        var matrix = new THREE.Matrix4();
        matrix.makeScale(scaleX, scaleY, scaleZ);
        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (this.mode == "Mode.Local") {
            var translation = new THREE.Matrix4().makeTranslation(
                sizeX * (scaleX - 1) / 2,
                sizeY * (scaleY - 1) / 2,
                sizeZ * (scaleZ - 1) / 2
            );
            m.multiply(translation);
            m.multiply(matrix);
        } else if (this.mode == "Mode.LocalMid") {
            m.multiply(matrix);
        } else if (this.mode == "Mode.Global") {
            m.premultiply(matrix);
        } else if (this.mode == "Mode.GlobalMid") {
            m.multiply(matrix);
        }
        shape.appearance.transformation = m.transpose().toArray();
    };
    grow.unapplyRule = function (shape) {
        var transform = shape.appearance.transformation;
        var sizeX = new THREE.Vector3(transform[0], transform[1], transform[2]).length();
        var sizeY = new THREE.Vector3(transform[4], transform[5], transform[6]).length();
        var sizeZ = new THREE.Vector3(transform[8], transform[9], transform[10]).length();
        var scaleX = sizeX / (sizeX - this.selections[0].toNumber()[0]);
        var scaleY = sizeY / (sizeY - this.selections[0].toNumber()[1]);
        var scaleZ = sizeZ / (sizeZ - this.selections[0].toNumber()[2]);

        var matrix = new THREE.Matrix4();
        matrix.makeScale(1 / scaleX, 1 / scaleY, 1 / scaleZ);
        mat = shape.appearance.transformation;
        var m = new THREE.Matrix4().fromArray(mat).transpose();
        if (this.mode == "Mode.Local") {
            var translation = new THREE.Matrix4().makeTranslation(
                -(sizeX / 2) + (sizeX / scaleX / 2),
                -(sizeY / 2) + (sizeY / scaleY / 2),
                -(sizeZ / 2) + (sizeZ / scaleZ / 2)
            );
            m.multiply(matrix);
            m.multiply(translation);
        } else if (this.mode == "Mode.LocalMid") {
            m.multiply(matrix);
        } else if (this.mode == "Mode.Global") {
            m.premultiply(matrix);
        } else if (this.mode == "Mode.GlobalMid") {
            m.multiply(matrix);
        }
        shape.appearance.transformation = m.transpose().toArray();
    };
    grow.draggingHelpers = {
        ids: {
            x: 0,
            y: 0,
            z: 0
        },
        activeHandle: null,
        overHandle: false,
        startPos: {
            x: 0,
            y: 0
        },
        startValues: {
            x: 0,
            y: 0,
            z: 0
        },
        diffWorld: {
            x: 0,
            y: 0,
            z: 0
        },
        diffScreen: {
            x: 0,
            y: 0
        }
    };
    grow.createHandles = function (scene, shape) {
        this.draggingHelpers.scene = scene;

        var colors = [0xAA0000, 0x00AA00, 0x0000AA];
        var toSwitch = null;
        if (this.draggingHelpers.activeHandle) toSwitch = this.draggingHelpers.activeHandle;
        else if (this.draggingHelpers.overHandle) toSwitch = this.draggingHelpers.overHandle;
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

        var m = shape.appearance.transformation;
        var xDir = new THREE.Vector3(m[0], m[1], m[2]);
        var yDir = new THREE.Vector3(m[4], m[5], m[6]);
        var zDir = new THREE.Vector3(m[8], m[9], m[10]);
        this.draggingHelpers.sizeX = xDir.length();
        this.draggingHelpers.sizeY = yDir.length();
        this.draggingHelpers.sizeZ = zDir.length();

        var ids = buildStandardAxes(scene, shape, colors);
        this.draggingHelpers.ids.x = ids[0];
        this.draggingHelpers.ids.y = ids[1];
        this.draggingHelpers.ids.z = ids[2];
    };
    grow.onMouseOverHandle = function (id) {
        var oldHandle = this.draggingHelpers.overHandle;
        if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
            this.draggingHelpers.overHandle = 'x';
        }
        if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
            this.draggingHelpers.overHandle = 'y';
        }
        if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
            this.draggingHelpers.overHandle = 'z';
        }
        if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    grow.onMouseNotOverHandle = function () {
        var oldHandle = this.draggingHelpers.overHandle;
        this.draggingHelpers.overHandle = null;
        if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
    };
    grow.onHandlePressed = function (id, mouse, intersection, scene, camera) {
        var arrowPos = scene.getObjectById(id).parent.position;
        var initStart = arrowPos.clone();
        var initEnd = intersection.clone();
        var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
        var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
        this.draggingHelpers.segment = {
            start: start,
            end: end
        };

        var inputFieldController = getInputFieldController();
        var value = inputFieldController.getValue(this.fieldIds[0]);
        this.draggingHelpers.startValues = jQuery.extend(true, [], value);
        this.draggingHelpers.cam = camera;
        this.draggingHelpers.intersection = intersection;
        this.draggingHelpers.arrowPos = arrowPos;

        this.draggingHelpers.startSizeX = this.draggingHelpers.sizeX;
        this.draggingHelpers.startSizeY = this.draggingHelpers.sizeY;
        this.draggingHelpers.startSizeZ = this.draggingHelpers.sizeZ;

        if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
            this.draggingHelpers.activeHandle = 'x';
        }
        if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
            this.draggingHelpers.activeHandle = 'y';
        }
        if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
            this.draggingHelpers.activeHandle = 'z';
        }
    };
    grow.onHandleDragged = function (mouse) {
        var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
        mousePoint.unproject(this.draggingHelpers.cam);
        var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

        var targetPoint = new THREE.Vector3();
        mouseRay.distanceSqToSegment(this.draggingHelpers.segment.start,
            this.draggingHelpers.segment.end,
            null,
            targetPoint);

        var diff = targetPoint.sub(this.draggingHelpers.intersection);
        var length = diff.length();
        var direction = this.draggingHelpers.intersection.clone().sub(this.draggingHelpers.arrowPos);
        var angle = diff.normalize().angleTo(direction.normalize());
        if (angle > (0.5 * Math.PI)) length *= -1;

        var newValues = this.draggingHelpers.startValues.toNumber();
        switch (this.draggingHelpers.activeHandle) {
            case 'x':
                newValues[0] = (newValues[0] + length).round();
                break;
            case 'y':
                newValues[1] = (newValues[1] + length).round();
                break;
            case 'z':
                newValues[2] = (newValues[2] + length).round();
                break;
        }
        var inputFieldController = getInputFieldController();
        var inputFieldValues = jQuery.extend(true, [], this.draggingHelpers.startValues);
        inputFieldValues.setValue(newValues);
        inputFieldController.setValue(this.fieldIds[0], inputFieldValues);
        inputChanged();
    };
    grow.onHandleReleased = function () {
        var oldHandle = this.draggingHelpers.activeHandle;
        this.draggingHelpers.activeHandle = null;
        if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
    };

    return grow;
};

getRuleController().addRuleFactory(growConfig.type, generateGrowRule);