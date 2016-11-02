function TempRuleController(renderer) {
    var self = {};

    self.rules = new Map();

    storedRules = new Map();
    meshes = new Map();

    self.previewScene = new THREE.Scene();

    Number.prototype.countDecimals = function () {
        if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
        return this.toString().split(".")[1].length || 0;
    }
    Number.prototype.round = function (p) {
        p = p || 3;
        var rounded = Math.round(this * Math.pow(10, p)) / Math.pow(10, p);
        if (rounded.countDecimals() > p) return this.toFixed(p);
        return rounded;
    };

    self.addRule = function (shape, rule) {
        storedRules[shape.id] = storedRules[shape.id] || [];
        storedRules[shape.id].push(rule);

        self.rules.get(rule.type).applyRule(rule, shape)
        if (meshes[shape.id])
            updatePreview(shape)
        else
            addPreview(shape);
        
        var editor = ace.edit("code_text_ace");
        editor.setValue(editor.getValue() + "\n\n" + self.rules.get(rule.type).generateRuleString(rule), 1);
    }

    self.removeRule = function (shape) {
        if (storedRules[shape.id]) {
            removedRule = storedRules[shape.id].pop();

            self.rules.get(removedRule.type).unapplyRule(removedRule, shape);
            if (storedRules[shape.id].length != 0)
                updatePreview(shape);
            else
                removePreview(shape);

            var editor = ace.edit("code_text_ace");
            editor.setValue(editor.getValue().replace("\n\n" + self.rules.get(removedRule.type).generateRuleString(removedRule), ""));
        }
    }

    self.updateRule = function (shape, rule) {
        if (storedRules[shape.id]) {
            removedRule = storedRules[shape.id].pop();
            storedRules[shape.id].push(rule);

            self.rules.get(removedRule.type).unapplyRule(removedRule, shape);
            self.rules.get(rule.type).applyRule(rule, shape);
            updatePreview(shape);

            var editor = ace.edit("code_text_ace");
            editor.setValue(editor.getValue().replace(self.rules.get(removedRule.type).generateRuleString(removedRule), self.rules.get(rule.type).generateRuleString(rule)));
        }
    }

    self.getRule = function (shape) {
        storedRules[shape.id] = storedRules[shape.id] || [];
        var value = storedRules.get(shape.id);
        if (storedRules.get(shape.id) != []) {
            return storedRules[shape.id][storedRules[shape.id].length - 1];
        }
        return null;
    }

    addPreview = function (shape) {
        var geo, matrix;
        var t = shape.appearance.transformation;
        var matrix = new THREE.Matrix4().set(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], t[10], t[11], t[12], t[13], t[14], t[15]);
        var positiveDeterminant = matrix.determinant() > 0.0;
        var visible = true;
        if (shape.appearance.primitive) {
            geo = GeometricPrimitives.Get(shape.appearance.primitive, positiveDeterminant);
            visible = shape.appearance.primitive !== 'Empty';
        }
        else {
            geo = new THREE.Geometry();
            var vertices = shape.appearance.geometry.points;
            for (var i = 2; i < vertices.length; i += 3) {
                geo.vertices.push(new THREE.Vector3(vertices[i - 2], vertices[i - 1], vertices[i]));
            }
            if (shape.appearance.geometry.indexed) {
                var indices = shape.appearance.geometry.indices;
                for (var i = 2; i < indices.length; i += 3)
                    geo.faces.push(new THREE.Face3(indices[i - (positiveDeterminant ? 2 : 1)], indices[i - (positiveDeterminant ? 1 : 2)], indices[i]));
            }
            else {
                for (var i = 2, j = 8; j < vertices.length; i += 3, j += 9)
                    geo.faces.push(new THREE.Face3(i - (positiveDeterminant ? 2 : 1), i - (positiveDeterminant ? 1 : 2), i));
            }
            geo.computeFaceNormals();
            if (!positiveDeterminant) {
                for (var i = 0; i < geo.faces.length; ++i)
                    geo.faces[i].normal.multiplyScalar(-1.0);
            }
        }
        var wireFrameMaterial = new THREE.MeshBasicMaterial({
            color: 0x0099ff,
            wireframe: true
        });
        var mesh = new THREE.Mesh(geo, wireFrameMaterial);
        mesh.matrixAutoUpdate = false;
        mesh.applyMatrix(matrix);
        mesh.mName = shape.id;
        mesh.mMaterial = wireFrameMaterial;
        mesh.visible = visible;
        self.previewScene.add(mesh);

        meshes[shape.id] = mesh;

    }

    removePreview = function (shape) {
        self.previewScene.remove(meshes[shape.id]);
        meshes.delete(shape.id);
    }

    updatePreview = function (shape) {
        removePreview(shape);
        addPreview(shape);
    }


    //call with node.shape.appearance.transformation
    buildStandardAxes = function (scene, shape, colors) {
        mat = shape.shape.appearance.transformation;

        var axes = [];

        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        center = new THREE.Vector3(0, 0, 0);
        center.applyProjection(m);
        xDir = new THREE.Vector3(1.0, 0, 0);
        yDir = new THREE.Vector3(0, 1.0, 0);
        zDir = new THREE.Vector3(0, 0, 1.0);
        if (getMode() == "Mode.Local" || getMode() == "Mode.LocalMid") {
            xDir.applyProjection(m);
            yDir.applyProjection(m);
            zDir.applyProjection(m);
            xDir.sub(center);
            yDir.sub(center);
            zDir.sub(center);
        }

        xArrow = new THREE.ArrowHelper(xDir.normalize(), center, xDir.length(), colors ? colors[0] : 0xFF3030, 0.2, 0.1);
        yArrow = new THREE.ArrowHelper(yDir.normalize(), center, yDir.length(), colors ? colors[1] : 0x30FF30, 0.2, 0.1);
        zArrow = new THREE.ArrowHelper(zDir.normalize(), center, zDir.length(), colors ? colors[2] : 0x3030FF, 0.2, 0.1);

        scene.add(xArrow, yArrow, zArrow);
        return [xArrow.id, yArrow.id, zArrow.id];
    }

    appendModeSelector = function (parentDiv) {
        var innerHTML = '<select id="mode_selector">';
        innerHTML += '<option value="Mode.Local">Local</option>';
        innerHTML += '<option value="Mode.LocalMid">LocalMid</option>';
        innerHTML += '<option value="Mode.Global">Global</option>';
        innerHTML += '<option value="Mode.GlobalMid">GlobalMid</option>';
        innerHTML += '</select>'
        parentDiv.innerHTML += innerHTML;
        $('#mode_selector').change(inputChanged);
    }
    setModeSelector = function (target) {
        if (!target.startsWith("Mode.")) target = "Mode." + target;
        var selector = document.getElementById("mode_selector");
        for (i = 0; i < selector.options.length; i++) {
            if (selector.options[i].value == target)
                selector.selectedIndex = i;
        }
    }
    getMode = function () {
        var selector = document.getElementById("mode_selector");
        return selector.options[selector.selectedIndex].value;
    }



    inputChanged = function () { renderer.inputChanged(); }


    // #################################################################################################################################
    // ############################################ TRANSLATION ########################################################################
    // #################################################################################################################################

    self.rules.set("Translation", {
        generateRuleString: function (rule) {
            var ruleString = "new Rules.Translate(Vec3(" + rule.x + ", " + rule.y + ", " + rule.z + "), " + getMode() + ")";
            // add tags
            ruleString += ";";
            return ruleString;
        },
        applyRule: function (rule, shape) {
            var matrix = new THREE.Matrix4();
            matrix.makeTranslation(parseFloat(rule.x), parseFloat(rule.y), parseFloat(rule.z)).transpose();
            mat = shape.appearance.transformation;
            var m = new THREE.Matrix4().fromArray(mat);
            if (getMode() == "Mode.Local" || getMode() == "Mode.LocalMid") m.premultiply(matrix);
            if (getMode() == "Mode.Global" || getMode() == "Mode.GlobalMid") m.multiply(matrix);
            shape.appearance.transformation = m.toArray();

//            shape.appearance.transformation[3] += parseFloat(rule.x);
//            shape.appearance.transformation[7] += parseFloat(rule.y);
//            shape.appearance.transformation[11] += parseFloat(rule.z);
        },
        unapplyRule: function (rule, shape) {
            var matrix = new THREE.Matrix4();
            matrix.makeTranslation(-parseFloat(rule.x), -parseFloat(rule.y), -parseFloat(rule.z)).transpose();
            mat = shape.appearance.transformation;
            var m = new THREE.Matrix4().fromArray(mat);
            if (getMode() == "Mode.Local" || getMode() == "Mode.LocalMid") m.premultiply(matrix);
            if (getMode() == "Mode.Global" || getMode() == "Mode.GlobalMid") m.multiply(matrix);
            shape.appearance.transformation = m.toArray();
//            shape.appearance.transformation[3] -= parseFloat(rule.x);
//            shape.appearance.transformation[7] -= parseFloat(rule.y);
//            shape.appearance.transformation[11] -= parseFloat(rule.z);
        },
        appendInputFields: function (parentDiv, rule) {
            var x_input = document.createElement("input");
            x_input.setAttribute('type', 'text');
            x_input.setAttribute('id', 'x_input_field');
            var y_input = document.createElement("input");
            y_input.setAttribute('type', 'text');
            y_input.setAttribute('id', 'y_input_field');
            var z_input = document.createElement("input");
            z_input.setAttribute('type', 'text');
            z_input.setAttribute('id', 'z_input_field');
            if (rule) {
                x_input.setAttribute('value', rule.x);
                y_input.setAttribute('value', rule.y);
                z_input.setAttribute('value', rule.z);
            } else {
                x_input.setAttribute('value', '0');
                y_input.setAttribute('value', '0');
                z_input.setAttribute('value', '0');
            } 
            parentDiv.appendChild(x_input);
            parentDiv.appendChild(y_input);
            parentDiv.appendChild(z_input);
            $('#x_input_field').change(inputChanged);
            $('#y_input_field').change(inputChanged);
            $('#z_input_field').change(inputChanged);
            appendModeSelector(parentDiv);
            setModeSelector("Local");

            this.draggingHelpers.startPos = null;
            if (rule) if (rule.startPos) this.draggingHelpers.startPos = rule.startPos;
        },
        createRuleDescriptor: function () {
            var rule = {
                type: "Translation",
                x: document.getElementById("x_input_field").value,
                y: document.getElementById("y_input_field").value,
                z: document.getElementById("z_input_field").value,
            }
            return rule;
        },
        draggingHelpers: {
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
        },
        createHandles: function (scene, shape) {
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

            var ids = buildStandardAxes(scene, shape, colors);
            this.draggingHelpers.ids.x = ids[0];
            this.draggingHelpers.ids.y = ids[1];
            this.draggingHelpers.ids.z = ids[2];
        },
        onMouseOverHandle: function (id) {
            oldHandle = this.draggingHelpers.overHandle;
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
        },
        onMouseNotOverHandle: function () {
            oldHandle = this.draggingHelpers.overHandle;
            this.draggingHelpers.overHandle = null;
            if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
        },
        onHandlePressed: function (id, mouse, intersection, scene, camera) {
            var arrowPos = scene.getObjectById(id).parent.position;
            var initStart = arrowPos.clone();
            var initEnd = intersection.clone();
            var start = initStart.clone().add(initEnd.clone().sub(initStart).multiplyScalar(1000));
            var end = initEnd.clone().add(initStart.clone().sub(initEnd).multiplyScalar(1000));
            this.draggingHelpers.segment = {
                start: start,
                end: end
            }
          
            this.draggingHelpers.startValues.x = parseFloat(document.getElementById("x_input_field").value);
            this.draggingHelpers.startValues.y = parseFloat(document.getElementById("y_input_field").value);
            this.draggingHelpers.startValues.z = parseFloat(document.getElementById("z_input_field").value);
            this.draggingHelpers.cam = camera;
            this.draggingHelpers.intersection = intersection;
            this.draggingHelpers.arrowPos = arrowPos;

            if (this.draggingHelpers.ids.x <= id && id <= this.draggingHelpers.ids.x + 2) {
                this.draggingHelpers.activeHandle = 'x';
            }
            if (this.draggingHelpers.ids.y <= id && id <= this.draggingHelpers.ids.y + 2) {
                this.draggingHelpers.activeHandle = 'y';
            }
            if (this.draggingHelpers.ids.z <= id && id <= this.draggingHelpers.ids.z + 2) {
                this.draggingHelpers.activeHandle = 'z';
            }
        },
        onHandleDragged: function (mouse) {
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

//            var xValue = targetPoint.x - this.draggingHelpers.intersection.x + this.draggingHelpers.startValues.x;
//            var yValue = targetPoint.y - this.draggingHelpers.intersection.y + this.draggingHelpers.startValues.y;
//            var zValue = targetPoint.z - this.draggingHelpers.intersection.z + this.draggingHelpers.startValues.z;

            switch (this.draggingHelpers.activeHandle) {
                case 'x':
                    xInput = document.getElementById("x_input_field").value = '' + (this.draggingHelpers.startValues.x + length.round());
                    break;
                case 'y':
                    yInput = document.getElementById("y_input_field").value = '' + (this.draggingHelpers.startValues.y + length.round());
                    break;
                case 'z':
                    zInput = document.getElementById("z_input_field").value = '' + (this.draggingHelpers.startValues.z + length.round());
                    break;
            }
            inputChanged();
        },
        onHandleReleased: function () {
            oldHandle = this.draggingHelpers.activeHandle;
            this.draggingHelpers.activeHandle = null;
            if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
        }
    });


    // #################################################################################################################################
    // ############################################### ROTATION ########################################################################
    // #################################################################################################################################

    self.rules.set("Rotation", {
        generateRuleString: function (rule) {
            var amount = null;
            if (rule.degrad == "deg") amount = "Deg(" + rule.amount + ")";
            else if (rule.degrad == "rad") amount = "Rad(" + rule.amount + ")";
            var ruleString = "new Rules.Rotate(" + rule.axis + ", " + amount + "), " + getMode() + ")";
            // add tags
            ruleString += ";";
            return ruleString;
        },
        applyRule: function (rule, shape) {
            var amount;
            if (rule.degrad == 'deg') {
                amount = parseFloat(rule.amount) / 180;
            } else {
                amount = parseFloat(rule.amount);
            }

            switch (rule.axis) {
                case 'Axis.X':
                    matrix = new THREE.Matrix4().makeRotationX(Math.PI * amount);
                    break;
                case 'Axis.Y':
                    matrix = new THREE.Matrix4().makeRotationY(Math.PI * amount);
                    break;
                case 'Axis.Z':
                    matrix = new THREE.Matrix4().makeRotationZ(Math.PI * amount);
                    break;
                default:
                    break;
            }

            mat = shape.appearance.transformation;
            var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
            m.premultiply(matrix);
            shape.appearance.transformation = m.toArray();
        },
        unapplyRule: function (rule, shape) {
            var amount;
            if (rule.degrad == 'deg') {
                amount = -1 * parseFloat(rule.amount) / 180;
            } else {
                amount = -1 * parseFloat(rule.amount);
            }

            switch (rule.axis) {
                case 'Axis.X':
                    matrix = new THREE.Matrix4().makeRotationX(Math.PI * amount);
                    break;
                case 'Axis.Y':
                    matrix = new THREE.Matrix4().makeRotationY(Math.PI * amount);
                    break;
                case 'Axis.Z':
                    matrix = new THREE.Matrix4().makeRotationZ(Math.PI * amount);
                    break;
                default:
                    break;
            }

            mat = shape.appearance.transformation;
            var m = new THREE.Matrix4().fromArray(mat);//mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
            m.premultiply(matrix);
            shape.appearance.transformation = m.toArray();
        },
        appendInputFields: function (parentDiv, rule) {
            var amount_input = document.createElement("input");
            amount_input.setAttribute('type', 'text');
            amount_input.setAttribute('id', 'amount_input_field');
            if (rule) {
                amount_input.setAttribute('value', rule.amount);
            } else {
                amount_input.setAttribute('value', '0');
            }

            var innerHTML = '<select id="axis_selector">';
            innerHTML += '<option value="Axis.X">Axis.X</option>';
            innerHTML += '<option value="Axis.Y">Axis.Y</option>';
            innerHTML += '<option value="Axis.Z">Axis.Z</option>';
            innerHTML += '</select>'

            parentDiv.innerHTML += innerHTML;
            parentDiv.appendChild(amount_input);

            innerHTML = '<select id="degrad_selector">';
            innerHTML += '<option value="deg">deg</option>';
            innerHTML += '<option value="rad">PI rad</option>';
            innerHTML += '</select>'

            parentDiv.innerHTML += innerHTML;

            if (rule) {
                var selector = document.getElementById("degrad_selector");
                for (i = 0; i < selector.options.length; i++) {
                    if (selector.options[i].value == rule.degrad)
                        selector.selectedIndex = i;
                }
            }

            appendModeSelector(parentDiv);
            setModeSelector("LocalMid");

            $('#amount_input_field').change(inputChanged);
            $('#axis_selector').change(inputChanged);
            $('#degrad_selector').change(inputChanged);
        },
        createRuleDescriptor: function () {
            var selector = document.getElementById("axis_selector");
            var selection = selector.options[selector.selectedIndex].value;
            var rule = {
                type: "Rotation",
                axis: selection,
                amount: document.getElementById("amount_input_field").value,
            }
            selector = document.getElementById("degrad_selector");
            selection = selector.options[selector.selectedIndex].value;
            rule["degrad"] = selection;
            return rule;
        },
        draggingHelpers: {},
        createHandles: function (scene, shape) {
            this.draggingHelpers.scene = scene;

            // switch circle color
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

            // Turn circle depending on axis
            var selector = document.getElementById("axis_selector");
            var selection = selector.options[selector.selectedIndex].value;
            var material = null;
            switch (selection) {
                case 'Axis.X':
                    material = new THREE.LineBasicMaterial({ color: colors[0] });
                    var rotation = new THREE.Matrix4().makeRotationY(Math.PI / 2);
                    break;
                case 'Axis.Y':
                    material = new THREE.LineBasicMaterial({ color: colors[1] });
                    var rotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
                    break;
                case 'Axis.Z':
                    material = new THREE.LineBasicMaterial({ color: colors[2] });
                    var rotation = new THREE.Matrix4().makeRotationZ(0);
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
            geometry.applyMatrix(rotation);
            geometry.applyMatrix(m);

            // Generate circle
            var circle = new THREE.Line(geometry, material);
            scene.add(circle);
            this.draggingHelpers.id = circle.id;
        },
        onMouseOverHandle: function (id) {
            if (this.draggingHelpers.overHandle) var oldHandle = this.draggingHelpers.overHandle;
            var selector = document.getElementById("axis_selector");
            var selection = selector.options[selector.selectedIndex].value;
            switch (selection) {
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
            if (oldHandle != this.draggingHelpers.overHandle) inputChanged();
        },
        onMouseNotOverHandle: function () {
            oldHandle = this.draggingHelpers.overHandle;
            this.draggingHelpers.overHandle = null;
            if (this.draggingHelpers.overHandle != oldHandle) inputChanged();
        },
        onHandlePressed: function (id, mouse, intersection, scene, camera) {
            this.draggingHelpers.cam = camera;
            this.draggingHelpers.activeHandle = id;
            this.draggingHelpers.intersection = intersection;
            this.draggingHelpers.scene = scene;
            this.draggingHelpers.startValue = parseFloat(document.getElementById("amount_input_field").value);

            var segment = this.draggingHelpers.scene.getObjectById(id);
            this.draggingHelpers.vertices = segment.geometry.vertices
        },
        onHandleDragged: function (mouse) {
            var vertices = this.draggingHelpers.vertices;

			// project mouse into scene
            var mousePoint = new THREE.Vector3(mouse.x, mouse.y, 1);
            mousePoint.unproject(this.draggingHelpers.cam);
            var mouseRay = new THREE.Ray(this.draggingHelpers.cam.position, mousePoint.sub(this.draggingHelpers.cam.position).normalize());

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
			var startDir = this.draggingHelpers.intersection.clone().sub(mid).normalize();
            var endDir = nearestPoint.clone().sub(mid).normalize();
			var normal = startDir.clone().cross(endDir);
			var viewingAngle = normal.angleTo(this.draggingHelpers.cam.position.clone().sub(mid));
			var standard1 = vertices[0];
			var standard2 = vertices[1];
			var standard1Dir = standard1.clone().sub(mid).normalize();
			var standard2Dir = standard2.clone().sub(mid).normalize();
			var standardNormal = standard1Dir.clone().cross(standard2Dir);
			var standardAngle = standardNormal.angleTo(this.draggingHelpers.cam.position.clone().sub(mid));
			var direction = 1;
            var selector = document.getElementById("axis_selector");
            var selection = selector.options[selector.selectedIndex].value;
			if (viewingAngle < (0.5 * Math.PI)) direction *= -1;
			if (standardAngle > (0.5 * Math.PI)) direction *= -1;
            if (selection == "Axis.Y") direction *= -1
            
			// calc rotation angle            
            var angle = startDir.angleTo(endDir);

			// update input fields
            selector = document.getElementById("degrad_selector");
            selection = selector.options[selector.selectedIndex].value;
            if (selection == "rad") {
                document.getElementById("amount_input_field").value = '' + (this.draggingHelpers.startValue + direction * (angle / Math.PI)).round();
            } else {
                document.getElementById("amount_input_field").value = '' + (this.draggingHelpers.startValue + direction * ((angle * 180) / Math.PI)).round();
            }

            inputChanged();
        },
        onHandleReleased: function () {
            oldHandle = this.draggingHelpers.activeHandle;
            this.draggingHelpers.activeHandle = null;
            if (this.draggingHelpers.activeHandle != oldHandle) inputChanged();
        }
    });

return self;
}