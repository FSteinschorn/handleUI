var colors = ["Color.Ambient", "Color.Diffuse", "Color.Emmisive", "Color.AmbientAndDiffuse", "Color.Specular"];
hueConfig = {
    type: 'Hue',
    mode: true,
    options: [
        {
            label: 'Color Type',
            inputType: INPUTTYPE.DROPDOWN,
            values: colors
        },
        {
            label: 'Value',
            inputType: INPUTTYPE.DOUBLE,
            values: 0.0
        }
    ]
};

generateHueRule = function () {

    var hue = generateCustomRule(self.hueConfig);

    hue.generateRuleString = function () {
        var ruleString = "new Rules.Hue(" + this.selections[0].getValue();
        ruleString += ', ' + this.selections[1].toNumber();
        ruleString += ', ' + this.mode;
        ruleString += ')';
        ruleString = addTags(hue, ruleString);
        ruleString += ";";

        this.lastRuleString = ruleString;

        return ruleString;
    };
    hue.generateShortString = function () {
        var ruleString = "Hue " + this.selections[0].getValue();
        ruleString += ' at ' + this.selections[1].toNumber();
        ruleString += ', ' + this.mode;
        return ruleString;
    };

    return hue;
};



getRuleController().addRuleFactory(hueConfig.type, generateHueRule);