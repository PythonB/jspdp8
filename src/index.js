import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.sass';
import {toBinary, toOctal, PDP8} from "./jspdp8.js"
import {EmulatedTeletype} from "./teletype.js"

const TTY_OUT_ID = 0;
const TTY_IN_ID = 1;

// To do: Load them as files from user side
const hello = [0o7200,0o1614,0o7450,0o7402,0o6041,0o5204,0o6044,0o7200,0o1214,0o7001,0o3214,0o5201,0o0015,0o0110,0o0105,0o0114,0o0114,0o0117,0o054,0o0040,0o127,0o0117,0o0122,0o0114,0o0104,0o0041,0o0000];
const greeter = [0o5017,0o7000,0o5004,0o0000,0o3003,0o1403,0o7450,0o5401,0o6041,0o5010,0o6044,0o2003,0o7200,0o5005,0o0052,0o7200,0o1016,0o4001,0o5026,0o0000,0o7766,0o0000,0o6031,0o5026,0o6036,0o3023,0o1023,0o1024,0o7450,0o5043,0o7200,0o1023,0o3510,0o2110,0o5026,0o7200,0o3510,0o1076,0o4001,0o3003,0o1107,0o4001,0o0127,0o0110,0o0101,0o0124,0o0040,0o0111,0o0123,0o0040,0o0131,0o0117,0o0125,0o0122,0o0040,0o0116,0o0101,0o0115,0o0105,0o0077,0o0040,0o0000,0o0077,0o0110,0o0105,0o0114,0o0114,0o0117,0o0054,0o0040,0o0000,0o0111,0o0111]

var shouldRerender = true

class JSTTY {
    constructor(){
        this.content = "JSTTY loaded\n"
        this.last_position = 0;
    }
    setContent(newContent){
        this.content = newContent;
    }
    getContent(){
        return this.content
    }
}

class StateView extends React.Component {
    constructor(props){
        super(props);
    }
    render(){
        return(
            <div id="state-view">
                <div id="state">
                    <h3>PDP-8 state</h3>
                    <div className="general-block">
                        <div className="label">State</div><div id={`state-${this.props.state_array[0].toLowerCase()}`}>{this.props.state_array[0]}</div>
                    </div>
                    <div className="pc-block">
                        <div className="label">PC</div><div className="value">{this.props.state_array[1]}</div><div className="value-binary">{toBinary(parseInt(this.props.state_array[1], 8))}</div><br/>
                        <div className="label">Instruction</div><div className="value">{this.props.state_array[2]}</div><div className="value-binary">{toBinary(parseInt(this.props.state_array[2], 8))}</div><br/>
                    </div>
                    <div className="register-block">
                        <div className="label">AC</div><div className="value">{this.props.state_array[3]}</div><div className="value-binary">{toBinary(parseInt(this.props.state_array[3], 8))}</div><br/>
                        <div className="label">MBR</div><div className="value">{this.props.state_array[4]}</div><div className="value-binary">{toBinary(parseInt(this.props.state_array[4], 8))}</div><br/>
                        <div className="label">MAR</div><div className="value">{this.props.state_array[5]}</div><div className="value-binary">{toBinary(parseInt(this.props.state_array[5], 8))}</div>
                    </div>
                </div>
                <div id="speed">
                    <h3>Speed</h3>
                    <div className="buttons-block">
                        <button onClick={resetPDP}>Reset</button>
                        <button onClick={singleStep}>Step</button>
                        <button onClick={()=>{
                                isRunning=!isRunning;
                                isAnim=!isAnim
                            }}>Animate</button>
                        <button onClick={()=>{isRunning=!isRunning; isAnim=false}}>Run</button>
                    </div>
                </div>
            </div>
        );
    }
}
class ProgramView extends React.Component {
    constructor(props){
        super(props);
    }
    render(){
        var instructions = [];
        for(var i = -2; i < 14; i++){
            instructions.push([toOctal(this.props.pdp8.pc+i, 3), this.props.pdp8.disasm(this.props.pdp8.ram[this.props.pdp8.pc+i])]);
        } 
        return(
            <div id="program-view">
                {instructions.map((i)=>{
                    return(
                        <div><div className="line-addr">{i[0]}</div><div className="line">{i[1]}<br/></div></div>
                    );
                })}
            </div>
        )
    }
}
class MemoryView extends React.Component {
    constructor(props){
        super(props);
        this.page = 0;
    }
    changePage(d=1){
        var newVal = this.page+d;
        if(newVal < 0){
            newVal = 0x1f;
        } else if(newVal == 0x20){
            newVal = 0;
        }
        this.page = newVal;
        console.log(this.page);
    }
    render(){
        var page_content = []
        for(var i = 0; i < 16; i++){
            var line = []
            for(var j = 0; j < 8; j++){
                line.push(this.props.pdp8.ram[(this.page<<7)+(i*8)+j]);
            }
            page_content.push(line);
        }
        return(
            <div id="memory-view">
                <>
                    <div id="panel">
                        <h3>Memory</h3>
                    </div><br/>
                </>
                <div id="memory-content">
                    {page_content.map((line, index)=>{
                        return(
                            <><div className="line">
                                <div className="addr">{toOctal((this.page<<7)+(index*8))}</div>
                                <div className="values">{line.map((value, li)=>{
                                    if(this.props.pdp8.pc == ((this.page<<7)+(index*8)+li)){
                                        return(
                                            <div className="value-selected">{toOctal(value)} </div>
                                        )
                                    } else {
                                        return(
                                            <div className="value">{toOctal(value)} </div>
                                        )
                                    }
                                })}</div>
                            </div><br/></>
                        )
                    })}
                </div>
            </div>    
        )
    }
}
class ProgramLoad extends React.Component {
    constructor(props){
        super(props);
        this.pdp8 = this.props.pdp8;
        this.state = {value: 'helloworld'};
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(event) {
        this.setState({value: event.target.value});
        console.log(this.state.value)
    }
    handleSubmit(event) {
        this.pdp8.reset();
        isRunning = false;
        isAnim = false;
        counter = 1;
        if(this.state.value == "helloworld"){
            this.pdp8.ram = hello
        } else if(this.state.value == "greeter"){
            this.pdp8.ram = greeter
        } else {
            // pass
        }
        root.render(
            <div id="wrapper">
                <StateView state_array={pdp8.returnState()}/>
                <MemoryView pdp8={pdp8}/>
                <div id="wrapper-right">
                    <Console tty={jstty}/>
                    <ProgramLoad pdp8={pdp8}/>
                </div>
            </div>
        );
        event.preventDefault();
    }
    render(){
        return(
            <div id="programload">
                <h3>Program Loader (Work in progress)</h3>
                <form onSubmit={this.handleSubmit}>
                    <select value={this.state.value} onChange={this.handleChange}>
                        <option value="helloworld">Hello World</option>
                        <option value="greeter">Greeter</option>
                    </select>
                    <input type="submit" value="Load"/>
                </form>
            </div>
        );
    }
}
class Console extends React.Component {
    constructor(props){
        super(props);
        this.tty = this.props.tty;
    }
    render(){
        return(
            <div id="console-view">
                <h3>Teletype ASR-33</h3>
                <div id="tty-content">
                    {this.tty.getContent().split("\n").map((line) => {
                        return(
                            <div>
                                {line.split("").map((char)=>{
                                    if(char == " "){
                                        return(<>&nbsp;</>)
                                    } else {
                                        return(<>{char}</>)
                                    }
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
const emutty = new EmulatedTeletype();
const pdp8 = new PDP8(emutty);
const jstty = new JSTTY();
pdp8.ram = hello;
root.render(
    <div id="wrapper">
        <StateView state_array={pdp8.returnState()}/>
        <MemoryView pdp8={pdp8}/>
        <div id="wrapper-right">
            <Console tty={jstty}/>
            <ProgramLoad pdp8={pdp8}/>
        </div>
    </div>
);
var counter = 1;
var isRunning = false;
var isAnim = false;


document.onkeypress = function (e) {
    e = e || window.event;
    var key = e.key;
    var state = pdp8.returnState();
    emutty.receiveInput(key);
    jstty.setContent(emutty.getContent())
    root.render(
        <div id="wrapper">
            <StateView state_array={state}/>
            <MemoryView pdp8={pdp8}/>
            <div id="wrapper-right">
                <Console tty={jstty}/>
                <ProgramLoad pdp8={pdp8}/>
            </div>
        </div>
    );
};

window.setInterval(()=>{
    if(isRunning == true){
        var state;
        if(isAnim == true){
            if(counter % 33 == 0){  // Emulating teletype speed of 10 charcaters per second
                emutty.setStatus(TTY_OUT_ID, true);
            }
            state = pdp8.execute();
        } else {
            for(var i = 0; i < 1000; i++){
                state = pdp8.execute();
            }
        }
        //state = pdp8.execute();
        jstty.setContent(emutty.getContent())
        root.render(
            <div id="wrapper">
                <StateView state_array={state}/>
                <MemoryView pdp8={pdp8}/>
                <div id="wrapper-right">
                    <Console tty={jstty}/>
                    <ProgramLoad pdp8={pdp8}/>
                </div>
            </div>
        );
        if(counter % 33 == 0){  // Emulating teletype speed of 10 charcaters per second
            // make teletype ready
            emutty.setStatus(TTY_OUT_ID, true);
        }
        counter++;
    }
}, 3)

function singleStep(){
    isRunning = false;
    isAnim = false;
    emutty.setStatus(TTY_OUT_ID, true);
    var state = pdp8.execute();
    jstty.setContent(emutty.getContent())
    root.render(
        <div id="wrapper">
            <StateView state_array={state}/>
            <MemoryView pdp8={pdp8}/>
            <div id="wrapper-right">
                <Console tty={jstty}/>
                <ProgramLoad pdp8={pdp8}/>
            </div>
        </div>
    );
}
function resetPDP(){
    pdp8.reset();
    emutty.content = [];
    isRunning = false;
    isAnim = false;
    root.render(
        <div id="wrapper">
            <StateView state_array={pdp8.returnState()}/>
            <MemoryView pdp8={pdp8}/>
            <div id="wrapper-right">
                <Console tty={jstty}/>
                <ProgramLoad pdp8={pdp8}/>
            </div>
        </div>
    );
    jstty.content = "";
}