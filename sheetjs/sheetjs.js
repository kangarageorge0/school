//Access to mutall errore reporter
import { mutall_error } from "./../../schema/v/code/schema.js";
import { view } from "./../../outlook/v/code/view.js";
import { exec } from "./../../schema/v/code/server.js";
//Access to the sheet js library, in order for typescript to work. W have to 
//comment this line for the code to use the sheetjs, not from node_modules, but
//from import doen in the browser
//import * as xl from 'xlsx';
//The sheetjs class supports loading of Excel files to a database
export default class sheetjs extends view {
    //
    constructor() {
        super();
    }
    //
    //Use a dialog box to load user-selected Xl file(s) to the database
    async load_files() {
        //
        //Get the anchor tag (so that we can clean it later)
        const anchor = this.get_element('anchor');
        //
        //Create a dialogbox by fetching from a html
        const dlg = await this.create_dialog(anchor);
        //
        //Wait for the user to save or abort the process
        const result = await new Promise(resolve => {
            //
            this.get_element('save').onclick = () => this.collect_and_save_files(resolve);
            this.get_element('cancel').onclick = () => resolve(undefined);
        });
        //
        //...and remove the dialog from the anchor
        anchor.removeChild(dlg);
        //
        //Return the result
        return result;
    }
    //Test loadiing of a specific range from of an Excek worksheet. Assume the file
    //is in the server
    async test(workbook, sheet_name, range_name) {
        //
        //Convert the inputs to a request
        const request = await this.get_request_from_server(workbook, sheet_name, range_name);
        //
        //Execute the request
        //
        //Collect the layouts
        const layouts = [...this.collect_layouts(request)];
        //
        //Load the data  to the database
        const result = await exec('questionnaire', ['school'], 'load_common', [layouts]);
        //
        return result === 'Ok' ? 'ok' : new Error(result);
    }
    //Create and show a dialogbox attaches to the given element
    async create_dialog(anchor) {
        //
        //Get the sheetjs html fragment
        const response = await fetch('./sheetjs.html');
        //
        //Test that the response was ok
        if (!response.ok)
            throw new mutall_error(`Network error: ${response.statusText}`);
        //
        //Get the text string
        const text = await response.text();
        //
        //Add the text as html to the anchor
        anchor.innerHTML = text;
        //
        //Get and return the dialog element
        return this.get_element('dialog');
    }
    //Given a promise to resolve, collect and save XL data to a database. Resolve
    //the promise when the saving is successful; otherwise report the resulting 
    //error
    async collect_and_save_files(resolve) {
        //
        //Get the dirty data to load (i.e., which file,sheet or range) from 
        //the user. The dirty will be undefines if the user cancels the job
        const raw = this.get_user_inputs();
        //
        //Collect the errors
        const errors = [...this.collect_errors(raw)];
        //
        //If any, report them and do not continue.
        if (errors.length > 0) {
            errors.forEach(e => this.report_error(e.id, e.msg));
            return;
        }
        //
        //If the workbooks has no errors, then it is clean
        const clean = raw;
        //
        //Save the cleaned data to the dataase and return the result
        const result = await this.save_files(clean);
        //
        //Report results on the input form (if any); orjerwise resolve the clean 
        //data as the promise.
        if (result === 'Ok')
            resolve(clean);
        else
            this.report_error('report', result);
    }
    //Save the requested data to a database. This method can be called directly 
    //to test the loading with much tighter specification
    async save_files(data) {
        //
        //Interpret the clean user response (from a local client machine)  to a 
        //formal request. This process is designed to ensure that collection of 
        //layouts (that follows) will not need to be asynchronous. (I found it 
        //difficult to implement a method that is both a generator and asynchronous)
        const request = await this.get_request_from_client(data);
        //
        //Collect the layouts
        const layouts = [...this.collect_layouts(request)];
        //
        //Load the data  to the database
        const result = await exec('questionnaire', ['school'], 'load_common', [layouts]);
        //
        return result;
    }
    //Collect error messages (and their sources) from the dirty XL data. The data
    //is a union base on whethe this is a single or multiple file operations.
    //Collect erors from all the unions 
    *collect_errors(data) {
        //
        switch (data.type) {
            case "multiple":
                //
                //Destructure the data
                const { files } = data;
                //
                //Collect error from the workbooks
                if (files instanceof Error)
                    yield { id: 'workbooks', msg: files.message };
                break;
            case "single":
                //
                //Destructure the data.
                const { file, sheet_name, range_name } = data;
                //
                //Collect errors from the single workbbok components
                if (file instanceof Error)
                    yield { id: 'workbook', msg: file.message };
                if (sheet_name instanceof Error)
                    yield { id: 'sheet_name', msg: sheet_name.message };
                if (range_name instanceof Error)
                    yield { id: 'range_name', msg: range_name.message };
                //
                break;
        }
    }
    //Get user inputs. It is either multiple or single file selection
    /*
    <fieldset data-io="radio" id="type">
        <legend>Choose Type of Loading</legend>

        <label>
            Multiple Files<input
                type='radio'
                name='type'
                value="multiple"
                onchange = "this.show_hide_panels(['single'], ['multiple'])"
            />
        </label>
        <input type="files", multiple, id="single">

        <label>
            Single File<input type='radio' name='type' value="single" checked/>
        </label>
        <fieldset id='single'>
            <label>
                Select Workbook<input type="files"/>
            </label>
            <labe>
                Select Worksheet<select>...</select>
            </label>
            <label>
                Select range<select>...</select>
            </label<>
        </fieldset>

    </fieldset>
    */
    get_user_inputs() {
        //
        //Iexcel is a union of 2 parts: multile and single file specifications
        //depending on the type of loading. The type can only be 'single' or 
        //'multiple'; There is no any other possibility -- unless our design 
        //is flawed 
        const type = this.get_value('type');
        //'
        if (type === 'single') {
            //
            //Get the selected file 
            const input = this.document.getElementById('single').files;
            //
            //Return the only selected file, if any; otherwise an error
            const file = input === null ? new Error('Select file') : input[0];
            //
            //Get the sheet name, converting null to undefined
            const sheet_name = this.get_value('sheet_name') ?? undefined;
            //
            //Get the named range, converting null to undefined
            const range_name = this.get_value('range_name') ?? undefined;
            // 
            return { type: 'single', file, sheet_name, range_name };
        }
        else {
            //
            //Get the selected file 
            const input = this.document.getElementById('multiple').files;
            //
            //Return the only selected file, if any; otherwise an error
            const files = input === null ? new Error('Select file') : input;
            //
            return { type: 'multiple', files };
        }
    }
    //Interpret the  excel inputs (from a local/client machine) to a formal resquest. 
    //Convert the union of single and multiple file data to a one of a possible 
    //set of requests 
    async get_request_from_client(data) {
        //
        //Dependig on whether we are loading single or multiple workbooks...
        switch (data.type) {
            //
            case 'multiple':
                //
                //Destructure the Ixcel data, ignoring the type
                const { files } = data;
                //
                //Initialize an empty result
                const result = [];
                //
                //Convert the files to workbooks. The forEach/map construct will 
                ///not do because of the await
                for (let file of Array.from(files))
                    result.push(await this.create_workbook(file));
                //
                //Return the workbook request
                return { type: 'workbooks', workbooks: result };
            case 'single':
                //
                //Destructure the Ixcel data, ignoring the type
                const { file, sheet_name, range_name } = data;
                //
                //Handle the  case of only one file. Check for further specifications
                const workbook = await this.create_workbook(file);
                //
                //The case of a single workbook. 
                //Handle the special case of one named range
                if (range_name)
                    return { type: 'named_range', workbook, range_name };
                //
                //If a worksheet is defined, yield layouts from all her both used and named ranges
                if (sheet_name)
                    return { type: 'worksheet', workbook, sheet_name };
                //
                //Return layouts of all the ranges (named or used) of all the sheets in 
                //the workbook
                return { type: 'workbook', workbook };
        }
    }
    //Interpret the  excel inputs (from a remote/server machine) to a formal resquest. 
    //Convert the given data source to a one of a possible set of requests. The
    //main reasin for this conversion is so that collecting layouts (which follows
    //this step) should be asynchronous 
    async get_request_from_server(file_name, sheet_name, range_name) {
        //
        //Convert file to a workbook
        const workbook = await this.get_workbook(file_name);
        //
        //If the range is defined, then the worksheet must be defined
        if (range_name) {
            //
            if (!sheet_name)
                throw new mutall_error('The sheet name must accompany the range name');
            //
            return { type: 'named_range', workbook, range_name };
        }
        //
        //Return a worksheet if it is valid
        if (sheet_name)
            return { type: 'worksheet', workbook, sheet_name };
        //
        //Return the workbook as the request
        return { type: 'workbook', workbook };
    }
    //Get a workbook from a named file. Use the fetch method to get the native 
    //workbook using the sheet js library.
    async get_workbook(file_name) {
        //
        //Fetch the filename to get a response
        const response = await fetch(file_name);
        //
        //use the response to obtain an array buffer of binary data
        const buffer = await response.arrayBuffer();
        //
        //Use the array buffer to read it into a workbook
        const native = xl.read(buffer, { type: 'array' });
        //
        //Construct and retirn the workbook
        return new workbook(native);
    }
    //
    //Wait to the user to select a workbook
    async create_workbook(file) {
        //
        return new Promise(resolve => {
            //
            //Create a file reader
            const reader = new FileReader();
            //
            //Listen for the progress event of the file readeer
            reader.onload = (evt) => this.load_workbook(evt, resolve);
            //
            //Read the only file (as a binary string)
            reader.readAsBinaryString(file);
        });
    }
    //Create a workbook, given the event listener, and the resolver.
    //When the file reader fires the proogress event...
    load_workbook(evt, resolve) {
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
        //Use teh data to create the workbbook
        const wb = xl.read(data, { type: 'binary' });
        //
        //Return the data (by doing the resolving the promise made earlier)
        resolve(new workbook(wb));
    }
    ;
    //Collect layouts from the given request. This method uses the collect_layouts
    //,ethod for specific objects.
    *collect_layouts(request) {
        //
        //Undefined requests do not yield layouts
        if (request === undefined)
            return;
        //
        //Collect complete (as opposed to partial) layouts depending on the 
        //request type
        switch (request.type) {
            case 'named_range':
                //
                //Collect layouts from a named range
                yield* new named_range(request.workbook, request.range_name).collect_layouts('complete');
                break;
            case "worksheet":
                //
                //Only valid worksheets should be considered
                const ws = request.workbook.create_worksheet(request.sheet_name);
                //    
                if (ws)
                    yield* ws.collect_layouts('complete');
                break;
            case "workbook":
                //
                //Collect layouts from a workbook
                yield* request.workbook.collect_layouts('complete');
                break;
            case "workbooks":
                //
                //Collect layouts from all the workbooks
                for (let wb of request.workbooks)
                    yield* wb.collect_layouts('complete');
        }
    }
}
//This class is tha base of all Excel objects that can hold comments
class comment extends view {
    //
    constructor(native_workbook) {
        super();
        this.native_workbook = native_workbook;
    }
    //Yelds layouts from the given text. The parameters after gtext are used for
    //formulating the correct alias. E.g., ['expenses','kitchen', 'cabbages', 1]
    // or ['expenses','kitchen', 'cabbages'], ['expenses','kitchen'], ['expenses']
    *collect_layouts_from_text(text, workbook, worksheet, range, address) {
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
            yield this.simplify_label(label, i, address, range);
        }
    }
    //Simplify the value expression by replacing complex 
    //workbook-specific expressions with simple ones. For instance, replace,  
    //['$'], with 'test',
    //['$:below'] with ['lookup', 5, 'tname']
    //
    //The general shape of a layout is:-
    //
    //[value, ename, cname, alias?, dbname?]
    //where value is basic value expression or a named function.
    //
    //The named function is structured as:-
    //
    //[name, ...args]
    simplify_label(label, i, cell, range) {
        //
        //
        //Only cases where a defined cell and in a defined range can be simplified
        if (!cell || !range)
            return label;
        //
        //Get the value of the layout;  its the first element of a label
        //If it is no an array, i.e., named function, then its already simple
        if (!Array.isArray(label[0]))
            return label;
        //
        //Use the name of the of function, i.e., the first element of the expression
        //to simplify the layout
        switch (label[0][0]) {
            //
            //. is short for current cell value.
            case '$': return this.simplify_dot_label(cell, label, range);
            //
            //Replace the below expression with look(tname, colIndex)
            case 'below': return this.simplify_below_label(cell, label, range);
            //
            //This function cannot be simplified; retirn it as it is
            default: return label;
        }
    }
    //Simplify a label to one where the . is replaced by the current cell value
    simplify_dot_label(cell, label, range) {
        //
        //Destructure the complete label
        const [old_value, ename, cname, alias, dbname] = label;
        //
        //Discard the old value
        //
        //Get the cell adress in the A1 notation 
        const cell_address = xl.utils.encode_cell(cell);
        //
        //Get the addressed cell object
        const cellobj = this.native_workbook.Sheets[range.sheet_name][cell_address];
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
        const col_cell = cell.c;
        //
        //Get the local range's starting column
        const col_range = range.native.s.c;
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
}
//A local view of an excel workbook
export class workbook extends comment {
    //
    constructor(native) {
        super(native);
        //
        //Worksheets that are defined in in this workbook
        this.worksheets = new Map();
    }
    //
    //Collect workbook-level labels from comments in the workbook (file properties)
    *collect_layouts_from_properties() {
        //
        //Get the comment text
        const comment = this.native_workbook.Props?.Comments;
        //
        //Return if there are no comments
        if (!comment)
            return;
        //
        //Yield layouts from the comment text
        yield* this.collect_layouts_from_text(comment, this);
    }
    //Collect layouts from all the ranges of all the sheets in this workbook
    *collect_layouts(type) {
        //
        //Collect comments from the properties of this workbook
        //NB. This is why the worksheet layouts should be partial. They should not
        //include those of the workbook -- otherwise there will be duplicates
        yield* this.collect_layouts_from_properties();
        //
        //Get all the worksheets of this workbook, whether they are valid for 
        //uploading or not
        const all_worksheets = this.native_workbook.SheetNames.map(sheet_name => this.create_worksheet(sheet_name));
        //
        //Only the defined ines are considered
        const worksheets = all_worksheets.filter(ws => ws instanceof worksheet);
        //
        //Collect layouts of each worksheet, partially, i.e., not as a complete
        //loadable units,  but as a part of a workbook loading set 
        for (let worksheet of worksheets)
            yield* worksheet.collect_layouts('partial');
    }
    //Create the named worksheet if necessary, i.e., if it is not in the
    //map
    create_worksheet(sheet_name) {
        //
        //Check if the worksheet exist; if it does, return it
        if (this.worksheets.has(sheet_name))
            return this.worksheets.get(sheet_name);
        //
        //The sheet does not exist. Create it from first principles 
        //
        //Get the named sheet from this workbook
        const sheet = this.native_workbook.Sheets[sheet_name];
        //
        //Get its used the range in 'A1:C5' notation
        const ref = sheet['!ref'];
        //
        //If there is no used range, then retirn this sheet as undefined
        const ws = ref === undefined
            ? undefined
            : new worksheet(sheet_name, this, xl.utils.decode_range(ref));
        //
        //Save the worksheet (for looking up later)
        this.worksheets.set(sheet_name, ws);
        //
        //return the worksheet
        return ws;
    }
}
class range extends comment {
    //
    constructor(
    //
    workbook, 
    //
    //The height of the header
    body_start = 0) {
        super(workbook.native_workbook);
        this.workbook = workbook;
        this.body_start = body_start;
        //
    }
    //Collect the header labels and the body matrix of this range, depending on 
    //type. If 'complete' then includes layouts specified at the workbook level. 
    //There are no specific layouts associated with a worksheet
    *collect_layouts(type) {
        //
        //If required, return layouts deduced from workbook properties
        if (type === 'complete')
            yield* this.worksheet.workbook.collect_layouts_from_properties();
        //
        //Collect the lael layouts
        yield* this.collect_layouts_from_header();
        //
        //Collect the table matrix
        yield this.get_matrix();
    }
    //Collect cell-based labels found in the header section of a range
    *collect_layouts_from_header() {
        //
        //Get the (native) excel range of this local version and descrtcurre it
        const { s, e } = this.native;
        //
        //Scan the header secion for cells with a comment. Do not scan the 
        //body rows. NB. Body has a start row.
        for (let row = s.r; row < s.r + this.body_start; row++)
            for (let col = 0; col < e.c; col++)
                yield* this.collect_layouts_from_cell(row, col);
    }
    //Collect layouts from cell comments
    *collect_layouts_from_cell(row, col) {
        //
        //Define the cell address
        const address = { r: row, c: col };
        //
        //Get the cell at the row/column intersection
        const addressA1 = xl.utils.encode_cell(address);
        //
        //Get the addressed cell
        const cellobj = this.native_workbook.Sheets[this.worksheet.sheet_name][addressA1];
        //
        //It looks like we can attach more than one comment in a cell!
        const comments = cellobj?.c;
        //
        //Verify that indeed, comments exist
        if (!comments)
            return;
        //
        //Loop through the comments and collect the text layouts
        for (let comment of comments)
            yield* this.collect_layouts_from_text(comment.t, this.worksheet.workbook, this.worksheet, this, address);
    }
    //Rwturns the matrix of a range
    get_matrix() {
        //
        return {
            //
            //The PHP table to use for holding the data from the given range
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
                /*body*/ this.get_table_body(),
                //
                //Where does the body start? Assume the 2nd row
                /*$body_start*/ this.body_start
            ]
        };
    }
    //Return the body of a quetionnaire matrix as a double array of basic values
    //The data starts from the given row
    get_table_body() {
        //
        //Define the result we want as an array of rows 
        const data_rows = [];
        //
        //Destructure the excel range 
        const { s, e } = this.native;
        //
        //Loop thru all the cells in teh range, starting from the body row
        for (let row = s.r + this.body_start; row <= e.r; row++) {
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
                const value = this.native_workbook.Sheets[this.worksheet.sheet_name][cell_address]?.v ?? null;
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
//A named range of a worksheet has special comments.
class named_range extends range {
    //
    constructor(workbook, name) {
        super(workbook);
        this.name = name;
    }
    //Get the worksheet associate with a named range
    get worksheet() {
        //
        const ws = this.workbook.create_worksheet(this.sheet_name);
        //
        //A named range must have a worksheet asociated witj it
        if (!ws)
            throw new mutall_error(`The range named ${this.name} in sheet ${this.sheet_name} has no worksheet`);
        //
        return ws;
    }
    //
    //Get teh defined name of the named range
    get defined_name() {
        //
        //Get this workbook's properties. That is where names ranges are housed
        const props = this.native_workbook.Workbook;
        //
        //Check if there are any workbook properties
        if (!props)
            throw new Error(`No workbook properties found, so ${this.name} is not found`);
        //
        //Get defined names in the workbook
        const defined_names = props.Names;
        if (!defined_names)
            throw new Error(`No names are defined, so ${this.name} cannot be found`);
        //
        //Check if the required names ias mong the defined ones
        const defined_name = defined_names.find(dfn => dfn.Name === this.name);
        //
        //Its an error if the named range does not exist
        if (!defined_name)
            throw new Error(`Range named ${this.name} is not found`);
        //
        return defined_name;
    }
    //Returns the sheet name associated with this range
    get sheet_name() {
        //
        //
        //Get the sheet index of this range's define name
        const index = this.defined_name.Sheet;
        //
        //If the index is not defined, then this is a globally scoped range
        //and should not be considerd for uploading
        if (!index)
            throw new mutall_error(`Worksheet number ${index} should is global and therefore not fit for uploading`);
        //
        //Get the sheet name at the requested index
        const sheet_name = this.native_workbook.SheetNames[index];
        //
        return sheet_name;
    }
    //Returns the native range of this named one
    get native() {
        //
        //A defined name has a ref, sheet, name and etc. from the ref we can work 
        //out the range
        return xl.utils.decode_range(this.defined_name.Ref);
    }
    //Collect the layouts of this range, depending on the type. If 'complete' then
    //includes layouts specified at the workbook level. There are no specific 
    //layouts associated with a worksheet
    *collect_layouts(type) {
        //
        //Collect labels from the "crown" section of a named range
        //
        //Get the comment text
        const text = this.defined_name.Comment;
        //
        //If there is a comment, collect the text labels. This text is not associated 
        //with any cell. But it it is associated with this range
        if (text)
            yield* this.collect_layouts_from_text(text, this.worksheet.workbook, this.worksheet, this);
        //
        //Collect labels from header section and matrix from the body section
        yield* super.collect_layouts(type);
    }
}
//A used range has no special comments 
export class used_range extends range {
    //
    constructor(worksheet) {
        //
        //The name of a used range is the same as that of the sheet in which it 
        //is found
        super(worksheet.workbook);
        this.worksheet = worksheet;
    }
    //Returns the native range
    get native() { return this.worksheet.used_range; }
    ;
    //The name of a used range is the same as that of the worksheet
    get name() { return this.worksheet.sheet_name; }
    //Returns the native worksheet of this range; it is derived from the worksheet
    //used to construct the range
    get native_worksheet() {
        //
        //Get the sheet name
        const sheet_name = this.worksheet.sheet_name;
        //
        return this.native_workbook.Sheets[sheet_name];
    }
    //The sheet_name of a used range is that of theh worksheet
    get sheet_name() {
        return this.worksheet.sheet_name;
    }
}
//Our local version of a worksheet. It has capability to process comments?
export class worksheet extends comment {
    //
    //A valid worksheet must hav a used range
    constructor(sheet_name, workbook, used_range) {
        //
        super(workbook.native_workbook);
        this.sheet_name = sheet_name;
        this.workbook = workbook;
        this.used_range = used_range;
    }
    //Collect layouts from all the (named or used) ranges in this worksheet
    *collect_layouts(type) {
        //
        //Include teh workbook labels if teh type is complete
        if (type === 'complete')
            yield* this.workbook.collect_layouts_from_properties();
        //
        //Collect all the named ranges in this worksheet.
        const nameds = this.collect_named_ranges();
        //
        //If there aren't  any, collect the (only) user range
        const ranges = nameds.length === 0 ? [this.get_used_range()] : nameds;
        //
        //Use the ranges to collect tha layouts
        for (let range of ranges)
            yield* range.collect_layouts('partial');
    }
    //Return the used range (of this worksheet) if it is defined. The '!ref'
    //property of an xl.Worksheet refers to the used range.
    get_used_range() {
        //
        //Return the used range. 
        return new used_range(this);
    }
    //Collect all the named ranges in this worksheet. Use the fact that the
    //Sheet property of a defined name returns teh sheet name
    collect_named_ranges() {
        //
        //Get all the defined names in the current workbook
        const all_names = this.native_workbook.Workbook?.Names;
        //
        //Return empty list if there are no defoned names
        if (!all_names)
            return [];
        //
        //Select those defined names that match with this sheet
        const dfnames = all_names.filter(dfname => this.is_matched(dfname));
        //
        //Map those names to named ranges and return them
        return dfnames.map(name => new named_range(this.workbook, name.Name));
    }
    //Returns true if the given defined name can be matched to this worksheet 
    is_matched(dfname) {
        //
        //Get the sheet's index from the defined name
        const index = dfname.Sheet;
        //
        //If the index is missing, then this a global name. It is
        //not useful for our purpose. Discard it
        if (!index)
            return false;
        //
        //Get the sheet name at this index
        const sheet_name = this.native_workbook.SheetNames[index];
        //
        //Return true if the names match
        return sheet_name === this.sheet_name;
    }
}
