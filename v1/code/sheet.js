//Resolves reference to the asset.products data type
import { view, page } from '../../../outlook/v/code/view.js';
import * as io from "../../../schema/v/code/io.js";
//Import server.
import * as server from "../../../schema/v/code/server.js";
//Resolve references to a database
import * as schema from "../../../schema/v/code/schema.js";
//The sheet is the overall container for all the areas of a worksheet. It is linked
//to Mutalldata (library) through the page class
export class sheet extends page {
    //
    //The query that drives this sheet
    query;
    //
    //The crown area
    crown;
    //
    //The matrix area comprising of the header and the body
    matrix;
    //
    //The constructor arguments are desined to allow a user to alter the shape
    //of a worksheet, thus creating the most intuitive view from a user's 
    //perspective
    constructor(
    //
    //The query that drive this sheet. Note the query argument is captitalised
    //to avoid confusion with the query class, which we need to access
    //the static properties page.
    Query) {
        //
        //Initializing the parent view 
        super();
        //
        //Set the sheet query
        this.query = Query;
        //
        //Initialize the crown
        this.crown = new crown(this);
        //
        //Initialiaize the matrix
        this.matrix = new matrix(this);
    }
    //Complete the construction of the sheet by setting all (optional) 
    //properties that may require visits to the server. 
    async initialize() {
        //
        //Complete the construction of a query
        await this.query.initialize();
    }
    //Show all the sections of a sheet: the crow, the header, the body and the 
    //tail teh first time round
    async show() {
        //
        //Show the crown section; you will need to fetch teh paginatiion data from
        //the database; hence asynchronous
        await this.crown.show();
        //
        //Show the matrix sections with data from database; hence asynchronous
        await this.matrix.show();
    }
    //
    //The ondragstart listener for a factor with the given index and region
    static start_dragging_factors(ev, region, index) {
        //
        //Set the region type (as the key) to the drag event
        ev.dataTransfer.setData('region', region);
        //
        //Set the factors index to the drag event
        ev.dataTransfer.setData('index', String(index));
    }
    //
    //Get factor levels to be associated with this panel  
    async get_factor_levels(region, ctes, cte) {
        //
        //Get the factors of this region
        const factors = this.query.factors[region];
        //
        //There must BE factors defined for the region, even if it is an empty list
        if (factors === undefined)
            throw new schema.mutall_error(`Region ${region} has no entry in teh levels map`);
        //
        //Start with an empty obhect of levels
        const levels = {};
        //
        //For each factor, get its levels and assign it to the matching property
        for (const factor of factors)
            levels[factor] = await this.get_levels(factor, ctes, cte);
        //
        //Return the levels
        return levels;
    }
    //Retrieves the levels of the given factor
    async get_levels(factor, ctes, cte) {
        //
        //Measurements are  specially treated
        if (factor === 'measurement') {
            const mlevels = Array.from(this.query.shape.measurements.keys());
            return mlevels;
        }
        //For any other factor, use the base query to obtan the levels
        //
        //Compile the sql for retrieving the levels of the named factor
        //The query is base on the same table that we use for calculating
        //score percentages
        const sql = `
            ${ctes}
            select distinct
                ${factor} as fname
            from ${cte};
            `;
        //
        //Execute the sql to levels of the named factor
        const data = await server.exec('database', 
        //
        //Create the (incomplete, i.e., false parameter) database, execute the 
        //sql to return the data
        [this.query.dbname, false], 'get_sql_data', [sql]);
        //
        //The data will of the form:-
        //[{fname:2019}, {fname:2020}, {fname:2021} BUT whet we want is
        //[2019, 2020, 2121]
        //Convert the array of fname objects to an array of basic values
        return data.map(({ fname }) => fname);
    }
}
//Factors are defining to driving a sheet. They are associated with very
//areas of a sheet. Collectivey, those are called panels. This class was 
//designed to house methods that are shared between panels
class panel extends view {
    parent;
    //
    //A panel must be a chiled of either another panel, or the main sheet. 
    constructor(parent) {
        super();
        this.parent = parent;
    }
    //
    //Get the sheet associated with this panel
    get sheet() {
        //
        //If the parent is a sheet, then return it as required
        if (this.parent instanceof sheet)
            return this.parent;
        //
        //The parent is not a shee, then try its sheet. This effectively 
        //call re-calls this method with this.parent as the panel instance 
        return this.parent.sheet;
    }
    //
    //The query and factors of a panel indirectly from the sheet.
    get query() { return this.sheet.query; }
    get factors() { return this.query.factors; }
}
//The Crown class as teh container for draggable elements in the crown section
class crown extends panel {
    //
    //The paginator section
    paginator;
    //
    //The legend elemen where the filters are attached
    filters_element;
    //
    //The collection of filter select elements, ordered in the same way as 
    //the query crown factors 
    filters;
    //
    //Restore button is used for restoring a matrix to its last version, 
    //typically following a filter selection that produces no result 
    restore_button;
    //
    //The levels associated with filters in the crowwn section
    levels;
    //
    constructor(sheet) {
        //
        super(sheet);
        //
        //Set the paginator
        this.paginator = new paginator(this);
        //
        //Set the legend for filters
        this.filters_element = this.get_element('filters');
        //
        //Add a listener to the 'save sheet sql ' button
        this.get_element('save_sql').onclick = () => this.save_sheet_sql();
        ;
        //
        //Creating a button for restoring
        this.restore_button = this.create_element('button', this.element, {
            textContent: "Restore Last Page with Data",
            hidden: true
        });
        //
        //Add the restore lister to the button
        this.restore_button.onclick = () => this.restore();
    }
    //The element of a crown is named as such in the current sheet
    get element() {
        return this.get_element('crown');
    }
    //The general ctes to use for compiling factor levels for this panel
    get ctes() { return this.query.base_ctes; }
    //
    //The specific cte to use for compiling the factor levels asociated with
    //a crown. This every spefic to exam results!!!!
    get cte() { return 'percent'; }
    //Save the current sheet sql to the clipboard, so that we can access it for
    //debugging purposes
    save_sheet_sql() {
        //
        //Put the sheet sql into the clipboad
        //
        //Test if the clipboad service is available; report if not
        if (!navigator.clipboard)
            throw new schema.mutall_error('Clipboard service not available');
        //
        //Copy the sql to the cli[board and tell us if succesful or not
        navigator.clipboard.writeText(this.query.all_ctes)
            .then(() => alert("Sql statement copied to clipboard"))
            .catch(err => { throw new schema.mutall_error("Failed to copy text: ", err); });
    }
    //Restore the matrix last valid selectIndex of of the paginator in the crown
    //Section
    restore() {
        //
        //Get the paginator (from the crown) and set its index to the last index.
        //The index must be known; otherwise do nothing
        if (this.paginator.last_index === undefined)
            return;
        ;
        this.paginator.selector.selectedIndex = this.paginator.last_index;
        //
        //Refresh the crown
        this.sheet.crown.show();
        //
        //Show the matrox
        this.sheet.matrix.show();
        //
        //Hide the restore button once the page is restored. The button is in the 
        //crown section
        this.restore_button.hidden = true;
    }
    //Paint the crown section
    async show() {
        //
        //Clear the crown
        //
        //Clear the paginator select options
        this.paginator.selector.innerHTML = '';
        //
        //Remove the filters
        this.filters_element.innerHTML = '';
        //
        //Create the filters in the crown
        this.filters = this.factors.crown.map((factor, index) => new filter(this, factor, index, this.filters_element));
        //
        //Show the paginator
        await this.paginator.show();
        //
        //Show the filters
        await this.show_filters();
        //
        //Show the mode that allows editting
        this.show_edit_mode();
    }
    //Show all the filters in the crown
    async show_filters() {
        //
        //Get/Set the crown region factor levels ffrom the crosstab query
        this.levels = await this.sheet.get_factor_levels('crown', this.query.measurements_ctes, 'measurements');
        //
        //Ensure tyhat teh filters are set
        if (this.filters === undefined)
            throw new schema.mutall_error('Filters are not set');
        //
        //Get and show every filter in the crown region
        this.factors.crown.forEach((factor, index) => this.filters[index].show());
    }
    //Addi event listeners to the radio buttons for controlling mode.
    show_edit_mode() {
        //
        //Get the style sheet element which controls the editing
        const style_sheet = this.get_element('mode');
        //
        //Create a mode object
        const Mode = new mode(style_sheet);
        //
        //Get the edit mode button
        const edit = this.get_element('edit');
        //
        //Add a lstener to show the matrix body in edit mode
        edit.onclick = () => Mode.execute('edit');
        //
        //Get the normal mode button
        const normal = this.get_element('normal');
        //
        //Add a listener to show the matrix body in normal mode
        normal.onclick = () => Mode.execute('normal');
    }
}
//Modelling the matrix region, that is the container for the header, body and 
//footer regions 
class matrix extends panel {
    //
    //Header and body regions of a matrix
    header;
    body;
    constructor(sheet) {
        super(sheet);
        //
        //Create the header section
        this.header = new header(this);
        //
        //Create the body section. Pivots corespond to the cells in the bottom-most
        //row of the crown section. They are important for definwing the with
        //of the body 
        this.body = new body(this);
    }
    //Retiems the htl elememt of a matrix panel as a table section element
    get element() {
        return this.get_element('matrix');
    }
    //Show the header and the body sections of the matrix.
    async show() {
        //
        //Show the header. No data needs to be fetched from the database, so
        //this is a normal call
        await this.header.show();
        //
        //The body data needs to be fetched, so this is an asyncronous call
        await this.body.show();
    }
    //Clearing a matrox is about clearing ite header and body
    clear() {
        this.header.element.innerHTML = '';
        this.body.element.innerHTML = '';
    }
}
class header extends panel {
    //
    //Crumb cell ids, needed for creating the factor-driven table rows. The 
    //order of the factors is important. Hence the use of a Map (instead of 
    //a simple object)
    crumb_cell_ids;
    //
    //Factor levels for the crumb factors
    //The levels for each factor. It has a structure that looks like, e.g.,
    //{school:['kaps'], year:[1019, 2020, 2022}, subject:['kiswahili','maths',..] 
    crumb_factor_levels;
    //
    constructor(parent) {
        super(parent);
    }
    get element() {
        //
        //Set the body element from the web page
        return this.get_element('header');
    }
    //Display the matrix header as a set of rows that comprise of 2 sections, viz., crest
    //and crumb. There are types of rows:-
    //-the a top most row, a.k.a, a partition; 
    //-the bottom most row
    //-the intermediate rows
    async show() {
        //
        //Empty the header first, so that we can paint it a fresh
        this.element.innerHTML = '';
        //
        //The crest ctes are obtained the same way as those of the crumb
        //
        //Set the header levels. You requre aa general set of ctes and a specific one
        //The general ctes to use for extracting factor levels are sheet_ctes (as
        //opposed to base cte). The specific cte to use for extacting the factor 
        //levels of a crest. Perhaps teh cte should be 
        //renamed to body (rather than crown)
        this.crumb_factor_levels = await this.sheet.get_factor_levels('crumb', this.query.all_ctes, 'crown');
        //
        //Use the crumb factors to create a map of cell ids and populate them
        const keys = this.query.factors.crumb.map((fname, index) => this.get_crumb_cell_ids(fname, index));
        //
        //Uset the keys to create a map of cell ids
        this.crumb_cell_ids = new Map(keys);
        //
        //Show the topmost row
        this.show_top_row();
        //
        //Show the intermediate rows
        //
        //Get the index of the last factor
        const last_index = this.query.factors.crumb.length - 1;
        //
        //Show the intermediate header rows; these are all teh rows with index
        //less than the last index
        for (let i = 0; i < last_index; i++)
            this.show_intermediate_row(this.query.factors.crumb[i], i);
        //
        //Show the bottom-most row, a.k.a, pivot, of the header region;
        //The last index is -1 if there are no crub factors. But the pivot row
        //must still exist.
        this.show_pivot_row(last_index);
    }
    //The topmost row in a header is shows the structuring behind the matrix 
    show_top_row() {
        //
        //Create the top row under the header element
        const tr = this.element.insertRow();
        //
        //Create an anchor for the cells
        const anchor = { element: tr, panel: this };
        //
        //Add the margin cell whose value is 'label' spanning 1 column
        new cell(anchor, 'th', 'read_only', 1, 'Label');
        //
        //Add crest cell, titled crest and with a span as big as the number of
        //crest factors, if there are crests
        if (this.query.factors.crest.length !== 0)
            new cell(anchor, 'th', 'read_only', this.query.factors.crest.length, 'Crest');
        //
        //Add one crumb cell that is as wide as the number of cells in the
        //bottom-most row, a.k.a., pivot, if tehere are crub cells
        if (this.pivots.length !== 0)
            new cell(anchor, 'th', 'read_only', this.pivots.length, 'Crumb');
        //
        //Add one summary cell that as wide as the number of  summaries, if there
        //are summaries    
        if (this.query.summaries.right.length !== 0)
            new cell(anchor, 'th', 'read_only', this.query.summaries.right.length, 'Summary');
        //
        //If all the factors are 0, then this is a dimensionless scalar. This is
        //unusual. Report it.
        if (this.query.factors.crest.length === 0
            && this.pivots.length == 0
            && this.query.summaries.right.length == 0)
            throw new schema.mutall_error('A dimensioness scalar not expected');
    }
    //Show the i'th intermediate header row; the index is that of the factor
    //the match this position in the crumb factors 
    show_intermediate_row(factor, index) {
        //
        //Create the intermediate row under the header element
        const tr = this.element.insertRow();
        //
        //Create an anchor for the cells
        const anchor = { element: tr, panel: this };
        //
        //Create the crumb labeling draggable 'th' based on this header 
        new draggable('th', anchor, 'crumb', factor, index).show();
        //
        //Add one empty crest cell with a span as big as the number of
        //crest factors
        new cell(anchor, 'th', 'read_only', this.query.factors.crest.length);
        //
        //Add as many crumb cells as there are cell ids for the factor that 
        //matches this index
        Array.from(this.crumb_cell_ids.values())[index].forEach(cell_id => new crumb_cell(this, factor, index, anchor, cell_id));
        //
        //Add an empty summary cell that as wide as the number of summaries
        new cell(anchor, 'th', 'read_only', this.query.summaries.right.length);
    }
    //Show the bottom-most row in the header. It pivots the header and body regions
    //of a matrix. Its row index is -1 if there are no crumb 
    //factors
    show_pivot_row(index) {
        //
        //Create the pivot row under the header element
        const tr = this.element.insertRow();
        //
        //Create an anchor for the cells
        const anchor = { element: tr, panel: this };
        //
        //Get the factor at the given index and use it for labeling crumb levels
        const crumb_factor = this.factors.crumb[index];
        new draggable('th', anchor, 'crumb', crumb_factor, index).show();
        //
        //Add as many crest cells as there are factors. They have text labels 
        //that match their ids
        this.query.factors.crest.forEach((factor, i) => new draggable('th', anchor, 'crest', factor, i).show());
        //
        //Add as many crumb cells as there are cell ids for the factor that 
        //matches this index. Skip this step if there are no crumb cells. This is
        //indicated by the negatove 
        if (index !== -1)
            Array.from(this.crumb_cell_ids.values())[index].forEach(cell_id => new crumb_cell(this, crumb_factor, index, anchor, cell_id));
        //
        //Add as many summary cells as there are righ summaries
        this.query.summaries.right.forEach(summary => new cell(anchor, 'th', 'read_only', 1, summary, summary));
    }
    //Pivots are the cell ids in the last row of the crumb cells. This row is 
    //also known as teh pivot row. The number of pivots is one of the 
    //determinat of the width of a sheet matrix
    get pivots() {
        //
        //the cerumb cell_ids must be set
        if (this.crumb_cell_ids === undefined)
            throw new schema.mutall_error('header.crumb_cell_ids not set');
        //
        //There are not pivot cells, and theerfore no ids, if there are no crumb 
        //factors
        if (this.factors.crumb.length === 0)
            return [];
        //
        //Let L be the index of the last crumb cell id.
        const L = this.crumb_cell_ids.size - 1;
        //
        //Get the cell ids in the last entry of the cells map
        return Array.from(this.crumb_cell_ids.values())[L];
    }
    //
    //Get the cell ids of the given factor type and index.
    get_crumb_cell_ids(factor, index) {
        //Compute the cells to which we wish to map each factor. Note the unique signature
        //of each cell.
        /*
        [
            f1 =>[
                {f1:'l11'},
                {f1:'l12'},
                {f1:'l13'}
            ]
            f2 =>[
                {f2:'l11', f1:'l11'}, <-------------this is a cell's signature
                {f2:'l11', f1:'l12'},
                {f2:'l11', f1:'l13'},

                {f2:'l12', f1:'l11'},
                {f2:'l12', f1:'l12'},
                {f2:'l12', f1:'l13'}
            ]
            f3=>[
                {f3:'l31', f2:'l11', f1:'l11'},
                {f3:'l31', f2:'l11', f1:'l12'},
                {f3:'l31', f2:'l11', f1:'l13'},
                {f3:'l31', f2:'l12', f1:'l11'},
                {f3:'l31', f2:'l12', f1:'l12'},
                {f3:'l31', f2:'l12', f1:'l13'},

                {f3:'l32', f2:'l11', f1:'l11'},
                {f3:'l32', f2:'l11', f1:'l12'},
                {f3:'l32', f2:'l11', f1:'l13'},
                {f3:'l32', f2:'l12', f1:'l11'},
                {f3:'l32', f2:'l12', f1:'l12'},
                {f3:'l32', f2:'l12', f1:'l13'}
            ]
        ]
        */
        //Slice from factors, starting from 0 to i+1, to get ancestors. The ancestor
        //of f1 (including self) is [f1], of f2 are [f2,f1] and of f3 are [f3,f2,f1]
        //They are important in defining a cell's signature.
        const ancestors = this.factors.crumb.slice(0, index + 1);
        //
        //Reduce each ancestor of this factor to an array of its corresponding cells 
        //as illustrated above. Start with an empty list of cells. Note: there are
        //2 versions of reduce. The initial value must be provided to help typescript
        //pick the version we want
        const cell_ids = ancestors.reduce((pv, cv, i) => this.generate_cells(pv, cv, i), []);
        //
        //Save the cells for this factor
        return [factor, cell_ids];
    }
    //Generate the cell ids a row, given the cell ids of the previous row and
    //the levels of the current factor. 
    generate_cells(previous_cells, factor, index) {
        //
        //Start with an empty list of cell ids
        const cell_ids = [];
        //
        //The factors levels associated with a header must be defined before using 
        //them
        if (this.crumb_factor_levels === undefined)
            throw new schema.mutall_error('Initialize  header factor levels before using them');
        //
        //Get the levels for the given factors
        const levels = this.crumb_factor_levels[factor];
        //
        //Ensure that the levels for the given factors are set
        if (levels === undefined)
            throw new schema.mutall_error('You are using factor levels before initializing them');
        //
        //If there are no previous cells...
        if (index === 0) {
            //
            //...then there are as many cells as there  are levels for this factor
            for (const level of levels) {
                //
                //Create a new cell id from scratch
                const new_cell_id = new Map();
                //
                //Add the new factor and its level to the new cell
                new_cell_id.set(factor, String(level));
                //
                //Add the new cell to the collection
                cell_ids.push(new_cell_id);
            }
        }
        else {
            //...there are s many cells at this level as there are the product
            //of the (A) the number of cells in the previous rows and B) the 
            //levels of teh current factor. This is what the double loop helps 
            //to achieve 
            for (const cell_id of previous_cells) {
                for (const level of levels) {
                    //
                    //Create a new cell id, using the current one
                    const new_cell_id = new Map(cell_id);
                    //
                    //Add the new factor and its level to the new cell
                    new_cell_id.set(factor, String(level));
                    //
                    //Add the new cell to the collection
                    cell_ids.push(new_cell_id);
                }
            }
        }
        //
        //Return the cell id
        return cell_ids;
    }
}
//The body class models the body region of a table matrix
class body extends panel {
    matrix;
    //The body needed the header
    constructor(matrix) {
        super(matrix);
        this.matrix = matrix;
    }
    //Create the body section with filled in data
    async show() {
        //
        //Clear/Empty the header first
        this.element.innerHTML = '';
        //
        //Use the examiner query to get the body data
        const data = await this.get_data();
        //
        //Create the empty table by adding as many rows (to the body element) 
        //as there re data rows
        data.forEach((row) => this.create_empty_row(row));
        //
        //Use the empty table to fill it with data. Driven by the data, populate 
        //the data rows
        data.forEach((data_row, rowIndex) => this.populate_row(data_row, rowIndex));
    }
    get element() {
        return this.get_element('body');
    }
    //Create an empty row of data (to be filled in later)
    create_empty_row(row) {
        //
        //Create an empty row (tr)
        const tr = this.create_element('tr', this.element);
        //
        //Create an anchor for the cells
        const anchor = { element: tr, panel: this };
        //
        //Create the body row selector, in the labels column. For now, its a simple
        //empty cell. In future we shall add a checkbox to support multi-row 
        //operations, eg. merging, deleting, copying
        new cell(anchor, 'th', 'read_only');
        //
        //Create empty cells under the crest region
        this.query.factors.crest.forEach(crest => new cell(anchor, 'th', 'read_only', 1, "", crest));
        //
        //Create empty cells under the crumb region of the bottom most row
        this.sheet.matrix.header.pivots.forEach(cell_id => new cell(anchor, 'td', this.get_io_type(cell_id, row), 1));
    }
    //Get the io type given a cell id
    get_io_type(cell_id, row) {
        //
        //In which regon is the measurement?
        const region = this.get_measurement_region();
        //
        //What is the actual measurement name? Search for it in the given region
        const name = this.get_measurement_name(region, cell_id, row);
        //
        //Get the measurement's io (from the measurement map); it must exist
        const Io = this.query.measurements.get(name);
        if (Io === undefined)
            throw new schema.mutall_error(`The measurement named '${name}' is not found in the measurements`);
        //
        //Return the io
        return Io;
    }
    //Search for the measurement factor in all the region. Stop the search if
    //found; if not, report error
    get_measurement_region() {
        //
        //Define the regions to search for measurements
        const regions = ['crown', 'crest', 'crumb'];
        //
        //Loop through all the regions...
        for (const region of regions) {
            //
            //If the teh region has the measurement then return it
            if (this.query.factors[region].includes('measurement'))
                return region;
        }
        //
        //At theis point the measurement factor was not found. Report error
        throw new schema.mutall_error(`No measurement factor found in any region`);
    }
    //Find the measurement name from the given region. 
    get_measurement_name(region, cell_id, row) {
        //
        //Define the measurement name
        let mname;
        //
        switch (region) {
            case 'crown':
                //Get the measurement from one of the filters (named measurement)
                //This will throw exception if no selection is found
                return this.sheet.get_selected_value('measurement');
            case 'crest':
                //Get the measurement name from the data row
                mname = row['measurement'];
                //
                //Report an eror if not found
                if (mname !== undefined)
                    return String(mname);
                // 
                throw new schema.mutall_error(`No measurement found in crest region`);
            case 'crumb':
                //Get the measurement name from the column cell id
                mname = cell_id.get('measurement');
                //
                //Report an eror if not found
                if (mname !== undefined)
                    return mname;
                // 
                throw new schema.mutall_error(`No measurement found in crumb region`);
            default:
                //Somethin is unusual. Report errror
                throw new schema.mutall_error(`Region ${region} is not expected to hold measurement`);
        }
    }
    //Returns the data for filling up the body
    async get_data() {
        //
        //Compile complete sql code for getting the data for loading to the body
        //
        //Complete the query for getting the body dat. 
        //Limit the number of rows as this might get very large very easily.
        //In future, consider scrolling -- the same way we do with the CRUD
        //interface        
        const body_sql = `
            ${this.query.all_ctes}\n
            select * from crest limit ${this.query.limit} offset ${this.query.offset}`;
        //
        //Create the (incomplete, i.e., false parameter) database, execute the 
        //sql to return the data
        return await server.exec('database', [this.query.dbname], 'get_sql_data', [body_sql]);
    }
    //
    //Fill the crest and crumb sections of a body row. The data is in the fuel 
    //and the table row to fill has the given index
    populate_row(data_row, row_index) {
        //
        //Get the body row, i.e., the tr
        const tr = this.element.rows[row_index];
        //
        //Populate the tr with the crest cells
        this.query.factors.crest.forEach(factor => this.populate_cell(factor, data_row[factor], tr));
        //
        //populate the tr with the crumb cells
        //
        //Get the crumb data; it is a json string in the raw_values 
        //Convert it into an array
        const Ids = JSON.parse(String(data_row.raw_values));
        //
        //Destructure the id/value pairs to populate every crumb cell
        Ids.forEach(({ id, value }) => this.populate_cell(id, value, tr));
    }
    //
    //Populating a cell in the  crumb section of the body region
    populate_cell(id, value, tr) {
        //
        //Look for a cell (in the bottomost of the header) whose id matches the
        //given one
        const td_header = this.get_element(id);
        //
        //Get its column index
        const cellIndex = td_header.cellIndex;
        //
        //Get the column, as a td,  that matches the index from the tr
        const td_body = tr.cells[cellIndex];
        //
        //Use the td to get the io that is associated with that it
        const Io = io.io.get_io(td_body);
        //
        //Set the value of the io to that of the pair
        Io.value = value;
    }
}
//This is the basic building block for our worksheet
class cell extends view {
    //
    //This ie the element that represents the table cell.
    td;
    //
    //The i/o type of this cell is important for editiong purposes
    io;
    //
    constructor(parent, cell_type, io_type, colspan, text, id) {
        super();
        //
        //Destructure the anchor to get parent elementand page of the cell
        const { element, panel } = parent;
        //
        //Create a the element that represents the  cell
        this.td = this.create_element(cell_type, element, { colSpan: colspan, textContent: text, id: id });
        //
        //
        //Get the io's anchor is an element in a page view
        const anchor = { element: this.td, page: panel.sheet };
        //
        this.io = io.io.create_io(anchor, io_type);
    }
    //Implementation of some basic cell methods. These methods are trivial for
    //a normal cell; they are not for a crumb cell
    get colspan() {
        return this.td.colSpan;
    }
    set colspan(n) {
        this.td.colSpan = n;
    }
    get text() {
        return this.td.textContent;
    }
    set text(n) {
        this.td.textContent = n;
    }
    get id() {
        return this.td.id;
    }
    set id(id) {
        this.td.id = id;
    }
}
//Special panels that house draggables cells
class draggable extends panel {
    region;
    factor;
    index;
    //
    //A draggable is an element, represented by this one
    element__;
    //
    //A panel has a parent (which too must be a panel). The top panel is the 
    //sheet. That is where the factors are acutally 
    constructor(tagname, parent, 
    //
    region, factor, index) {
        //The panel id of a draggable matches the factor name
        super(parent.panel);
        this.region = region;
        this.factor = factor;
        this.index = index;
        //
        //Create the draggable element
        this.element__ = this.create_element(tagname, parent.element);
        //
        //Make the element of this draggabble, well, draggable
        this.element__.draggable = true;
        //
        //Add the ondrag start listener
        this.element__.ondragstart = (ev) => sheet.start_dragging_factors(ev, region, index);
        //
        //Add the ondrop over listener and stop its default behaviour because 
        //it interferes with the drop operation. See the MDN reference manual 
        this.element__.ondragover = (ev) => ev.preventDefault();
        //
        //Add the drop listener to the filter span tag to repaint the entire
        //worksheet when a factor is droped on the filter
        this.element__.ondrop = async (ev) => await this.on_drop(ev, region, index);
    }
    //Show the text content of the draggable factor
    show() {
        this.element.textContent = this.factor;
    }
    //On dropping a factor, determine the sheet changes required; then effect them
    async on_drop(ev, to, index) {
        //
        //Update factors, the destination of the drop being in the given regon
        this.query.update_factors_ondrop(ev, to, index);
        //
        //Get the region we are dragging from
        const from = ev.dataTransfer.getData('region');
        //
        //The crown need not be repainted if it is not affected by the drop
        if (![from, to].includes('crown'))
            await this.sheet.matrix.show();
        //
        //Refresh the entire sheet (WITHOUT INITIALIZING IT)
        else
            this.sheet.show();
    }
    ;
    //Translate the abstract element() to the local version
    get element() {
        return this.element__;
    }
}
//Cells in the header region crumb section
class crumb_cell extends cell {
    header;
    factor_name;
    factor_index;
    //
    //
    constructor(header, factor_name, factor_index, anchor, cell_id) {
        super(anchor, 'th', 'read_only');
        this.header = header;
        this.factor_name = factor_name;
        this.factor_index = factor_index;
        //
        this.colspan = this.get_colspan(factor_index);
        this.text = this.get_text(cell_id);
        this.id = this.get_id(cell_id);
    }
    //
    //Show the cells for the  crumblet identified by the given index and factor  
    //number of crumblets below the current one
    //The span of each cell
    //(S) is a function of 2 variables, viz, 
    //- C: the number of cell ids for he given factor index
    //-B : the number of cells in the bottom most row 
    //S is B/C
    get_colspan(factor) {
        //
        //Let a the number of cells in bottom most row, i.e., the width of the matrix
        const a = this.header.pivots.length;
        //b is number of cells for the given factor
        const b = Array.from(this.header.crumb_cell_ids.values())[factor].length;
        //
        //The column span of a cruiblet cell ios the number of cvells ij the bottm
        //row divided by yje number celld for this factor
        const colspan = a / b;
        //
        //Create the crumblet cell
        return colspan;
    }
    //
    //Getting the id of the crumb cells
    get_id(cell_id) {
        //
        //Get the values from the cell_id map
        const id = Array.from(cell_id.values()).join("_");
        //
        //Return the id
        return id;
    }
    //
    //Get the text to be inserted in the crumb cells
    get_text(cell_id) {
        //
        //Use the factor of this cell to access the matching cell_id key
        //Its value is the required text
        const text = cell_id.get(this.factor_name);
        //
        if (text === undefined)
            throw new schema.mutall_error(`No crumb factor with name '${this.factor_name}' found`);
        //
        //Return the text
        return text;
    }
}
//A class for modelling crown filters. Extending the library view allows us to 
//access library methods for views  
class filter extends draggable {
    factor;
    index;
    legend;
    //
    //The label element of a filter for the select element
    label;
    //
    //The span element used for labeling the selector as well as  holding
    //drag/drop labels
    span;
    //
    //The selector for filter values
    select;
    //
    constructor(
    //
    parent, 
    //
    //The name and index of the filter factor
    factor, index, 
    //
    //The legend that groups all the filter elements
    legend) {
        super('label', { element: legend, panel: parent }, 'crown', factor, index);
        this.factor = factor;
        this.index = index;
        this.legend = legend;
        //
        //Use the filters fieldset in the crown section to add the label element
        //
        //Let the label property be the eelement of this panel. We know that
        //the element of this panel is a label (because we created it)
        this.label = this.element;
        //
        //Set the parent of the label to be the legend (not the crwn)
        legend.appendChild(this.label);
        //Create the span element, including its drag/drop listeners
        this.span = this.create_span_element();
        //
        //Create the select element, including its onchange listener 
        this.select = this.create_select_element();
    }
    //Create teh span element of a filter and attach drag/drop events
    create_span_element() {
        //
        //Use the label element to add a span tag showing the name
        //of the item
        const span = this.create_element('span', this.label, { textContent: this.factor });
        //
        return span;
    }
    //Create the filter selector element
    create_select_element() {
        //
        //Use the same label element to add the input element whose id is the
        // same as item
        const select = this.create_element('select', this.label, { id: this.factor });
        //
        //Add the onchange event listener to repaint the entire matrix 
        //based on the change 
        select.onchange = async () => await this.on_change();
        //
        return select;
    }
    //When a filter, it is equivalent to selection using the  page selector 
    //indirectly. Translate this  to an on-change event on the paginator.  NB. 
    //Chamging a select value programmatically does not automatcally raise the
    //onchange event. It has to be manually done 
    async on_change() {
        //
        //Update the paginator with the new filters combinations. Return true 
        //if successful, otherwise false
        const represented = this.sheet.crown.paginator.update_using_filters();
        //
        //If the filter selections have a match in the paginator, force a page
        //selector onchange
        if (represented)
            await this.sheet.crown.paginator.on_change();
        else {
            //
            //Clear the sheet matrix, both header and body
            this.sheet.matrix.clear();
            //
            //Show the restore button, if the paginator has a valid as index
            if (this.sheet.crown.paginator.last_index !== undefined)
                this.sheet.crown.restore_button.hidden = false;
        }
    }
    //Fill the given selector with options. The options are the levels associated
    //with the given factor
    show() {
        //
        //Check that the levels are set before using them
        if (this.sheet.crown.levels === undefined)
            throw new schema.mutall_error('Levels are not set');
        //
        //Add the filter options
        //For each factor level...
        for (const value of this.sheet.crown.levels[this.factor]) {
            //
            //Create the option element for the selector
            this.create_element(
            //
            //The name of the element
            'option', 
            //
            //Add the option to the selector parent
            this.select, 
            //
            {
                //
                //Set Option id to the item selected 
                id: String(value),
                //
                //Set the text content of the option to the result from the sql
                textContent: String(value)
            });
        }
        //
        //Update the value of the filter to match that of the paginator
        this.update_value();
    }
    //Update the filter value to synchronise it filter with the corresponding 
    //paginator data. 
    update_value() {
        //
        //Get the current paginator selection index
        const paginator_index = this.sheet.crown.paginator.selector.selectedIndex;
        //
        //Get the paginator data that matches the index. The paginator data
        //must be set by now
        const data = this.sheet.crown.paginator.data[paginator_index];
        //
        //Get the fuel value that matches this filter's factor
        const value = data[this.factor];
        //
        //Lookup this value in this filter's options
        const opt = this.select.namedItem(String(value));
        //
        //If the value cannot be found in the options, something must be wrong
        if (opt === null)
            throw new schema.mutall_error(`This value '${value}' is not among the options for filter '${this.factor}'`);
        //
        //Get the index of the filter option
        const filter_index = opt.index;
        //
        //Set the current index of the filter to the filter index
        this.select.selectedIndex = filter_index;
    }
}
//The paginator is a panel in the crown region
class paginator extends panel {
    crown;
    //
    //The page selector selector
    selector;
    //
    //The page data as selector options
    data;
    //
    //The last valid selected index of the paginator, used for restoring a matrix
    last_index;
    //
    //The paginatpr constructor only requires the parent crown panel
    constructor(crown) {
        //
        //Initialize the parent panel
        super(crown);
        this.crown = crown;
        //
        //Get the actual page selector element, called pagibator
        this.selector = this.get_element('paginator');
        //
        //Add the onchange listener to the selector. Once changed, the entire 
        //sheet is repainted
        this.selector.onchange = async () => await this.on_change();
    }
    //The general element of a panel is mapped to the selector element of the
    //paginator
    get element() {
        return this.selector;
    }
    //Get paginator data and show it
    async show() {
        //
        //Get the paginator data  as selector options
        this.data = await this.get_paginator_data();
        //
        //use the data to fill the selector with options. 
        this.data.forEach(page => 
        //
        //Create the option element for the page selector
        this.create_element(
        //
        //The name of the element
        'option', 
        //
        //Add the option to the selector
        this.selector, 
        //
        {
            //
            //Set Option value to the page number 
            value: this.get_page_condition(page),
            //
            //Set the text content of the option to the joint string
            textContent: String(page.joint)
        }));
    }
    //
    //Get the data required for filling  the page selector with options
    async get_paginator_data() {
        //
        //There is no paginator data if there are no filters
        if (this.factors.crown.length === 0)
            return [];
        //
        //Compile the sql that exracts the page selector options. |Remember to 
        //use the 'measurements ctes' and the 'measurements cte' (note the plural)
        //The former is the set of base ctes and the measurement cte
        const sql = `
            ${this.query.measurements_ctes}
            select distinct
                ${this.factors.crown.join(',')},
                concat_ws('/', ${this.factors.crown.join(',')} ) as joint 
            from
                measurements`;
        //
        //Execute the sql to retrieve the actual data
        let data = await server.exec('database', 
        //
        //Create the (incomplete, i.e., false parameter) database, execute the 
        //sql to return the data
        [this.query.dbname, false], 'get_sql_data', [sql]);
        //
        //Return the extracted data
        return data;
    }
    //Returns the condition for selecting one page. E.g.,
    //school='kaps' and year='2014' and class='8' and stream='R'... etc
    //The page data looks like:-
    //{school:'kaps', year:2014, class:8...}
    get_page_condition(page) {
        //
        //Start with an empty result list of factor/value pairs
        const result = [];
        //
        //For each filter factor...
        for (const key of this.factors.crown) {
            //
            //Get the factor/value pair, formated in the way we would like it 
            //for the condition e.g. year='2014'
            const pair = `${key} ='${page[key]}'`;
            //
            //Add the factor/value pair into a result list
            result.push(pair);
        }
        //Use the result list to join the factor/value pairs using the 
        //'and' oparator
        return result.join(' and ');
    }
    //When a paginator changes, update the filters; then repaint the matrix
    async on_change() {
        //
        //Update the filters to synchronise them with the paginator
        this.sheet.crown.filters.forEach(filter => filter.update_value());
        //
        //Repaint the matrix only. The crown need not be repainted.
        this.sheet.matrix.show();
    }
    //Use the filters to update this paginator
    update_using_filters() {
        //
        //1. Fomulate a new option value based on the current settings of all the
        //page items
        //
        //1.1 Construct a page fuel using the values of the curret filer settings
        const page = this.get_item_data();
        //
        //1.2 Converting the page fuel to an option value (using the same method
        //as the one using for constructing the paginator options)
        const value = this.get_page_condition(page);
        //  
        //2. Set the paginator value to the new option
        //
        //2.1 Set the paginator value to the new option value
        this.selector.value = value;
        //
        //If teh current filter settings do not have a match in the paginator, 
        //then the selectIndex is -1.
        return this.selector.selectedIndex == -1 ? false : true;
    }
    //Create an object with an array of factors and their values to be used for
    //formulating a  where clause that matches the crown filter settings
    get_item_data() {
        //
        //Start with an empty fuel
        const result = {};
        //
        //For each filter factor....
        for (const factor of this.factors.crown) {
            //
            //Get the factor's value
            const value = this.get_element(factor).value;
            //
            //Add it to the empty fuel using the factor as a key(take the result
            // add the factor to the result and assign the factors result)
            result[factor] = value;
        }
        //
        //Return the completed fuel
        return result;
    }
}
//This class supports the viewinmg of a sheet in different modes, e.g. edit or
//normal modes 
class mode {
    style_sheet;
    //
    constructor(style_sheet) {
        this.style_sheet = style_sheet;
    }
    //
    //Show the matrix body in either normal or edit modes. Technically, this means
    //2 things:-
    //- If the mode selected is normal, look for the normal rule and set it to 
    //flex and edit to none
    //- If the mode selected is edit, look for the edit rule set it to flex and 
    //nomal to none
    execute(mode) {
        //
        //Get your css declarations for controlling the view mode
        const edit = this.mode_get_css_style_declaration('.edit');
        const normal = this.mode_get_css_style_declaration('.normal');
        //
        switch (mode) {
            //If the mode selected is normal...
            case 'normal':
                //...use the normal declararion to set its display property to 
                //flex 
                normal.setProperty('display', 'flex');
                //
                //...use for the edit declararion and set its display property to 
                //none 
                edit.setProperty('display', 'none');
                break;
            //    
            //If the mode selected is edit
            case 'edit':
                //...use  the edit declaration and set its display property to 
                //flex 
                edit.setProperty('display', 'flex');
                //
                //...use for the edit declaration set its display property to 
                //none 
                normal.setProperty('display', 'none');
                break;
        }
    }
    //
    //Get the given css declaration that matches the given rule rule selector
    /*
        .normal                     |    <-------------selector_text
        {                           |                   |
            display:none;           |Rule               |  <-----property/value
            textclor:black          |                   |Declaration
        }                           |                   |
    */
    mode_get_css_style_declaration(selector_text) {
        //
        //Get the style element that controls the view mode
        const style_element = this.style_sheet;
        //
        //Use the element to get the associated  Css stylesheet
        const css_stylesheet = style_element.sheet;
        //
        //Get the css rulelist from the stylesheet
        const css_rulelist = css_stylesheet.cssRules;
        //
        //Get the css rule that matches the requested selector text
        const rule = this.mode_get_rule(selector_text, css_rulelist);
        //
        //Get and return the css normal declaration
        const declaration = rule.style;
        return declaration;
    }
    //Get the rule (from the given list of rules) whose selector text matches 
    //the given selector
    mode_get_rule(selector, list) {
        //
        //Convert the list into an array so that we can use the for/of
        //methods for searching the selectpr text
        const list_array = Array.from(list);
        //
        //For each css style rule....
        for (const rule of list_array) {
            //
            //Cast the general rule to the specific CSSStyle rule
            const rule2 = rule;
            //
            //Compare the selector text with the one we want and if it matches
            //then return the css rule otherwise go to the next rule
            if (rule2.selectorText === selector)
                return rule2;
        }
        //At this point there is no error that matches the selector text, 
        //so something must have gone wrong, stop this function and report an 
        //error to that effect
        throw `Cannot find a css rule with selector ${selector}`;
    }
}
