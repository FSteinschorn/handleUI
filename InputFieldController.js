
var inputFieldController;

function getInputFieldController() {
    if (!inputFieldController) inputFieldController = new InputFieldController();
    return inputFieldController;
}

function InputFieldController() {

    var self = {};

    self.inputFields = new Map();

    self.addInputField = function(parentDiv, label, types, defaults, updateCallback) {
        var field = InputField(parentDiv, label, types, defaults, updateCallback);
        this.inputFields[field.id] = field;

        return field.id;
    };

    self.removeInputField = function(id) {
        this.inputFields[id].remove();
        this.inputFields.delete(id);
    };

    self.setValue = function(id, value, updateRange) {
        this.inputFields[id].setValue(value, updateRange);
    };

    self.getValue = function(id) {
        return this.inputFields[id].getValue();
    };

    return self;
}