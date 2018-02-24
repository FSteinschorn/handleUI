function InputField(parentDiv, label, types, defaults, updateCallback) {

    var self = {};

    self.id = makeid();
    self.parentDiv = parentDiv;
    self.label = label;
    self.types = types;
    self.defaults = defaults;
    self.callback = updateCallback;

    self.inputs = [];

    self.create = function() {

        var fieldDiv = document.createElement('div');
        fieldDiv.id = "fieldDiv_" + self.id;
        self.parentDiv.appendChild(fieldDiv);

        // add label
        if (self.label != null && !self.types.contains(INPUTTYPE.TAG) && !self.types.contains(INPUTTYPE.TAGS)) {
            var label = document.createElement('span');
            label.id = 'label' + i;
            label.innerHTML = self.label + ': ';
            fieldDiv.appendChild(label);
        }

        // build input
        switch (self.types[0]) {

            case INPUTTYPE.STRING:
            case INPUTTYPE.DOUBLE:
            case INPUTTYPE.RAW:
                var id = "inputField_" + self.id;
                var input = document.createElement("input");
                input.setAttribute('type', 'text');
                input.setAttribute('id', id);
                input.addEventListener("change", self.callback);
                if (self.defaults != null) {
                    if (isFunction(self.defaults)) {
                        input.value = self.defaults();
                    } else {
                        input.value = self.defaults;
                    }
                }
                fieldDiv.appendChild(input);
                self.inputs[0] = input;
                break;

            case INPUTTYPE.DROPDOWN:
                var id = "dropdown_" + self.id;
                var innerHTML = '<select id=' + id + '>';
                for (var j = 0; j < self.defaults.length; j++) {
                    innerHTML += '<option vaule ="' + self.defaults[j] + '">' + self.defaults[j] + '</options>';
                }
                innerHTML += '</select>';
                fieldDiv.innerHTML += innerHTML;
                var selector = document.getElementById(id);
                selector.addEventListener("change", self.callback);
                for (j = 0; j < selector.options.length; j++) {
                    if (selector.options[j].label == self.defaults)
                        selector.selectedIndex = j;
                }
                self.inputs[0] = selector;
                break;

            case INPUTTYPE.TAG:
                if (self.defaults) var settings = self.defaults;
                else var settings = null;
                renderer.postfixController.addPostfix(fieldDiv, settings, self.label, false, self.callback);
                break;

            case INPUTTYPE.TAGS:
                if (self.defaults) var settings = self.defaults;
                else var settings = null;
                renderer.postfixController.addPostfix(fieldDiv, settings, self.label, false, self.callback);
                break;

            case INPUTTYPE.VEC3:
                var id = "vec3_" + self.id + "_elem0";
                var input1 = document.createElement("input");
                input1.setAttribute('type', 'text');
                input1.setAttribute('id', id);
                input1.addEventListener("change", self.callback);
                fieldDiv.appendChild(input1);
                id = "vec3_" + self.id + "_elem1";
                var input2 = document.createElement("input");
                input2.setAttribute('type', 'text');
                input2.setAttribute('id', id);
                input2.addEventListener("change", self.callback);
                fieldDiv.appendChild(input2);
                id = "vec3_" + self.id + "_elem2";
                var input3 = document.createElement("input");
                input3.setAttribute('type', 'text');
                input3.setAttribute('id', id);
                input3.addEventListener("change", self.callback);
                fieldDiv.appendChild(input3);
                if (self.defaults != null) {
                    if (isFunction(self.defaults)) {
                        input2.value = self.defaults()[1];
                        input1.value = self.defaults()[0];
                        input3.value = self.defaults()[2];
                    } else {
                        input1.value = self.defaults[0];
                        input2.value = self.defaults[1];
                        input3.value = self.defaults[2];
                    }
                }
                self.inputs[] = [input1, input2, input3];
                break;

            default:
                break;

        }
    };

    self.setValue = function(value) {
        switch (self.type[0]) {

            case INPUTTYPE.STRING:
            case INPUTTYPE.DOUBLE:
            case INPUTTYPE.RAW:
                self.inputs[0].value = value;
                break;

            case INPUTTYPE.DROPDOWN:
                self.inputs[0].value = value;
                break;

            case INPUTTYPE.TAG:
                // TODO: set tags
                break;

            case INPUTTYPE.TAGS:
                // TODO: set tags
                break;

            case INPUTTYPE.VEC3:
                self.inputs[0].value = value[0];
                self.inputs[1].value = value[1];
                self.inputs[2].value = value[2];
                break;

            default:
                break;

        }
    };

    self.getNumberValue = function() {
        var value;
        switch (self.type) {

            case INPUTTYPE.STRING:
            case INPUTTYPE.RAW:
            case INPUTTYPE.DROPDOWN:
                value = self.inputs[0].value;
                break;

            case INPUTTYPE.DOUBLE:
                value = parseFloat(self.inputs[0].value);
                break;

            case INPUTTYPE.TAG:
            case INPUTTYPE.TAGS:
                value = {};
                var inputDiv = document.getElementById('inputDiv');
                renderer.postfixController.applyPostfixes(inputDiv, value);
                break;

            case INPUTTYPE.VEC3:
                value = [];
                value[0] = parseFloat(self.inputs[0].value);
                value[1] = parseFloat(self.inputs[1].value);
                value[2] = parseFloat(self.inputs[2].value);
                break;

            default:
                break;

        }

        return value;
    };

    self.getStringValue = function() {
        return self.getNumberValue();
    };

    self.create();
    return self;

}