saturationConfig = {
    type: 'Saturate',
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

generateSaturationRule = function () {

    var saturation =  generateCustomRule(self.saturationConfig);

    saturation.generateRuleString = function () {
        var ruleString = "new Rules.Saturate(" + this.selections[0].getValue();
        ruleString += ', ' + this.selections[1].toNumber();
        ruleString += ', ' + this.mode;
        ruleString += ')';
        ruleString = addTags(saturation, ruleString);
        ruleString += ";";

        this.lastRuleString = ruleString;

        return ruleString;
    };
    saturation.generateShortString = function () {

        for (var idx in this.postfixes) {
            if (this.postfixes[idx].type == "Name") {
                return '"' + this.postfixes[idx].tags[0] + '"';
            }
        }

        var ruleString = "Saturate " + this.selections[0].getValue();
        ruleString += ' at ' + this.selections[1].toNumber();
        ruleString += ', ' + this.mode;
        return ruleString;
    };

    return saturation;
};

getRuleController().addRuleFactory(saturationConfig.type, generateSaturationRule);