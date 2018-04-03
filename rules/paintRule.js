var materials = ["Material.Brass", "Material.Bronze", "Material.PolishedBronze", "Material.Chrome",
        "Material.Copper", "Material.PolishedCopper", "Material.Gold", "Material.PolishedGold",
        "Material.Pewter", "Material.Silver", "Material.PolishedSilver", "Material.Glass",
        "Material.Emerald", "Material.Jade", "Material.Obsidian", "Material.Pearl",
        "Material.Ruby", "Material.Turquoise", "Material.BlackPlastic", "Material.BlackRubber",
        "Material.White",
        "Material.Red", "Material.Pink", "Material.Purple", "Material.DeepPurple",
        "Material.Indigo", "Material.Blue", "Material.LightBlue", "Material.Cyan",
        "Material.Teal", "Material.Green", "Material.LightGreen", "Material.Lime",
        "Material.Yellow", "Material.Amber", "Material.Orange", "Material.DeepOrange",
        "Material.Brown", "Material.Grey", "Material.BlueGrey"];
paintConfig = {
    type: 'Paint',
    mode: false,
    options: [
        {
            label: 'Material',
            inputType: INPUTTYPE.DROPDOWN,
            values: materials
        },
        {
            label: 'Tone',
            inputType: INPUTTYPE.DROPDOWN,
            values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        }
    ]
};

generatePaintRule = function () {

    var paint = generateCustomRule(self.paintConfig);

    paint.generateRuleString = function () {
        var ruleString = "new Rules.Paint(" + this.selections[0].getValue();
        if (this.selections[1].getValue() != null) ruleString += '(' + this.selections[1].getValue() + ')';
        ruleString += ')';
        ruleString = addTags(paint, ruleString);
        ruleString += ";";

        this.lastRuleString = ruleString;

        return ruleString;
    };
    paint.generateShortString = function () {
        var ruleString = "Paint with " + this.selections[0].getValue();
        if (this.selections[1].getValue() != null) ruleString += '(' + this.selections[1].getValue() + ')';
        return ruleString;
    };
    paint.onselectionChange = function () {
        this.updateRule();
        var selectorInput = this.selections[0].getValue();
        if (materials.indexOf(selectorInput) > 19) {
            getInputFieldController().enable(this.fieldIds[1]);
        } else {
            getInputFieldController().disable(this.fieldIds[1]);
        }
        inputChanged();
    };

    return paint;
};

getRuleController().addRuleFactory(paintConfig.type, generatePaintRule);