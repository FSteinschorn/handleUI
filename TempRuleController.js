function TempRuleController(renderer) {
    var self = {};

    rules = new Map();
    meshes = new Map();

    self.previewScene = new THREE.Scene();

    self.addRule = function (shape, rule) {
        rules[shape.id] = rules[shape.id] || [];
        rules[shape.id].push(rule);

        applyRule(shape, rule);
        if (meshes[shape.id])
            updatePreview(shape)
        else
            addPreview(shape);
        
        var editor = ace.edit("code_text_ace");
        editor.setValue(editor.getValue() + "\n\n" + generateRuleString(rule), 1);
    }

    self.removeRule = function (shape) {
        if (rules[shape.id]) {
            removedRule = rules[shape.id].pop();

            unapplyRule(shape, removedRule);
            if (rules[shape.id].length != 0)
                updatePreview(shape);
            else
                removePreview(shape);

            var editor = ace.edit("code_text_ace");
            editor.setValue(editor.getValue().replace("\n\n" + generateRuleString(removedRule), ""));
        }
    }

    self.updateRule = function (shape, rule) {
        if (rules[shape.id]) {
            removedRule = rules[shape.id].pop();
            rules[shape.id].push(rule);

            unapplyRule(shape, removedRule);
            applyRule(shape, rule);
            updatePreview(shape);

            var editor = ace.edit("code_text_ace");
            editor.setValue(editor.getValue().replace(generateRuleString(removedRule), generateRuleString(rule)));
        }
    }

    self.getRule = function (shape) {
        return rules[shape.id][rules[shape.id].length - 1];
    }

    applyRule = function (shape, rule) {
        switch (rule.type) {
            case 'translate':
                shape.appearance.transformation[3] += parseFloat(rule.x);
                shape.appearance.transformation[7] += parseFloat(rule.y);
                shape.appearance.transformation[11] += parseFloat(rule.z);
                break;
            case 'rotate':
                break;
            case 'scale':
                break;
            default:
                break;
        }
    }

    unapplyRule = function (shape, rule) {
        switch (rule.type) {
            case 'translate':
                shape.appearance.transformation[3] -= parseFloat(rule.x);
                shape.appearance.transformation[7] -= parseFloat(rule.y);
                shape.appearance.transformation[11] -= parseFloat(rule.z);
                break;
            case 'rotate':
                break;
            case 'scale':
                break;
            default:
                break;
        }
    }

    generateRuleString = function (rule) {
        var ruleString = "unsupported function";
        switch (rule.type) {
            case 'translate':
                ruleString = "new Rules.Translate(Vec3(" + rule.x + ", " + rule.y + ", " + rule.z + "))";
                for (i = 0; i < rule.tags.fulfills.length; i++) {
                    ruleString += "\n\t.Fulfills(\"" + rule.tags.fulfills[i] + "\");";
                }
                break;
            case 'rotate':
                break;
            case 'scale':
                break;
            default:
                break;
        }
        return ruleString;
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

return self;
}