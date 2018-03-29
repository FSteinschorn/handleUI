function InputField(parentDiv, label, types, defaults, updateCallback) {

    var self = {};

    self.id = makeid();
    self.parentDiv = parentDiv;
    self.label = label;
    self.types = types;
    self.defaults = defaults;
    self.callback = updateCallback;

    self.inputs = [];
    self.children = [];

    self.random = 0;

    self.create = function() {

        var fieldDiv = document.createElement('div');
        fieldDiv.id = "fieldDiv_" + this.id;
        fieldDiv.classList += "inputField-div";
        this.parentDiv.appendChild(fieldDiv);

        // add label
        if (this.label != null &&
            this.types.indexOf(INPUTTYPE.TAG) == -1 &&
            this.types.indexOf(INPUTTYPE.TAGS) == -1) {
            var label = document.createElement('div');
            label.id = 'fieldLabel_' + this.id;
            label.classList += 'inputField-label';
            label.innerHTML = '<span>' + this.label + ': </span>';
            fieldDiv.appendChild(label);
        }

        var noButtons;

        // build input
        switch (this.types[0]) {

            case INPUTTYPE.STRING:
                noButtons = 1;
            case INPUTTYPE.DOUBLE:
            case INPUTTYPE.RAW:
                var id = "inputField_" + this.id;
                var input = document.createElement("input");
                input.setAttribute('type', 'text');
                input.setAttribute('id', id);
                input.classList += 'inputField-inputField';
                input.addEventListener("change", this.callback);
                fieldDiv.appendChild(input);
                this.inputs[0] = input;
                break;

            case INPUTTYPE.DROPDOWN:
                var id = "dropdown_" + this.id;
                var innerHTML = '<select id=' + id + '>';
                for (var j = 0; j < this.defaults.length; j++) {
                    innerHTML += '<option vaule ="' + this.defaults[j] + '">' + this.defaults[j] + '</options>';
                }
                innerHTML += '</select>';
                fieldDiv.innerHTML += innerHTML;
                var selector = document.getElementById(id);
                selector.addEventListener("change", this.callback);
                selector.classList += 'inputField-inputField';
                this.inputs[0] = selector;

                noButtons = 1;
                break;

            case INPUTTYPE.TAG:
                if (this.defaults) var settings = this.defaults;
                else var settings = null;
                renderer.postfixController.addPostfix(fieldDiv, settings, this.label, false, this.callback);

                noButtons = 1;
                break;

            case INPUTTYPE.TAGS:
                if (this.defaults) var settings = this.defaults;
                else var settings = null;
                renderer.postfixController.addPostfix(fieldDiv, settings, this.label, false, this.callback);

                noButtons = 1;
                break;

            case INPUTTYPE.VEC3:
                this.children.push(InputField(fieldDiv, 'x', [INPUTTYPE.DOUBLE], defaults.getValue()[0], updateCallback));
                this.children.push(InputField(fieldDiv, 'y', [INPUTTYPE.DOUBLE], defaults.getValue()[1], updateCallback));
                this.children.push(InputField(fieldDiv, 'z', [INPUTTYPE.DOUBLE], defaults.getValue()[2], updateCallback));
                var label = document.getElementById('fieldLabel_' + this.id);
                label.style.width = '100%';

                noButtons = 1;
                break;

            default:
                break;

        }

        if (!noButtons) {

            // create buttons
            var normalButton = document.createElement('button');
            normalButton.id = 'inputField_' + this.id + '_normalButton';
            var randomButton = document.createElement('button');
            randomButton.id = 'inputField_' + this.id + '_randomButton';
            var lambdaButton = document.createElement('button');
            lambdaButton.id = 'inputField_' + this.id + '_lambdaButton';

            // set classes
            normalButton.classList.add("inputField-button");
            normalButton.classList.add("inputField-buttonSelected");
            randomButton.classList.add("inputField-button");
            lambdaButton.classList.add("inputField-button");

            // set text
            var normalButton_text = document.createTextNode("1");
            normalButton.appendChild(normalButton_text);
            var lambdaButton_text = document.createTextNode('\u03BB');
            lambdaButton.appendChild(lambdaButton_text);
            randomButton.style.background = "url(https://dl.dropboxusercontent.com/s/ui63t32hhvropzy/dice.png?dl=0)"

            // append to div
            fieldDiv.appendChild(lambdaButton);
            fieldDiv.appendChild(randomButton);
            fieldDiv.appendChild(normalButton);

            // set functions
            $('#inputField_' + this.id + '_normalButton').click(function() {self.normalButton_clicked();});
            $('#inputField_' + this.id + '_randomButton').click(function() {self.randomButton_clicked();});
            $('#inputField_' + this.id + '_lambdaButton').click(function() {self.lambdaButton_clicked();});

        }

    };

    self.remove = function() {
        for (var i = 0; i < this.children; i++) {
            this.children[i].remove();
        }
        for (var i = 0; i < this.inputs.length; i++) {
            var fieldDiv = this.inputs[0].parentNode;
            fieldDiv.removeChild(this.inputs[i]);
            fieldDiv.parentNode.removeChild(fieldDiv);
        }
    };

    self.setValue = function(value, updateRange) {
        if (updateRange && self.types[0] != INPUTTYPE.VEC3) {
            if (value.type == INPUTFIELDVALUETYPE.RANGE) {
                this.randomButton_clicked(true);
            } else if (value.type == INPUTFIELDVALUETYPE.LAMBDA) {
                this.lambdaButton_clicked(true);
            } else if (value.type != INPUTFIELDVALUETYPE.RANGE) {
                this.normalButton_clicked(true);
            }
        }

        if (value.type == INPUTFIELDVALUETYPE.RANGE) {
            var selector = document.getElementById('selector' + this.id);
            switch (value.rndType) {
                case RANDOMTYPE.RND:
                    selector.value = 'Rnd';
                    break;
                case RANDOMTYPE.RNDFUNC:
                    selector.value = 'RndFunc';
                    break;
                default:
                    break;
            }
        }

        switch (this.types[0]) {

            case INPUTTYPE.STRING:
            case INPUTTYPE.DOUBLE:
            case INPUTTYPE.RAW:
                if (this.random && value.getValue().length == 2) {
                    this.inputs[0].value = value.getValue()[0];
                    this.inputs[1].value = value.getValue()[1];
                } else if (this.random) {
                    this.inputs[0].value = value.getValue();
                    this.inputs[1].value = value.getValue();
                } else {
                    this.inputs[0].value = value.getValue();
                }
                break;

            case INPUTTYPE.DROPDOWN:
                var selector = this.inputs[0];
                for (var i = 0; i < selector.options.length; i++) {
                    if (selector.options[i].value == value.toString()) {
                        selector.selectedIndex = i;
                        break;
                    }
                }
                break;

            case INPUTTYPE.TAG:
                // TODO: set tags
                break;

            case INPUTTYPE.TAGS:
                // TODO: set tags
                break;

            case INPUTTYPE.VEC3:
                this.children[0].setValue(value.getValue()[0], updateRange);
                this.children[1].setValue(value.getValue()[1], updateRange);
                this.children[2].setValue(value.getValue()[2], updateRange);
                break;

            default:
                break;

        }
    };

    self.getValue = function() {
        var value = InputFieldValue();
        switch (this.types[0]) {

            case INPUTTYPE.STRING:
            case INPUTTYPE.DROPDOWN:
                value.setValue(this.inputs[0].value);
                break;

            case INPUTTYPE.RAW:
                if (!isNaN(this.inputs[0].value)) {
                    value.setValue(parseFloat(this.inputs[0].value));
                } else {
                    if (this.random) {
                        value.setValue([this.inputs[0].value, this.inputs[1].value]);
                    } else {
                        value.setValue(this.inputs[0].value);
                    }
                }
                break;

            case INPUTTYPE.DOUBLE:
                if (this.random) {
                    value.setValue([parseFloat(this.inputs[0].value), parseFloat(this.inputs[1].value)]);
                } else if (!isNaN(this.inputs[0].value)) {
                    value.setValue(parseFloat(this.inputs[0].value));
                } else {
                    value.setValue(this.inputs[0].value);
                }
                break;

            case INPUTTYPE.TAG:
            case INPUTTYPE.TAGS:
                // TODO add tags to value
                /*
                value = {};
                var inputDiv = document.getElementById('inputDiv');
                renderer.postfixController.applyPostfixes(inputDiv, value);
                */
                break;

            case INPUTTYPE.VEC3:
                var values = [];
                values[0] = this.children[0].getValue();
                values[1] = this.children[1].getValue();
                values[2] = this.children[2].getValue();
                value.setValue(values);
                break;

            default:
                break;

        }

        if (this.random) {
            var selector = document.getElementById('selector' + this.id);
            var rndType = selector.value;
            switch (rndType) {
                case 'Rnd':
                    value.setRandomType(RANDOMTYPE.RND);
                    break;
                case 'RndFunc':
                    value.setRandomType(RANDOMTYPE.RNDFUNC);
                    break;
                default:
                    break;
            }
        }

        return value;
    };

    self.normalButton_clicked = function(noSetting) {
        var normalButton = document.getElementById('inputField_' + this.id + '_normalButton');
        var randomButton = document.getElementById('inputField_' + this.id + '_randomButton');
        var lambdaButton = document.getElementById('inputField_' + this.id + '_lambdaButton');
        if (!normalButton.classList.contains('inputField-buttonSelected')) {
            if (!lambdaButton.classList.contains('inputField-buttonSelected')) {
                var currentValue = this.getValue();
                this.switchToSingleInput();
                currentValue.switchType(INPUTFIELDVALUETYPE.NUMBER);
                if (!noSetting) this.setValue(currentValue);
            }
            if (!noSetting) this.callback();

            normalButton.classList.add('inputField-buttonSelected');
            randomButton.classList.remove('inputField-buttonSelected');
            lambdaButton.classList.remove('inputField-buttonSelected');
        }
    };

    self.randomButton_clicked = function(noSetting) {
        var normalButton = document.getElementById('inputField_' + this.id + '_normalButton');
        var randomButton = document.getElementById('inputField_' + this.id + '_randomButton');
        var lambdaButton = document.getElementById('inputField_' + this.id + '_lambdaButton');
        if (!randomButton.classList.contains('inputField-buttonSelected')) {
            var currentValue = this.getValue();
            this.switchToRndInput();
            currentValue.switchType(INPUTFIELDVALUETYPE.RANGE);
            if (!noSetting) {
                this.setValue(currentValue);
                this.callback();
            }

            randomButton.classList.add('inputField-buttonSelected');
            normalButton.classList.remove('inputField-buttonSelected');
            lambdaButton.classList.remove('inputField-buttonSelected');
        }
    };

    self.lambdaButton_clicked = function(noSetting) {
        var normalButton = document.getElementById('inputField_' + this.id + '_normalButton');
        var randomButton = document.getElementById('inputField_' + this.id + '_randomButton');
        var lambdaButton = document.getElementById('inputField_' + this.id + '_lambdaButton');
        if (!lambdaButton.classList.contains('inputField-buttonSelected')) {
            if (!normalButton.classList.contains('inputField-buttonSelected')) {
                var currentValue = this.getValue();
                this.switchToSingleInput();
                currentValue.switchType(INPUTFIELDVALUETYPE.LAMBDA);
                if (!noSetting) this.setValue(currentValue);
            }
            if (!noSetting) this.callback();

            lambdaButton.classList.add('inputField-buttonSelected');
            randomButton.classList.remove('inputField-buttonSelected');
            normalButton.classList.remove('inputField-buttonSelected');
        }
    };

    self.switchToSingleInput = function() {
        for (var i = 0; i < this.inputs.length; i++) {
            this.inputs[i].parentNode.removeChild(this.inputs[i]);
        }
        var selector = document.getElementById('selector' + this.id);
        selector.parentNode.removeChild(selector);
        this.inputs = [];

        var id = "inputField_" + this.id;
        var input = document.createElement("input");
        input.setAttribute('type', 'text');
        input.setAttribute('id', id);
        input.classList += 'inputField-inputField';
        input.addEventListener("change", this.callback);
        var fieldDiv = document.getElementById("fieldDiv_" + this.id);
        fieldDiv.appendChild(input);
        this.inputs[0] = input;

        this.random = 0;
    };

    self.switchToRndInput = function() {
        for (var i = 0; i < this.inputs.length; i++) {
            this.inputs[i].parentNode.removeChild(this.inputs[i]);
        }
        this.inputs = [];

        var selector = document.createElement('select');
        selector.id = 'selector' + this.id;
        var rnd_option = document.createElement('option');
        rnd_option.text = rnd_option.value = 'Rnd';
        var rndFunc_options = document.createElement('option');
        rndFunc_options.text = rndFunc_options.value = 'RndFunc';
        selector.add(rnd_option, 0);
        selector.add(rndFunc_options, 0);
        selector.onchange = this.callback;
        var fieldDiv = document.getElementById("fieldDiv_" + this.id);
        fieldDiv.appendChild(selector);

        var id = "inputField1_" + this.id;
        var input = document.createElement("input");
        input.setAttribute('type', 'text');
        input.setAttribute('id', id);
        input.classList += 'inputField-inputField';
        input.addEventListener("change", this.callback);
        fieldDiv.appendChild(input);
        this.inputs[0] = input;

        id = "inputField2_" + this.id;
        input = document.createElement("input");
        input.setAttribute('type', 'text');
        input.setAttribute('id', id);
        input.classList += 'inputField-inputField';
        input.addEventListener("change", this.callback);
        fieldDiv.appendChild(input);
        this.inputs[1] = input;

        this.random = 1;
    };


    self.create();
    self.setValue(defaults, true);
    return self;

}