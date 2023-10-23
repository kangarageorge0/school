//Access to the sheet js library
import * as xl from 'xlsx';
//The excel class that provides all the excel services
export class workbook {
    //
    constructor(file_name) {
        //
        //Get the named excel workbook
        this.wb = xl.readFile(file_name);
    }
    //
    //Load Excel data to a database. Layots if successful; otherwise an error 
    async load_data(sheet_name, //Optional sheet name; assume first sheet  
    range_name //Optional range; assume used range
    ) {
        //
        //Get the desired range for extracting the data
        const range = this.get_range(sheet_name, range_name);
        //
        //Use the range to extract the layouts
        const layouts = [...this.collect_layouts(range)];
        //
        //Return no layouts 
        return layouts;
    }
    //Returns an excel range (from the given inputs) where the data tio be 
    //uploaded comes from
    get_range(sheet_name, range_name) {
        //
        //If the range is named, return it
        if (range_name)
            return this.get_named_range(range_name);
        //
        //There is no named range, so, consider the named sheet; get its used range
        if (sheet_name) {
            //
            //Get the named worksheet
            const worksheet = this.wb.Sheets[sheet_name];
            //
            //Its an error if the worksheet is not found
            if (!worksheet)
                throw new Error(`Sheet named '${sheet_name}' is not found`);
            //
            //return the sheet's used range
            return this.get_used_range(worksheet, sheet_name);
        }
        //
        //There is no named sheet, so, consider the first one and return its used range
        const index = 0;
        //
        //Get the indexed worksheet
        const worksheet = this.get_sheet_from_index(index);
        //
        //Get the name of the worksheet
        const name = this.wb.SheetNames[index];
        //
        //Return teh used range
        return this.get_used_range(worksheet, name);
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
        //Check if the required names ias mong the defined ones
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
        const sheet = this.get_sheet_from_index(index);
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
        return { range, sheet, name, comments };
    }
    //Given an index, retirn the numbered worksheet
    get_sheet_from_index(index) {
        //
        //Get the sheet names of the current workbook
        const names = this.wb.SheetNames;
        //
        //Renamed the numbered worksheet name
        const name = names[index];
        //
        //Get the namedw worksheet, it may not be defined
        const worksheet = this.wb.Sheets[name];
        //
        //If the worksheet is found return it,
        if (worksheet)
            return worksheet;
        //
        //Otherwise throw an exception
        throw new Error(`Worksheet not found with the specified index, '${index}'`);
    }
    //Gcomments from a defined range as an array of layouts
    get_comments(name) {
        //
        //Get the comment text
        const text = name.Comment;
        //
        //Returm no comments if theer are none
        if (text === undefined)
            return [];
        //
        //Get the cell address of teh named range
        const cell = xl.utils.decode_cell(name.Ref);
        //
        //Return all the layouts of the named range
        return [...this.collect_text_layouts(text, cell)];
    }
    //Yelds layouts from the given text. The cell is not defined for a workbook-level
    //comment. Assume that the layouts were entered as an array of layouts
    *collect_text_layouts(text, cell) {
        //
        //Let obj be some object 
        let obj;
        try {
            obj = JSON.parse(text);
        }
        catch (ex) { }
        //
        //The text is not a valid json object. Ignore it
        if (obj === undefined)
            return;
        //
        //Check that the object is an array of layouts
        //
        //Loop through the array elements
        //
        //Check that each array element is a questionnaire layout
        //
        //Simplify the value expression
        //
        //Yield the layout
    }
    //Return the used range, locally, of the given sheet. The range may be a sheetIt is an error if you 
    //try to get the used range of an empty worksheet.
    get_used_range(sheet_in, name) {
        //
        //Get the desired  sheet from the inputs
        const sheet = typeof sheet_in === 'string' ? this.wb.Sheets[sheet_in] : sheet_in;
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
        //with a whole worksheet)
        return { sheet, range, name };
    }
    //Collect layouts from ranges (if named) and from cell comments within the
    //range 
    *collect_layouts(range) {
        //
        //Assuming a standard labeled range, the data body starts from the 2nd
        //row, which is zero-based
        const body_start = 1;
        //
        //Collect layouts from workbook leovel comments
        yield* this.collect_wb_layouts();
        //
        //Collect layouts from cell comments within the range
        yield* this.collect_cell_layouts(range, body_start);
        //Get the (matrix) layout matching the range table
        yield this.collect_table_layout(range, body_start);
    }
    //
    //Collect workbook-level layouts from comments in the workbook
    *collect_wb_layouts() {
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
    //Collect layouts from the cell comments found in the header row of the 
    //given ragne. The body rows start from 0 to the bosy_start number
    *collect_cell_layouts(local_range, body_start) {
        //From our local range, get the Excel version and destructure it
        const { s, e } = local_range.range;
        //
        //Scan the header secion for cells with a comment. Do not scan the 
        //body rows
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
                const cell = local_range.sheet[addressA1];
                //
                //It looks like we can attach more than one comment in a cell!
                const comments = cell.c;
                //
                //Verify that indeed, comments exist
                if (!comments)
                    continue;
                //
                //Loop through the comments and collect the text layout
                for (let comment of comments)
                    yield* this.collect_text_layouts(comment.t, address);
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
        const cell = range.range.s;
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
                const value = range.sheet[cell_address]?.v ?? null;
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
