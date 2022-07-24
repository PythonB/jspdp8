/*export class EmulatedTeletype {
    constructor(){
        this.content = "";
        this.outputIsReady = true;
        this.last_position = 0;
        this.input = "";
        this.inputIsReady = false;
    }
    receiveInput(input){
        this.content += input.toUpperCase();
        this.input = input;
        this.inputIsReady = true;
    }
    receive(str){
        var str_processed = "";
        for(var i = 0; i < str.length; i++){
            var character = str[i];
            if(character.charCodeAt(0) < 27){
                if(character.charCodeAt(0) == 8){

                }
                if(character.charCodeAt(0) == 9){
                    var next_tab_stop = (Math.floor(this.last_position/8)+1)*8
                    while(this.last_position < next_tab_stop){
                        this.last_position++;
                        console.log(`${this.last_position}: ${next_tab_stop}`);
                        this.content+=" ";
                    }
                    console.log(this.content);
                }
            }
            if(character.charCodeAt(0) >= 32 && character.charCodeAt(0) <= 126){
                // It is an ascii character
                this.last_position++;
                if(this.last_position > 72){
                    this.content+="\n";
                    this.last_position = 0;
                }
                if(character >= 97 && character <= 122){
                    character = character.toUpperCase();
                }
                str_processed += character;
            }
        }
        this.content += str_processed;
        this.outputIsReady = false;
    }
    getContent(){
        return this.content.replace("\l\r", "\n").replace("\r\l", "\n").replace("\l", "\n");
    }
    getInput(){
        return this.input.toUpperCase().charCodeAt(0);
    }
    setStatus(dev, status){
        if(dev == 0){
            this.outputIsReady = status;
        } else if(dev == 1){
            this.inputIsReady = status;
        }
    }
    getStatus(dev){
        if(dev == 0){
            return this.outputIsReady;
        } else if(dev == 1){
            return this.inputIsReady;
        }
    }
}*/
export class EmulatedTeletype {
    constructor(){
        this.content = []; 
        this.content.push("                                                                        "); // Line of 72 spaces
        this.readyToPrint = true;
        this.line_position = 0;
        this.line = 0;
        this.input_buffer = "";
        this.readyToSendInput = false;
    }
    setStatus(device, status){
        if(device == 0){
            this.readyToPrint = status;
        } else if(device == 1){
            this.readyToSendInput = status;
        }
    }
    getStatus(device){
        if(device == 0){
            return this.readyToPrint;
        } else if(device == 1){
            return this.readyToSendInput;
        }
        return 0;
    }
    receiveInput(input){
        var input_cleaned;
        if(input == "Enter"){
            input_cleaned = String.fromCharCode(10);
            this.receive(String.fromCharCode(10));
            this.receive(String.fromCharCode(13));
        } else if(input == "Backspace"){
            input_cleaned = String.fromCharCode(8);
        } else if(input == "Escape"){
            input_cleaned = String.fromCharCode(27);
        } else {
            input_cleaned = input.toUpperCase();
            this.receive(input_cleaned);
        }
        this.input_buffer = input_cleaned;
        this.readyToSendInput = true;
    }
    receive(character){
        // Check for control symbols
        var charcode = character.charCodeAt(0);
        switch(charcode){  
            case 8:     // Backspace
                this.line_position--;
                if(this.line_position < 0){
                    this.line_position = 0;
                }
                break;
            case 9:     // Tab
                this.line_position = this.line_position + (8-(this.line_position % 8))  // Set to nearest divisable by 8
                if(this.line_position > 72){
                    this.line_position = 72;
                }
                break;
            case 10:    // Line feed
                this.line++;
                this.content.push("                                                                        ");
                break;
            case 13:    // Carriage Return
                this.line_position = 0;
                break;
        }
        // If not control, print and move carriage
        if(charcode > 31 && charcode < 127){    // it is in printable range
            if(!(charcode > 96 && charcode < 123)){    // print if not lowercase
                var line_content = this.content[this.line];
                var new_content = line_content.substr(0, this.line_position) + character + line_content.substr(this.line_position + 1);
                this.content[this.line] = new_content;
            }
            this.line_position++;
            if(this.line_position > 72){
                this.line_position = 72;
            }
        }
        this.readyToPrint = false;
    }
    getContent(){
        return this.content.join("\n");
    }
    getInput(){
        return this.input_buffer.toUpperCase().charCodeAt(0);
    }
}