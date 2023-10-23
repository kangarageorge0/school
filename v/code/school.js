//Access the page library from the view file in the outlook folder
import { page } from "../../../outlook/v/code/view.js";
//
//To help in the copying of the Katiba in the content section
import { template } from "../../../outlook/v/code/outlook.js";
//
//Access the registration services from the registration class
import registration from "../../../registration/v/code/registration.js";
//This is teh home pof all the methods developed to support the mlima web page
export class school extends page {
    //
    register;
    //
    constructor() {
        super();
        //Create an instance of the registration class in order to access
        //the services it offers
        this.register = new registration();
    }
    //Responsible for toggling back to the constitution
    async copy(source_id, dest_id, file) {
        //
        //Create an instance of the template class, to support carnibalization
        const Template = new template(file);
        //
        //Compile the destination; its the content element in this page
        const dest = [this, dest_id];
        //
        //Wait for template to read the html content
        await Template.open();
        //
        //Transfer them to the destination
        Template.copy(source_id, dest);
        //
        //Close the template window
        Template.close();
    }
    //Show the panels in the home page
    async show_panels() {
    }
    //Whar it does
    //anchor?
    //Strategy=Template.copy
    //copy(src: string, dest: [view, string]): HTMLElement
    async show_messages(anchor) {
        //uses the copy method with id messages im messages html
        // being the soure and anchoring it
        await this.copy('messages', anchor, 'messages.html');
    }
    //method for displaying the events of the group 
    async show_events(anchor) {
        //will use the copy method to copy the content in event.html
        //with the id eventsand anchoring it
        await this.copy('event', anchor, 'event.html');
    }
    async show_objectives(anchor) {
        //will use the copy method to copy the content in event.html
        //with the side and anchoring it
        await this.copy('services', anchor, 'katiba.html');
    }
    async show_result(anchor) {
        //will use the copy method to copy the content in exam.html
        //with the side and anchoring it
        await this.copy('content', anchor, 'exam.html');
    }
    //
    //Method that handles signing in the system
    async sign() {
        //
        //
        //Get the user that has logged in/registered
        const User = await this.register.administer();
        //
        //If the registration was aborted, do not continue with sign procedure
        if (User === undefined)
            return;
        //
        //Welcome the user
        this.welcome(User);
    }
    //
    //Method responsible for welcoming the user
    //Show the welcome and hide the register paragraphs if the user is logged in
    //vice versa if nobody is logged in
    welcome(User) {
        //
        //Employ the logic of welcoming the user to the site
        //Hide the invitation text content and show the welcome
        //message
        document.getElementById('invitation').hidden = true;
        document.getElementById('welcome').hidden = false;
        document.getElementById('username').innerHTML = User.name;
    }
    //
    //Logout the user that is currently logged in
    logout() {
        //
        //Call the logout method
        this.register.logout();
    }
}
