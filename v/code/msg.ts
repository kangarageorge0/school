//
//
//Resolves reference to the asset.products data type
import * as outlook from '../../../outlook/v/code/outlook.js';
//
//Import schema.
import * as schema from "../../../schema/v/code/schema.js";
//
export type Imsg = {msg: string};
//
//Use a pop-up to create a new message.
export class msg extends outlook.baby<Imsg> {
    //
    constructor(base:outlook.page) {
        super(base, "new_msg.html");
    }
    //
    //In future, check if a file json file containing Iquestionnaire is selected.
    //For now, do nothing
    async check(): Promise<boolean> { 
        //
        //Get the message text.
        const text = <HTMLTextAreaElement>this.get_element('msg');
        //
        if (text.value===''){
            //
            this.win.alert(`Please enter message`);
            //
            return false;
        }
        //
        //Compile the message.
        this.result = <Imsg>{msg: text.value};
        //
        return true;
    }
    //
    //Collect the message and media of communication specified by the user.
    async get_result(): Promise<Imsg> {
        //
        return this.result!;
    }
    
    async show_panels(){
        const myalert = this.get_element('alert');
        myalert.onclick = ()=>this.win.alert('Aler!');
    }
    
    
}