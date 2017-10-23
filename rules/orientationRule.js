var turns = ["Turn.X90", "Turn.X180", "Turn.X270", "Turn.Y90", "Turn.Y180", "Turn.Y270", "Turn.Z90", "Turn.Z180", "Turn.Z270"];
orientationConfig = {
    type: 'Orientation',
    mode: false,
    options: [
        {
            label: 'Turn',
            inputType: INPUTTYPE.DROPDOWN,
            values: turns
        }
    ]
};

generateOrientationRule = function () {
    return generateCustomRule(self.orientationConfig);
};

getRuleController().addRuleFactory(orientationConfig.type, generateOrientationRule);