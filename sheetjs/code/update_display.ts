/*
a command will be added where when a button is clicked, the other radio buttons (which are the other options)
 should hide their  contents while the clicked one should collaps.
*/
/*
<form>

    <h2><u>Select Data To Load</u></h2>

    <fieldset data-id="source" >
        <legend>
            <h2>Source of data </h2>
        </legend>

        <fieldset>
            <legend>
                <input type="radio" name="type" onclick="update_display(this)" data-id="source">
                Digital Ocean
            </legend>
            <label>Specify Path:
                <input type="text" name="fileInput" >
                <span class="error">
            </ label>
        </fieldse>x

        ...

    </fieldset>
</form>
*/
// ref is the radio button that is clicked on
export function update_display(ref:HTMLInputElement):void{
    //
    //1.Get the data-field, i.e., the element that envelops the ref element 
    const field:HTMLElement | null = ref.closest("*[data-field]");
    //
    //If the envelop is not found then this is a badly designed form and stop to inform the user
    if (!field)  throw "Envelop not found!";
    //
    //2.Get all the children of the envelop
    const children = Array.from(field.children) as Array<HTMLElement>;

    //3.Out of all the children separate the unselected children
    const{selected, unselecteds}=separate_children(children, ref);
    //
    //4.Show all the children of the parent which contains the selected radio button
    show_or_hide(selected, ref.name, 'visible');

    //
    //5.For all the children of envelop (with unselected radio buttons) hide all children elements
    unselecteds.forEach(unselected=>show_or_hide(unselected, ref.name, 'hidden'));
}

// 
// Show all the children of the parent which contains the selected radio button
function show_or_hide(member:HTMLElement, dfname:string, status:'visible'|'hidden'):void{
    //
    //Get all the children of the member. 
    const children = Array.from(member.children)as Array<HTMLElement>;
    // 
    //Get the header child. This is the one that contains a radio input element that matches the given datafield name.
    //N.B. There must be one.
    const header: HTMLElement =children.find(child=>child.querySelector(`input[name ='${dfname}']`))!;
    // 
    //Get all the siblings of the header 
    const siblings = children.filter(child=> child !== header);
    //
    //Show the header unconditionally using the css approch; its better than hiding explicitly
    header.classList.add("visible");
    //
    //Hide or show the siblings depending on the status
    siblings.forEach(sibling => sibling.classList.add(status));

}

//
//Out of all the envelope children separate the unselected children
function separate_children(
    // 
    // These are the children of the envelope
    children:Array<HTMLElement>,
    // 
    // This is the ref element that was clicked on
    ref:HTMLInputElement
):{
    // 
    // This is the child of the envelope  that contains the ref element
    selected:HTMLElement,
    // 
    // These ere children of the envelope that contain the radio buttons named the same as the ref 
    unselecteds:Array<HTMLElement>
}{
    // 
    //Select only those children, i.e., members that are relevant for generating the output.
    //Members are children that have a radio button named the same as the ref
    const members:Array<HTMLElement> = children.filter(child => is_member(child,ref));
    //
    //Filter the members to get the selected. The latter contains the ref element.
    //There must be a selected one hence the exclamation mark
    const selected:HTMLElement = members.find(member => member.contains(ref))!;
    //
    //Separate the unselected members, i.e., those that were not selected
    const unselecteds:Array<HTMLElement> = members.filter(m => m !== selected);
    // 
    // Return the results, i.e., the combination of the selected and unselected members
    return{selected,unselecteds};
}
//
//Select only those children, i.e., members that are relevant for generating the output.
//Members are children that have a radio button named the same as the ref
function is_member(child:HTMLElement,ref:HTMLInputElement):boolean{
    //
    //Get the name of the data field
    const dfname:string = ref.name;
    //
    //Look for an element within the child that has the same name
    const radios:Array<HTMLElement> = Array.from(child.querySelectorAll(`input[type = "radio"][name ="${dfname}"]`));
    //
    const count:number = radios.length;
    //
    //Its a badly designed form if there is more than one element
    if(count > 1) throw `You have ${count} radio buttons in data field ${dfname} `
    //
    //If there is a radio button then this is a member of the data field
    return count === 1;
}

//
//Fetch the sheet js form and append it to the application html
export async function  append_form():Promise<void>{
    //
    //Locate the body element of the application document
    const body:HTMLElement  = document.body;
    //
    //Fetch the html fragment 
    const response: Response = await fetch("./sheetjs.html");
    //
    //Check on the succes of the client-server communication and add the html fragment to the body if the 
    // client server operation was successful
    if(response.ok) body.innerHTML = await response.text();
}