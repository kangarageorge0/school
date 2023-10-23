import { mutall_error } from "./../../../schema/v/code/schema.js";
//Update the display of a form after a button has been clicked on. Ref is the 
//radio button.
export function update_display(ref) {
    //
    //Get the data-field, i.e., the element that envelops the ref element 
    const field = ref.closest("*[data-field]");
    //
    //If the field is not found then this is a badly designed form and stop to 
    //inform the user
    if (!field)
        throw "Envelop not found!";
    //
    //Define the dna for the elder child and its siblings
    const dna = {
        siblings: `input[type="radio"][name="${ref.name}"]`,
        elder: ":checked"
    };
    //
    //Out of all the children separate the unselected children
    const { elder, siblings } = separate_children(field, dna);
    //
    //Show all the children of the parent which contains the selected radio button
    if (elder)
        show(elder, dna.siblings, true);
    //
    //5.For all the children of envelop (with unselected radio buttons) hide all children elements
    siblings.forEach(sibling => show(sibling, dna.siblings, false));
}
//Display or hide details
function show(mother, header, hide) {
    //
    //Formulate the dna
    const dna = { elder: header };
    //
    //Separate elder from siblings
    const { elder, siblings } = separate_children(mother, dna);
    //
    //Show the elder unconditionally
    if (elder)
        elder.hidden = false;
    //
    //Show or hide teh siblings
    siblings.forEach(sibling => sibling.hidden = hide);
}
//Separate the elder schile from the siblings
function separate_children(mother, dna) {
    //Get all the children of the mother
    const children = Array.from(mother.children);
    //
    //Get the elder child, whether defined or not
    const elder = get_elder(mother, children, dna);
    //
    //Get the siblings of the elder. 
    const siblings = get_siblings(mother, children, dna);
    //
    //Return the result
    return { elder, siblings };
}
//Get the elder child
function get_elder(mother, children, dna) {
    //
    //An elder is undefiend if its corresponding css is also undefined
    if (!dna.elder)
        return undefined;
    //
    //Get the complete dna for the elder
    const css = dna.sibling + dna.elder;
    //
    //Get all the organs identified by the elder css
    const organs = Array.from(mother.querySelectorAll(css));
    //
    //Only one elder is expected
    const len = organs.length;
    //
    //It is an error if the complete elder dna did not yield an organ
    if (len === 0)
        throw new mutall_error(`This css '${css}' does not yield an elder`, mother);
    //
    //There cannot be multiple elders
    if (len > 1)
        throw new mutall_error(`This css '${css}' produces '${len}' elders`, organs);
    //
    //Get the only organ that represents the elder
    const organ = organs[0];
    //
    //An elder is a child that contains this organ. it must be one and only one.
    //
    //Get the children that have the organ
    const elders = children.filter(child => child.contains(organ));
    //
    //There must be one.
    if (elders.length == 0)
        throw new mutall_error(`Invalid form. No child qualifies to be an elder defined by css '${css}'`);
    //
    //It can only be one
    if (elders.length > 1)
        throw new mutall_error(`Invalid form. Found ${elders.length} elders for css '${css}'`, elders);
    //
    //Retuurn the on;y elder
    return elders[0];
}
//Get the siblings of an elder
function get_siblings(mother, children, dna) {
    //
    //The form is invalid if both the elder and siblins' dna are missing
    if (!dna.elder && !dna.sibling)
        throw new mutall_error(`Invalid form. Both elder ans sibling dnas missing`);
    //
    //Compile the siblings' css as that of a sibling without the elder
    const css = `${dna.sibling}:not(${dna.elder})`;
    //
    //Get all the organs identified by the css
    const organs = Array.from(mother.querySelectorAll(css));
    //
    //Siblings are children that contain these organs.
    const siblings = children.filter(child => contains(child, organs));
    //
    //Return the siblings
    return siblings;
}
//Tests if a child contains one and only one organ
function contains(child, organs) {
    //
    //Select all organs of the child
    const child_organs = organs.filter(organ => child.contains(organ));
    //
    //Containement is determined by the number of organs
    const count = child_organs.length;
    //
    //There is no containment
    if (count === 0)
        return false;
    //
    //This is valid containment
    if (count === 1)
        return true;
    //
    //The containment is not valid if a child has more than 1 organ
    throw new mutall_error(`Invalid form. A child contains ${count} organs`, child);
}
