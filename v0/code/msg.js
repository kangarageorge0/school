//
//
//Resolves reference to the asset.products data type
import * as outlook from '../../../outlook/v/code/outlook.js';
//
//Use a pop-up to create a new message.
export class msg extends outlook.baby {
    //
    constructor(base) {
        super(base, "new_msg.html");
    }
    //
    //In future, check if a file json file containing Iquestionnaire is selected.
    //For now, do nothing
    async check() {
        //
        //Get the message text.
        const text = this.get_element('msg');
        //
        if (text.value === '') {
            //
            this.win.alert(`Please enter message`);
            //
            return false;
        }
        //
        //Compile the message.
        this.result = { msg: text.value };
        //
        return true;
    }
    //
    //Collect the message and media of communication specified by the user.
    async get_result() {
        //
        return this.result;
    }
    async show_panels() {
        const myalert = this.get_element('alert');
        myalert.onclick = () => this.win.alert('Aler!');
    }
}
