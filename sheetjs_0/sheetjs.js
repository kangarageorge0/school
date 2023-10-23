//Access to mutall errore reporter
import { mutall_error } from "./../../schema/v/code/schema.js";
import { view } from "./../../outlook/v/code/view.js";
import { exec } from "./../../schema/v/code/server.js";
//Access to the sheet js library, in order for typescript to work. W have to 
//comment this line for the code to use the sheetjs, not from node_modules, but
//from import doen in the browser
//import * as xl from 'xlsx';
//The excel class that provides all the excel services
export default class workbook extends view {
    //
    constructor() {
        super();
    }
    //
    //Public access to the private workbook storage
    set wb(w) { this.wb__ = w; }
    ;
    //
    //Throw an expetion if you try to access an unset workbook
    get wb() {
        if (!this.wb__)
            throw new mutall_error('Workbok not set');
        return this.wb__;
    }
    ;
    //Load the selected file and set the excelworkbook
    async load_file() {
        //
        //Wait to the user to select a workbook
        this.wb = await this.get_workbook();
        //
        //Load data from used range of the first sheet of this workbook, i.e., 
        //the sheet and range are not defined
        const layouts = await this.get_layouts(undefined);
        //
        //For this version., ignore the cell in our local layout.
        const layouts2 = layouts.map(L => L.layout);
        //
        //console.log(layouts2);
        //
        //Load the data  to the database
        const result = await exec('questionnaire', ['school'], 'load_common', [layouts2]);
        //
        //Report results
        alert(result);
    }
    //
    //Wait to the user to select a workbook
    async get_workbook() {
        //
        return new Promise(resolve => {
            //
            //Get the files(s) to upload
            const files = this.get_element('source').files;
            //
            //Discontinue if there is no file selected
            if (!files || files.length === 0) {
                alert('Pease select a file');
                return;
            }
            //
            //3. Read the contents of the file
            //
            //3.1 Create a file reader
            const reader = new FileReader();
            //
            //3.2 Listen for the progress event of the file reader
            reader.onload = (evt) => this.create_workbook(evt, resolve);
            //
            //Read the only file (as a binary string)
            reader.readAsBinaryString(files[0]);
        });
    }
    //Create a workbook, given the event listener, and the resolver.
    //When the file reader fires the proogress event...
    create_workbook(evt, resolve) {
        //
        //Get the target, i.e., the file reader
        const target = evt.target;
        //
        //If null, you have a problem
        if (!target)
            throw new mutall_error('You have an event handling problem!');
        //
        //Get the read data (as a binary string)
        const data = target.result;
        //
        //If the data is empty, there must be a problem
        if (!data)
            throw new mutall_error('Null data content is not expected');
        //
        //Use the data to create the workbbook
        const wb = xl.read(data, { type: 'binary' });
        //
        //Return the data (by doing the resolving the promise made earlier)
        resolve(wb);
    }
    ;
    //
    //Get the layouts from the given specifications.
    async get_layouts(source) {
        //
        //If the source range is given use it, otherwise use the default, i.e., 
        //the used range of first sheet in the workbook;
        const range = source ? this.get_range(source) : this.get_default_range();
        //
        //Use the range to extract the layouts
        const layouts = [...this.collect_layouts(range)];
        //
        //Return no layouts 
        return layouts;
    }
    //Returns a local range, give a range source
    get_range(source) {
        //
        //Destructire the source
        const { type, name } = source;
        //
        //Depending on the type....
        switch (type) {
            case 'used_range':
                //
                //Get the named worksheet
                const worksheet = this.wb.Sheets[name];
                //
                //Its an error if the worksheet is not found
                if (!worksheet)
                    throw new Error(`Sheet named '${name}' is not found`);
                //    
                return this.get_used_range(name);
                break;
            case 'named_range': return this.get_named_range(name);
        }
    }
    //The default range is the used range of teh first worksheet in this book
    get_default_range() {
        //
        //Sheet names are 0-based. Get the first one
        const index = 0;
        //
        //Get the name of the worksheet
        const sheet_name = this.wb.SheetNames[index];
        //
        //Return the used range
        return this.get_used_range(sheet_name);
    }
    //Returns a local range from a named one. A global named range is not fit 
    //for data uploads. Report it by throwing an exception
    get_named_range(name) {
        //
        //Get this workbook's properties. That is where names ranges are housed
        const props = this.wb.Workbook;
        //
        //Check if there are any workbook properties
        if (!props)
            throw new Error(`No workbook properties found, so ${name} is not found`);
        //
        //Get defined names in the workbook
        const defined_names = props.Names;
        if (!defined_names)
            throw new Error(`No names are defined, so ${name} cannot be found`);
        //
        //Check if the required names is among the defined ones
        const defined_name = defined_names.find(dfn => dfn.Name === name);
        //
        //Its an error if the named range does not exist
        if (!defined_name)
            throw new Error(`Range named ${name} is not found`);
        //
        //Get the name of the sheet in which this range is found
        const index = defined_name.Sheet;
        //
        //Global named ranges are not allowed
        if (index === undefined)
            throw new Error(`The range named '${name}' is global; its data cannot be uploaded`);
        //
        //Convert teh sheet index to a worksheet
        const sheet_name = this.wb.SheetNames[index];
        //
        //A defined name has a ref, sheet, name and etc. from the ref we can work 
        //out the range
        const range = xl.utils.decode_range(defined_name.Ref);
        //
        //The comment associated with a rage is an important source of metadata.
        //It may or may not be present. If present, it is associate with the first
        //cell of the named range
        const comments = this.get_comments(defined_name);
        //
        //Return the local range
        return { range, sheet_name, name, comments };
    }
    //Return the used range, locally, of the given sheet. The range may be a sheetIt is an error if you 
    //try to get the used range of an empty worksheet.
    get_used_range(sheet_name) {
        //
        //Get the desired  sheet from the inputs
        const sheet = this.wb.Sheets[sheet_name];
        //
        //Get the range in 'A1:C5' notation
        const ref = sheet['!ref'];
        //
        //If there is no used range, in this sheet, then report to teh user
        if (ref === undefined)
            throw new Error('The current sheet is empty');
        //
        //Use the range reference to get the actual range
        const range = xl.utils.decode_range(ref);
        //
        //Return the local range. Note that there are no comments (associated 
        //with a whole worksheet). The name of the range is teh same as that of 
        //the worksheet
        return { sheet_name, range, name: sheet_name };
    }
    //Given an index, return the numbered worksheet
    get_sheet_from_index(index) {
        //
        //Get the sheet names of the current workbook
        const names = this.wb.SheetNames;
        //
        //Renamed the numbered worksheet name
        const name = names[index];
        //
        //Get the named worksheet, it may not be defined
        const worksheet = this.wb.Sheets[name];
        //
        //If the worksheet is found return it,
        if (worksheet)
            return worksheet;
        //
        //Otherwise throw an exception
        throw new Error(`Worksheet not found with the specified index, '${index}'`);
    }
    //Get comments from a defined range as an array of layouts
    get_comments(name) {
        //
        //Get the comment text
        const text = name.Comment;
        //
        //Return no comments if there are none
        if (text === undefined)
            return [];
        //
        //Get the cell address of the named range
        const address = xl.utils.decode_cell(name.Ref);
        //
        //Get our local version of the range from the reference
        const range = this.get_named_range(name.Name);
        //
        //Return all the layouts of the named range
        return [...this.collect_text_layouts(text, range)];
    }
    //Yield layouts from the given text. The cell is not defined for a workbook-level
    //comment. Assume that the layouts were entered as an array of layouts. The
    //input cell is used for reporting purposes.
    *collect_text_layouts(text, range, cell) {
        //
        //Test if the text starts with a square bracket [; If it does not assume
        //this is an ordinary comment and ignore it
        if (!text.startsWith("["))
            return;
        //
        //Let results be a string encoded array of layout labels
        let labels;
        //
        //Decode the result; it might not be json at all
        try {
            labels = JSON.parse(text);
        }
        catch (ex) {
            //
            //If the text is not a valid json, report it
            throw new mutall_error(`Invalid json: ${text}`);
        }
        //
        //Loop over each one to collect a simplified (local) layout. If there 
        //are more than 1 label in a cell, then give give them the same alias
        for (let i = 0; i < labels.length; i++) {
            //
            //Get the label
            const label = labels[i];
            //
            //Simplify the label, if necessary
            yield { cell, layout: this.simplify_label(label, range, cell, i) };
        }
    }
    //Simplify the value expression by replacing complex 
    //workbook-specific expressions with simple ones. For instance, replace,  
    //['.'], with 'test',
    //['.:below'] with ['lookup', 5, 'tname']
    //
    //The general shape of a layout is:-
    //
    //[value, ename, cname, alias?, dbname?]
    //where value is basic value expression or a named function.
    //
    //The named function is structured as:-
    //
    //[name, ...args]
    simplify_label(label, range, cell, i) {
        //
        //
        //Only cases where a defined cell and in a defined range can be simplified
        if (!cell || !range)
            return label;
        //
        //Get the value of the layout;  its the first element of a label
        //If it is not an array, i.e., named function, then its already simple
        if (!Array.isArray(label[0]))
            return label;
        //
        //Use the name of the of function, i.e., the first element of the expression
        //to simplify the layout
        switch (label[0][0]) {
            //
            //. is short for current cell value.
            case '.': return this.simplify_dot_label(cell, label);
            //
            //Replace the below expression with look(tname, colIndex)
            case 'below': return this.simplify_below_label(cell, label, range);
            //
            //This function cannot be simplified; retirn it as it is
            default: return label;
        }
    }
    //Simplify a label to one where the . is replaced by the current cell value
    simplify_dot_label(cell, label) {
        //
        //Destructure the complete label
        const [old_value, ename, cname, alias, dbname] = label;
        //
        //Discard the old value
        //
        //Get the cell adress in the A1 notation 
        const cell_address = xl.utils.encode_cell(cell.address);
        //
        //Get the addressed cell object
        const cellobj = this.wb.Sheets[cell.sheet][cell_address];
        //
        //Get the value of the cell object
        const value = cellobj?.v ?? null;
        //
        //Standardise the date value
        const new_value = value instanceof Date ? view.standardise_date(value) : value;
        //
        //Rebuild to get the new label
        return [new_value, ename, cname, alias, dbname];
    }
    //Simplify the label (with reference to the column below) to one with a 
    //table lookup function. The column index is th difference between the 
    //start of the local range and the column of the cell
    simplify_below_label(cell, label, range) {
        //
        //Destructure the given label to reveal the constituents
        const [old_value, ename, cname, alias, dbname] = label;
        //
        //Discard the old_value
        //
        //Get the column of the cell
        const col_cell = cell.address.c;
        //
        //Get the local range's starting column
        const col_range = range.range.s.c;
        //
        //The desired column is teh difference
        const col_index = col_cell - col_range;
        //
        //Compile the new value
        const new_value = ['\\mutall\\capture\\lookup', range.name, col_index];
        //
        //Rebuild and return the new label
        return [new_value, ename, cname, alias, dbname];
    }
    //Collect layouts from ranges (if named) and from cell comments within the
    //range 
    *collect_layouts(range) {
        //
        //Assuming a standard labeled range, the data body starts from the 2nd
        //row, which is zero-based
        const body_start = 1;
        //
        //Collect layouts from workbook level comments
        yield* this.collect_wb_labels();
        //
        //yield *this.collect_namedrange_labels(range);
        //
        //Collect layouts from cell comments within the range
        yield* this.collect_cell_labels(range, body_start);
        //Get the (matrix) table layout matching the range table
        yield this.collect_table_layout(range, body_start);
    }
    //
    //Collect workbook-level labels from comments in the workbook (file properties)
    *collect_wb_labels() {
        //
        //Get the comment text
        const comment = this.wb.Props?.Comments;
        //
        //Return if there are no comments
        if (!comment)
            return;
        //
        //Yield layouts from the comment text
        yield* this.collect_text_layouts(comment);
    }
    //
    //Collect (layout) labels from the cell comments found in the header row of the 
    //given range. The body rows start from 0 to the body_start number
    *collect_cell_labels(local_range, body_start) {
        //From our local range, get the Excel version and destructure it
        const { s, e } = local_range.range;
        //
        //Scan the header secion for cells with a comment. Do not scan the 
        //body rows. NB. Body has a start row.
        for (let row = s.r; row < s.r + body_start; row++) {
            //
            for (let col = 0; col < e.c; col++) {
                //
                //Define the cell address
                const address = { r: row, c: col };
                //
                //Get the cell at the row/column intersection
                const addressA1 = xl.utils.encode_cell(address);
                //
                //Get the addressed cell
                const cellobj = this.wb.Sheets[local_range.sheet_name][addressA1];
                //
                //It looks like we can attach more than one comment in a cell!
                const comments = cellobj?.c;
                //
                //Verify that indeed, comments exist
                if (!comments)
                    continue;
                //
                //console.log(comments);
                //
                //Define our cell for reporting pusposes
                const cell = { address, sheet: local_range.name };
                //
                //Loop through the comments and collect the text layouts
                for (let comment of comments)
                    yield* this.collect_text_layouts(comment.t, local_range, cell);
            }
        }
    }
    //Convert the givel (local) range to a (questionnaire table) matrix.
    collect_table_layout(range, body_start) {
        //
        const layout = {
            //
            //The PHP table to use for holding teh data from the given range
            class_name: '\\mutall\\capture\\matrix',
            //
            //The arguments of a matrix are...
            args: [
                //
                //The table's name, used in formulating lookup expressions    
                /*tname:*/ range.name,
                //
                //The table's header as an array of colum names (implicitky 
                //indexed by their positions). An empty list means that columns will be
                //idenfied by thier index positions     
                /*cnames:*/ [],
                //    
                //A table's body of data, as a double array of basic values, i.e.,
                //Array<Array<schema.basic_value>>    
                /*body*/ this.get_table_body(range, body_start),
                //
                //Where does the body start? Assume the 2nd row
                /*$body_start*/ body_start
            ]
        };
        //The cell to be associated wih this layout, for reporting purposes, is 
        //the first one in the range
        const cell = { address: range.range.s, sheet: range.sheet_name };
        //
        //Return the cell address
        return { layout, cell };
    }
    //Return the body of a quetionnaire matrix as a double array of basic values
    //The data starts from the given row
    get_table_body(range, body_start) {
        //
        //Define the result we want as an array of rows 
        const data_rows = [];
        //
        //Destructure the excel range 
        const { s, e } = range.range;
        //
        //Loop thru all the cells in teh range, starting from the body row
        for (let row = s.r + body_start; row <= e.r; row++) {
            //
            //Create a new row
            const data_row = [];
            //
            //Loop throough all the cells in the current roe
            for (let col = s.c; col <= e.c; col++) {
                //
                //Get the cell adress in the A1 notation 
                const cell_address = xl.utils.encode_cell({ r: row, c: col });
                //
                //Get the value in the addressed cell
                const value = this.wb.Sheets[range.sheet_name][cell_address]?.v ?? null;
                //
                //Save the cells value to the data row
                data_row.push(value);
            }
            //
            //Save the data row to the parent collection
            data_rows.push(data_row);
        }
        //
        //Return the results
        return data_rows;
    }
}
