var INPUTFIELDVALUETYPE = {
    NUMBER: 343135,
    RANGE: 354318,
    LAMBDA: 648618,
    VECTOR: 348431,
    STRING: 672167
};

var RANDOMTYPE = {
    RNDFUNC: 61642156462,
    RND: 44216431632
};

function InputFieldValue(value) {

    var self = {};

    self.type = INPUTFIELDVALUETYPE.NUMBER;

    // simple number value
    self.number = 0;

    // random range
    self.rndType = RANDOMTYPE.RND;
    self.min = 0;
    self.max = 0;

    // lamda expression
    self.lambda = "x";

    // vector
    self.vec = [];

    // string
    self.string = "";

    self.setValue = function(value) {
        var range = this.max - this.min;
        if (isNaN(range)) range = 0;

        this.number = NaN;
        this.min = NaN;
        this.max = NaN;
        this.lambda = "";
        this.string = "";
        if (this.vec.length == 0)
            this.vec = [InputFieldValue(), InputFieldValue(), InputFieldValue()];

        if (typeof value == 'string' || value instanceof String) {
            if (value.includes('=>')) {
                this.type = INPUTFIELDVALUETYPE.LAMBDA;
                this.lambda = value;
                this.string = value;
            } else {
                this.type = INPUTFIELDVALUETYPE.STRING;
                this.lambda = value;
                this.string = value;
            }
        } else if (Array.isArray(value)) {
            if (value.length == 2) {
                this.type = INPUTFIELDVALUETYPE.RANGE;
                this.number = ((value[0] + value[1]) / 2).round();
                this.min = value[0];
                this.max = value[1];
                this.lambda = ((value[1] + value[0]) / 2).round();
                this.vec[0].setValue((value[1] + value[0]) / 2);
                this.vec[1].setValue((value[1] + value[0]) / 2);
                this.vec[2].setValue((value[1] + value[0]) / 2);
                this.string = this.toString();
            } else {
                this.type = INPUTFIELDVALUETYPE.VECTOR;
                if (!value[0].type) {
                    this.number = value[0];
                    this.min = (value[0] - range / 2).round();
                    this.max = (value[0] + range / 2).round();
                    this.vec[0].setValue(value[0]);
                    this.vec[1].setValue(value[1]);
                    this.vec[2].setValue(value[2]);
                    this.lambda = this.toString();
                    this.string = this.toString();
                } else {
                    this.number = value[0].toNumber();
                    this.min = (value[0].toNumber() - range / 2).round();
                    this.max = (value[0].toNumber() + range / 2).round();
                    this.vec = value;
                    this.lambda = this.toString();
                    this.string = this.toString();
                }
            }
        } else {
            if (this.type != INPUTFIELDVALUETYPE.RANGE)
                this.type = INPUTFIELDVALUETYPE.NUMBER;
            this.number = value;
            this.min = (value - range/2).round();
            this.max = (value + range/2).round();
            this.lambda = value;
            this.string = value;
        }
    };

    self.toNumber = function() {
        switch (this.type) {
            case INPUTFIELDVALUETYPE.NUMBER:
                return this.number;
                break;

            case INPUTFIELDVALUETYPE.RANGE:
                return (this.max + this.min) / 2;
                break;

            case INPUTFIELDVALUETYPE.VECTOR:
                return [this.vec[0].toNumber(),
                    this.vec[1].toNumber(),
                    this.vec[2].toNumber()];
                break;

            default:
                return NaN;
                break;
        }
    };

    self.getValue = function() {
        switch (this.type) {
            case INPUTFIELDVALUETYPE.NUMBER:
                return this.number;
                break;

            case INPUTFIELDVALUETYPE.RANGE:
                return [this.min, this.max];
                break;

            case INPUTFIELDVALUETYPE.LAMBDA:
                return this.lambda;
                break;

            case INPUTFIELDVALUETYPE.VECTOR:
                return this.vec;
                break;

            case INPUTFIELDVALUETYPE.STRING:
                return this.string;
                break;

            default:
                return "ERROR";
                break;
        }
    };

    self.toString = function() {
        switch (this.type) {
            case INPUTFIELDVALUETYPE.NUMBER:
                return this.number;
                break;

            case INPUTFIELDVALUETYPE.RANGE:
                var string;
                switch (this.rndType) {
                    case RANDOMTYPE.RND:
                        string = "Rnd(";
                        break;
                    case RANDOMTYPE.RNDFUNC:
                        string = "RndFunc(";
                        break;
                    default:
                        string = "(";
                        break;
                }
                string += this.min + ", " + this.max + ")";
                return string;
                break;

            case INPUTFIELDVALUETYPE.LAMBDA:
                return "x => " + this.lambda;
                break;

            case INPUTFIELDVALUETYPE.VECTOR:
                return ("Vec3(" + this.vec[0].toString()
                        + "," + this.vec[1].toString()
                        + "," + this.vec[2].toString() + ")");
                break;

            case INPUTFIELDVALUETYPE.STRING:
                return '"' + this.string + '"';
                break;

            default:
                return "ERROR";
                break;
        }
    };

    self.switchType = function(newType) {
        this.type = newType;
    };

    self.setRandomType = function(newType) {
        this.rndType = newType;
    };

    if (value) self.setValue(value);
    return self;

}