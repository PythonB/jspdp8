const TTY_OUT_ID = 0;
const TTY_IN_ID = 1;

export function normalizeValue(value){
    return [(value & 0xfff), (value > (value & 0xfff))]
}
export function toOctal(value, size=4){
    if(value == undefined){
        return "0".repeat(size);
    }
    var tmp = value.toString(8);
    if(tmp == "NaN"){
        tmp = "0"
    }
    while(tmp.length < size){
        tmp = "0" + tmp;
    }
    return tmp;
}
export function toBinary(value, size=12){
    var tmp = value.toString(2);
    while(tmp.length < size){
        tmp = "0" + tmp;
    }
    return tmp;
}
export function checkBit(value, bit){
    return (value>>bit)&0b1
}

export class PDP8 {
    constructor(tty){
        this.ac = 0;
        this.pc = 0;
        this.l = false;
        this.mbr = 0;
        this.mar = 0;
        this.ram = []
        this.halted = false;
        this.tty = tty;
        for(var i = 0; i < 4096-this.ram.length; i++){
            this.ram.push(0)
        }
    }
    reset(){
        this.ac = 0;
        this.pc = 0;
        this.l = false;
        this.mbr = 0;
        this.mar = 0;
        this.ram = []
        this.halted = false;
    }
    getMAR(){
        return this.mar;
    }
    returnState(){
        //var str = `${toOctal(this.pc)}: ${toOctal(this.ram[this.pc])} | ${toOctal(this.ac)}    ${toOctal(this.mbr)}->${toOctal(this.mar)}``${toOctal(this.pc)}: ${toOctal(this.ram[this.pc])} | ${toOctal(this.ac)}    ${toOctal(this.mbr)}->${toOctal(this.mar)}`;
        return [
            (this.halted ? 'Halted' : 'Running'),
            toOctal(this.pc),
            toOctal(this.ram[this.pc]),
            toOctal(this.ac),
            toOctal(this.mbr),
            toOctal(this.mar)
        ]
    }
    execute(){
        if(this.halted){
            return this.returnState();
        }
        var instruction = this.ram[this.pc];
        var opcode = (instruction & 0b111000000000)>>9;
        var mode = (instruction & 0b000100000000)>>8;
        var page = (instruction & 0b000010000000)>>7;
        var tmp = 0;
        if(mode == 0){
            tmp = (instruction & 0b000001111111);
        } else {
            tmp = this.ram[(instruction & 0b000001111111)];
        }
        if(page == 0){
            this.mar = (this.pc & 0b111110000000) + tmp;
        } else {
            this.mar = tmp;
        }
        this.mbr = this.ram[this.mar];
        if(opcode == 0){                                // AND
            this.ac = this.ac & this.mbr;
            this.pc++
        } else if(opcode == 1){                         // TAC
            var norm = normalizeValue(this.ac + this.mbr);
            this.ac = norm[0];
            this.l = norm[1];
            this.pc++;
        } else if(opcode == 2){                         // ISZ
            var norm = normalizeValue(this.ram[this.mar]+1);
            this.ram[this.mar] = norm[0];
            if(norm[1]){
                this.pc++;
            }
            this.pc++;
        } else if(opcode == 3){                         // DCA
            this.ram[this.mar] = this.ac;
            this.ac = 0;
            this.pc++;
        } else if(opcode == 4){                         // JMS
            this.ram[this.mar] = this.pc+1;
            this.pc = this.mar+1;
        } else if(opcode == 5){                         // JMP
            if(mode){
                this.pc = (this.pc & 0b111110000000)+this.ram[(this.pc & 0b111110000000)+(instruction & 0b000001111111)];
            } else {
                this.pc = (this.pc & 0b111110000000)+(instruction & 0b000001111111);
            }
        } else if(opcode == 6){                         // IOT
            var dev = (instruction & 0b000111111000) >> 3
            var op = (instruction & 0b00000000111);
            if(dev == 4){
                if(op == 1){
                    if(this.tty.getStatus(TTY_OUT_ID)){
                        this.pc++;
                    }
                } else if(op == 2){
                    this.tty.setStatus(TTY_OUT_ID, false);
                } else if(op == 3){
                    this.ac = 0;
                } else if(op == 4){
                    // to do
                    console.log(String.fromCharCode(this.ac))
                    this.tty.receive(String.fromCharCode(this.ac & 0b000001111111)); // Send only lower 7 bits
                }
                this.pc++;
            } else if(dev == 3){
                if(op == 1){
                    if(this.tty.getStatus(TTY_IN_ID) == true){
                        this.pc++;
                    }
                } else if(op == 2){
                    this.tty.setStatus(TTY_IN_ID, false);
                } else if(op == 6){
                    this.ac = this.tty.getInput();
                    this.tty.setStatus(TTY_IN_ID, false);
                }
                this.pc++;
            }
        } else if(opcode == 7){                         // OPR
            if(checkBit(instruction, 8) == 0){
                // Group 1
                if(checkBit(instruction, 7)){       // CLA
                    this.ac = 0;
                }
                if(checkBit(instruction, 6)){       // CLL
                    this.l = 0;
                }
                if(checkBit(instruction, 5)){       // CMA
                    this.ac = !this.ac;
                }
                if(checkBit(instruction, 4)){       // CML
                    this.l = (!this.l)&0b1;
                }
                if(checkBit(instruction, 3)){       // RAR
                    var tmp = checkBit(this.ac, 0);
                    var val = (this.ac>>1) & 0b11111111111;
                    val = val + (this.l << 12);
                    this.l = tmp;
                }
                if(checkBit(instruction, 2)){       // RAL
                    var val = this.ac<<1;
                    val = val + this.l;
                    this.ac = val & 0xfff;
                    this.l = checkBit(val, 12);
                }
                if(checkBit(instruction, 1)){       // BSW
                    var tmp = (this.ac & 0b111111000000)>>6;
                    tmp = (this.ac & 0b000000111111)<<6 + tmp;
                    this.ac = tmp;
                }
                if(checkBit(instruction, 0)){       // IAC
                    var norm = normalizeValue(this.ac+1);
                    this.ac = norm[0];
                    this.l = norm[1];
                }
            } else if(checkBit(instruction, 8)){
                if(checkBit(instruction, 3) == 0 && checkBit(instruction, 0) == 0){   // Group 2 OR
                    if(checkBit(instruction, 7)){   // CLA
                        this.ac = 0;
                    }
                    if(checkBit(instruction, 6)){   // SMA
                        if(this.ac > 0){
                            this.pc++;
                        }
                    }
                    if(checkBit(instruction, 5)){   // SZA
                        if(this.ac == 0){
                            this.pc++;
                        }
                    }
                    if(checkBit(instruction, 4)){   // SNL
                        if(this.l != 0){
                            this.pc++;
                        }
                    }
                    if(checkBit(instruction, 2)){   // OSR
                        this.ac = this.ac | 0xfff;  // to do: replace with emulated switches
                    }
                    if(checkBit(instruction, 1)){   // HLT
                        this.halted = true;
                    }
                } else if(checkBit(instruction, 3) == 1 && checkBit(instruction, 0) == 0){  // Group 2 AND
                    if(checkBit(instruction, 7)){   // CLA
                        this.ac = 0;
                    }
                    if(checkBit(instruction, 6)){   // SPA
                        if(this.ac >= 0){
                            this.pc++;
                        }
                    }
                    if(checkBit(instruction, 5)){   // SNA
                        if(this.ac != 0){
                            this.pc++;
                        }
                    }
                    if(checkBit(instruction, 4)){   // SZL
                        if(this.l == 0){
                            this.pc++;
                        }
                    }
                    if(checkBit(instruction, 2)){   // OSR
                        this.ac = this.ac | 0xfff;  // to do: replace with emulated switches
                    }
                    if(checkBit(instruction, 1)){   // HLT
                        this.halted = true;
                    }
                }
            }
            this.pc++
        }
        if(this.pc >= 4096){
            this.pc--;
            this.halted = true;
        }
        var state = this.returnState();
        return state;
    }
}
