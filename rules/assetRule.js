var primitives = ["Primitive.Arch", "Primitive.Box", "Primitive.Circle", "Primitive.Cone",
        "Primitive.Cylinder", "Primitive.Dodecahedron", "Primitive.Icosahedron", "Primitive.Octahedron",
        "Primitive.Plane", "Primitive.Prism", "Primitive.Gable", "Primitive.Ring",
        "Primitive.Sphere", "Primitive.Tetrahedron", "Primitive.Torus", "Primitive.TorusKnot"];

assetConfig = {
    type: 'Asset',
    mode: false,
    options: [
        {
            label: 'Primitive',
            inputType: INPUTTYPE.DROPDOWN,
            values: primitives
        }
    ]
};

generateAssetRule = function () {

    var asset =  generateCustomRule(self.assetConfig);

    asset.generateRuleString = function () {
        var ruleString = "new Rules.Asset(" + this.selections[0].getValue();
        ruleString += ')';
        ruleString = addTags(asset, ruleString);
        ruleString += ";";

        this.lastRuleString = ruleString;

        return ruleString;
    };
    asset.generateShortString = function () {

        for (var idx in this.postfixes) {
            if (this.postfixes[idx].type == "Name") {
                return '"' + this.postfixes[idx].tags[0] + '"';
            }
        }

        var ruleString = "Asset: " + this.selections[0].getValue();
        return ruleString;
    };

    return asset
};

getRuleController().addRuleFactory(assetConfig.type, generateAssetRule);