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
        var ruleString = "new Rules.Paint(" + paint.selections[0];
        if (paint.selections[1] != null) ruleString += '(' + paint.selections[1] + ')';
        ruleString += ')';
        ruleString = addTags(paint, ruleString);
        ruleString += ";";

        paint.lastRuleString = ruleString;

        return ruleString;
    };
    paint.generateShortString = function () {
        var ruleString = "Paint with " + paint.selections[0];
        if (paint.selections[1] != null) ruleString += '(' + paint.selections[1] + ')';
        return ruleString;
    };
    paint.onselectionChange = function () {
        var selector = document.getElementById('dropdown0');
        var toneSelector = document.getElementById('dropdown1');
        var toneLabel = document.getElementById('label1');
        if (selector.selectedIndex > 19) {
            toneSelector.style.display = 'inline';
            toneLabel.style.display = 'inline';
        } else {
            toneSelector.style.display = 'none';
            toneLabel.style.display = 'none';
        }
        inputChanged();
    };

    return paint;
};

getRuleController().addRuleFactory(paintConfig.type, generatePaintRule);