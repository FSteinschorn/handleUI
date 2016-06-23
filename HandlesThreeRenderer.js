function HandlesThreeRenderer(domQuery) { //for a whole window call with domQuery "<body>"
    //inherit the base class
    var self = new InteractiveThreeRenderer(domQuery, true);

    self.selectedMesh = null;
    self.handlesScene = null;

    //First we need to add a new initialization call wich will be executed after the one of InteractiveThreeRenderer
    self.initCalls.push(function () { //push the init function to the list of initCalls
        document.addEventListener('click', this.onDocumentMouseClick, false);
        document.addEventListener('keydown', this.onDocumentKeyDownESC, false);

        self.handlesScene = new THREE.Scene();
    });

    self.onDocumentMouseClick = function onDocumentMouseClick(event) {
        if ((self.picked) && (self.pickingUnlocked)) {
            self.pickingUnlocked = false;
            var node = self.resolveNode(self.picked);
            node.shape.interaction.selected(true);
            self.selectedMesh = node;

            var axes = self.buildAxes(node.shape.appearance.transformation);
            self.handlesScene.add(axes);

            self.initRuleUI();

            self.Update();
            self.RenderSingleFrame();
        }
    }

    self.onDocumentKeyDownESC = function onDocumentKeyDownESC(event) {
        if (self.selectedMesh) {
            self.selectedMesh.shape.interaction.selected(false);
            self.selectedMesh = null;
            self.pickingUnlocked = true;
            for (var i = self.handlesScene.children.length - 1; i >= 0; --i)
                self.handlesScene.remove(self.handlesScene.children[i]);

            self.Update();
            self.RenderSingleFrame();
        }
    }

    self.renderCalls.push(function () {
        this.renderer.render(self.handlesScene, this.camera);
    });


    self.buildAxes = function (mat) {
        var axes = new THREE.Object3D();

        //var sx = Math.sqrt(mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2]);
        //var sy = Math.sqrt(mat[4] * mat[4] + mat[5] * mat[5] + mat[6] * mat[6]);
        //var sz = Math.sqrt(mat[8] * mat[8] + mat[9] * mat[9] + mat[10] * mat[10]);

        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.0, 0, 0), 0xFF3030, false)); // +X
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.5 * 1.0, 0, 0), 0xA00000, true)); // -X
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.0, 0), 0x30FF30, false)); // +Y
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.5 * 1.0, 0), 0x00A000, true)); // -Y
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1.0), 0x3030FF, false)); // +Z
        axes.add(self.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -0.5 * 1.0), 0x0000A0, true)); // -Z

        var m = new THREE.Matrix4().set(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5], mat[6], mat[7], mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]);
        axes.applyMatrix(m);

        return axes;
    }

    self.buildAxis = function (src, dst, colorHex, dashed) {
        var geom = new THREE.Geometry(),
            mat;

        if (dashed) {
            mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
        } else {
            mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
        }

        geom.vertices.push(src.clone());
        geom.vertices.push(dst.clone());
        geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines

        var axis = new THREE.Line(geom, mat, THREE.LinePieces);
        axis.castShadow = false;
        axis.receiveShadow = false;
        return axis;

    }

    self.initRuleUI = function () {

        //create div container
        var uiDiv = document.createElement('div');
        uiDiv.id = "uiDiv";
        uiDiv.style.position = "absolute";
        uiDiv.style.bottom = "0";
        uiDiv.style.backgroundColor = "red";

        //create button
        var button = document.createElement("button");
        button.id = "newTranslationButton";
        var buttonText = document.createTextNode("New Translation");

        //put it together
        button.appendChild(buttonText);
        uiDiv.appendChild(button);
        document.getElementById("graphRendererContainer").appendChild(uiDiv);

        //add functions
        $("#newTranslationButton").click(function () {
            self.addNewTranslation(1.0, 1.0, 1.0);
        })
    }

    self.addNewTranslation = function (x, y, z) {
//        var m = new THREE.Matrix4();
//        m.makeTranslation(x, y, z);
        self.selectedMesh.shape.appearance.transformation.x += x;
        self.selectedMesh.shape.appearance.transformation.y += y;
        self.selectedMesh.shape.appearance.transformation.z += z;

        self.Update();
        self.RenderSingleFrame();
    }

    // $("#code_editor")[0].CodeMirror.setValue(getOldCode + generated rule);

    return self;
}