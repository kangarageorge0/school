//Resolves reference to the asset.products data type
import * as view from '../../../outlook/v/code/view.js';
import * as io from "../../../schema/v/code/io.js";

//Import server.
import * as server from "../../../schema/v/code/server.js";

//Resolve references to a database
import * as schema from "../../../schema/v/code/schema.js";
import * as lib from "../../../schema/v/code/library"; 

import {
    query, 
    region_type,
    factor_type,
    summary_type
} from "./query.js"; 

//Fuel is already defined in schema
type fuel = schema.fuel

//A cell is a map object that can be indexed by as many factor types as 
//necessary. It is equivalent to this ordinary objet definition
type cell_id = Map<factor_type, string>;

//The sheet is the overall container for all the areas of a worksheet. It is linked
//to Mutalldata (library) through the page class
export class sheet extends view.page{
    //
    //The query that drives this sheet
    public query:query;
    //
    //The crown area
    public crown:crown;
    //
    //The matrix area comprising of the header and the body
    public matrix:matrix;
    
    //
    //The constructor arguments are desined to allow a user to alter the shape
    //of a worksheet, thus creating the most intuitive view from a user's 
    //perspective
    constructor(
        //
        //The query that drive this sheet. Note the query argument is captitalised
        //to avoid confucion with the query class, which we need to access
        //the static properties page.
        Query:query
    ){
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
        this.matrix= new matrix(this);

        
    }
    
    //Complete the construction of a the sheet by setting all (optional) 
    //properties that may require visits to the server.
    async initialize(){
        //
        //Complete the construction of a query
        await this.query.initialize();
    }


     //Show all the sections of a sheet: the crow, the header, the body and the 
     //tail teh first time round
     public async show():Promise<void>{
        //
        //Complete the initialization of the sheet. You require access to the
        //server to read teh base query
        await this.initialize();
        //
        //Show the crown section; you will need to fetch teh paginatiion data from
        //the database; hence asynchronous
        await this.crown.show();
        //
        //Show the matrix sections with data from database; hence asynchronous
        await this.matrix.show();
     }

     //Show this sheet, not the first time; so initialization is not neede
     public async re_show():Promise<void>{
         //
        //Save the current selection index for future reference in case we need to 
        //restore the previous matrix
        this.crown.last_index = this.crown.paginator.selectedIndex;
        //
        //Set the filter values located in the crown region
        this.crown.set_filter_values();
        //
        //Show the matrix sections with data from database; hence asynchronous
        await this.matrix.show();
     }

           
}

//This class was introduced to contain methods that are common to crown, header
//body and footer regions of a sheet. 
class panel extends view.view{
    //
    //NB:
    //-The sheet is protected to prevent potential abuse. E.g., uasge like
    //Sheet.crown.sheet will not be allowed as sheet is protected
    //-The panel and the sheet must live in the same file to prevent cyclic
    //imports
    constructor(protected sheet:sheet){super()}
    //
    //Accessing the query in a sheet
    get query(){return this.sheet.query}
}
//
//The Crown class
class crown extends panel {
    //
    //The table section
    public element:HTMLTableSectionElement;
    //
    //The paginator section
    public paginator:HTMLSelectElement;
    //
    //The page data
    public paginator_data?:Array<fuel>;
    //
    //The filters for setting crown factor levels
    public legend:HTMLLegendElement;
    //
    //The collection of filter select elements, ordered in the same way as 
    //the query crown factors 
    public filters:Array<filter>;
    //
    //The last valid selected index of the paginator, used for restoring a matrix
    public last_index? :number;
    //
    //Restore button is used for restoring a matrix to its last version, 
    //typically following a filter selection that produces no result 
    public  restore_button : HTMLButtonElement;
    //
    //
    public filter?:filter;
    
    //
    constructor(sheet:sheet){
        super(sheet);
        //
        //Set the body element from the web page
        this.element = <HTMLTableSectionElement>this.get_element('crown');
        //
        //Setting the paginator
        this.paginator = <HTMLSelectElement>this.get_element('paginator');
        //
        //Setting the legend for filters
        this.legend = <HTMLLegendElement>this.get_element('filters');
        //
        //Create the filters in the crown
        this.filters = this.query.factors!.crown.map((factor,index)=>new filter(factor, index, this.legend, this.sheet));
    //
        //Intitialize user interfaces that are associated with the sheet????
        //
        //Creating a button for restoring
        this.restore_button = this.create_element('button',this.legend,{
            textContent : "Restore Last Page with Data",
            hidden:true
        });
        //
        //Add the restore lister to the button
        this.restore_button.onclick= ()=>this.restore();
    }

    //Restore the matrix last valid selectIndex of of the paginator in the crown
   //Section
   restore():void{
    //
    //Get the paginator (from the crown) and set its index to the last index
    this.paginator.selectedIndex = this.last_index!;
    //
    //Refresh the matrix
    this.sheet.matrix.show();
    //
    //Hide the restore button once the page is restored. The button is in the 
    //crown section
    this.restore_button!.hidden = true;
}

    //Paint the crown section
    public async show():Promise<void>{
        //
        //1. Show the paginator
        //
        //1.1 Get the paginator selector data, e.g.,
        this.paginator_data  = await this.get_paginator_data();
        //
        //1.2 Fill the paginator with select options. 
        this.paginator_data.forEach(page=>
            //
            //Create the option element for the page selector
            this.create_element(
                //
                //The name of the element
                'option',
                //
                //Add the option to the selector
                this.paginator,
                //
                {
                    //
                    //Set Option value to the page number 
                    value:this.get_page_condition(page),
                    //
                    //Set the text content of the option to the joint string
                    textContent: String(page.joint)
                }    
            )
        );
        //
        //Show the filters in the crown
        this.query.factors!.crown.forEach((factor, index)=>this.filters[index].show());
        //
        //Show the mode that allows editting
        this.show_edit_mode();
        
    }
    //
    //Get the data required for painting the page selector
    private async get_paginator_data():Promise<Array<fuel>>{
        //
        //There is no paginator data if there are no flters
        if (this.query.factors!.crown.length===0) return [];
        //
        //Compile the sql that exracts the page selector
        const sql=`
            ${this.query.basequery}
            select distinct
                ${this.query.factors!.crown.join(',')},
                concat_ws('/', ${this.query.factors!.crown.join(',')} ) as joint 
            from
                rank_students`; 
        //
        //Execute the sql to retrieve the actual data
        let data= await server.exec(
            'database',
            //
            //Create the (incomplete, i.e., false parameter) database, execute the 
            //sql to return the data
            [this.query.dbname, false], 
            'get_sql_data',
            [sql]
        );
        //
        //Return the extracted data
        return data;
       
    } 

    //Addi event listeners to the radio buttons for controlling mode.
    show_edit_mode():void{
        //
        //Get the style sheet element which controls the editing
        const style_sheet = <HTMLStyleElement>this.get_element('mode');
        //
        //Create a mode object
        const Mode = new mode(style_sheet);
        //
        //Get the edit mode button
        const edit = <HTMLInputElement>this.get_element('edit');
        //
        //Add a lstener to show the matrix body in edit mode
        edit.onclick  = () => Mode.execute('edit');
        //
        //Get the normal mode button
        const normal = <HTMLInputElement>this.get_element('normal');
        //
        //Add a listener to show the matrix body in normal mode
        normal.onclick  = () => Mode.execute('normal'); 
    }
    
    
    
    //
    //It returns the condition for selecting one page. E.g.,
    //school='kaps' and year='2014' and class='8' and stream='R'... etc
    //The page data looks like:-
    //{school:'kaps', year:2014, class:8...}
    get_page_condition(page:fuel):string{
        //
        //Start with an empty result list of factor/value pairs
        const result:Array<factor_type>=[];
        //
        //For each filter factor...
        for(const key of this.query.factors!.crown){
            //
            //Get the factor/value pair, formated in the way we would like it 
            //for the condition e.g. year='2014'
            const pair = `${key} ='${page[key]}'`;
            //
            //Add the factor/value pair into a result list
            result.push(<factor_type>pair);
        }
        //Use the result list to join the factor/value pairs using the 
        //'and' oparator
        return result.join(' and ');
    }
           
    //Repaint the matrix using the current settings of all the all the crown filters
    repaint_filters():void{
        //
        //1. Fomulate a new option value based on the current settings of all the
        //page items
        //
        //1.1 Construct a page fuel using the values of the curret filer settings
        const page: fuel = this.get_item_data();
        //
        //1.2 Converting the page fuel to an option value (using the same method
        //as the one using for constructing the paginator options)
        const value = this.get_page_condition(page);
        //  
        //2. Set the paginator value to the new option
        //
        //2.1 Set the paginator value to the new option value
        this.paginator.value = value;
    }
    
    //Set the filter values to match the current selection
    public set_filter_values():void{
        //
        //Get the current selection index from the paginator
        const current_selection:number = this.paginator!.selectedIndex;
        //
        //Use the selection index to get the corresponding page data row
        const row:fuel = this.paginator_data![current_selection];
        //
        //For each filter item....
        for (const item of this.query.factors!.crown){
            //
            //Get the item's value
            const item_value: lib.basic_value = row[item];
            //
            //Get the item's input elememt
            const item_element = <HTMLSelectElement>this.get_element(item);
            //
            //Set the text content of the input element to the item's value
            item_element.value = String(item_value);
        }
    }
    
    //Creating an object with an array of factors and their values
    private get_item_data():fuel{
        //
        //Start with an empty fuel
        const result:fuel = {};
        //
        //For each filter facor....
        for (const factor of this.query.factors!.crown){
            //
            //Get the factor's value
            const value:string = (<HTMLSelectElement>this.get_element(factor)).value;
            //
            //Add it to the empty fuel using the factor as a key(take the result
            // add the factor to the result and assign the factors result)
            result[factor]=value;
        }
        //
        //Return the completed fuel
        return result;
    }

    
}


//Modelling teh matrix region, that is the container for the header, body and 
//footer regions 
class matrix extends panel {
    //
    //The table section
    public element:HTMLTableSectionElement;
    
    //Header and body regions of a matrix
    public header:header;
    public body:body;
    
    constructor(sheet:sheet){
        super(sheet);
        //
        //Set the body element from the web page
        this.element = <HTMLTableSectionElement>this.get_element('matrix');
        //
        //Create the header section
        this.header = new header(sheet);
        //
        //Create the body section. Pivots corespond to the cells in the bottom-most
        //row of the crown section. They are important for definwing the with
        //of the body 
        this.body = new body(sheet);
    
   }
   
   //Show the header and the body sections of the matrix.
   async show(){
        //
        //Show the header. No data needs to be fetched from the database, so
        //this is a normal call
        this.header.show();
        //
        //The body data needs to be fetched, so this is an asyncronous call
        await this.body.show();
   }

}  

//
//The header class that models the header raedion of a matrix
class header extends panel {
    //
    //The element that represents the thead table section
    public element:HTMLTableSectionElement;
    //
    //Crumb cell ids, needed for creating the factor-driven table rows
    private crumb_cell_ids?:Map<factor_type, Array<cell_id>> ;
    //
    constructor(sheet:sheet){
        super(sheet);
        //
        //Set the body element from the web page
        this.element = <HTMLTableSectionElement>this.get_element('header');
    }
    
    //This getter ensuers thet the cell ifs are defiend before accessing them
    get cell_ids(){
        //
        //This process is invalid if the crumb_cell ids are not initialized
        if (this.crumb_cell_ids===undefined) 
            throw new schema.mutall_error('You cannot access crumb cell ids before initializing them');
        return this.crumb_cell_ids;
    }

    //Pivots are the cell ids in the last row of the crumb cells
    get pivots():Array<cell_id>{
        //
        //There are not pivots if there are no crumb factors
        if (this.query.factors.crumb.length===0) return [];
        //
        //Let L be the index of the last cell id
        const L = this.cell_ids.size-1;
        //
        //Get the cell ids in the last entry of the cells map
        return Array.from(this.cell_ids.values())[L];
    }

    //
    //Get the cell ids of the given factor type and index.
    private get_crumb_cell_ids(factor:factor_type, index:number):[factor_type, Array<cell_id>]{ 
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
        const ancestors: Array<factor_type> = this.query.factors.crumb.slice(0, index+1);
        //
        //Reduce each ancestor of this factor to an array of its corresponding cells 
        //as illustrated above. Start with an empty list of cells. Note: there are
        //2 versions of reduce. The initial value must be provided to help typescript
        //pick the version we want
        const cell_ids:Array<cell_id> = ancestors.reduce((pv:Array<cell_id>, cv, i)=>this.generate_cells(pv, cv, i), []);
        //
        //Save the cells for this factor
        return [factor, cell_ids];
    }

    //
    //Generate the cell ids a row, given the cell ids of the previous row and
    //the levels of the current factor. 
    generate_cells(previous_cells:Array<cell_id>, factor:factor_type, index:number):Array<cell_id>{
        //
        //Start with an empty list of cell ids
        const cell_ids:Array<cell_id> = [];
        //
        //Get the levels for the given factors
        const levels:Array<lib.basic_value>|undefined = this.query.levels[factor];
        //
        //Ensure that the levels for the given factors are set
        if (levels===undefined) 
            throw new schema.mutall_error('You are using factor levels before initializing them');
        //
        //If there are no previous cells...
        if (index===0){
            //
            //...then there are as many cells as there  are levels for this factor
            for(const level of levels){
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
        }else{
            //...there are s many cells at this level as there are the product
            //of the (A) the number of cells in the previous rows and B) the 
            //levels of teh current factor. This is what the double loop helps 
            //to achieve 
            for(const cell_id of previous_cells){
                for(const level of levels){
                    //
                    //Create a new cell id, using the current one
                    const new_cell_id = new Map(cell_id);
                    //
                    //Add the new factor and its level to the new cell
                    new_cell_id.set(factor, String(level))
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



    //Display the matrix header as a set of rows that comprise of 2 sections, viz., crest
    //and crumb. There are types of rows:-
    //-the a top most row, a.k.a, a partition; 
    //-the bottom most row
    //-the intermediate rows
    public show(): void {
        //
        //Use the crumb factors to create a map of cell ids and populate them
        const keys:Array<[factor_type, Array<cell_id>]> = this.query.factors.crumb.map((fname, index)=> this.get_crumb_cell_ids(fname, index));
        //
        //Uset the keys to create a map oc cell ids
        this.crumb_cell_ids = new Map(keys);
        //
        //Show the topmost row
        this.show_top_row();
        //
        //Show the intermediate rows
        //
        //Get the index of the last factor
        const last_index:number = this.query.factors.crumb.length-1; 
        //
        //Show the intermediate header rows
        for(let i=0; i<last_index-1; i++) this.show_intermediate_row(this.query.factors!.crumb[i], i);
        //
        //Show the bottom-most row, a.k.a, pivot, of the header region;
        //The last index is -1 if there are no crub factors. But the pivot row
        //must still exist.
        this.show_pivot_row(last_index);
    }

    //The topmost row in a header is useful in drag/drop oparation when the header
    //is empty. Irs content matches the header sections
    show_top_row(){
        //
        //Create the top row under the header element
        const tr:HTMLTableRowElement = this.element.insertRow();
        //
        //Create an anchor for the cells
        const anchor:io.anchor = {element:tr, page:this.sheet};
        //
        //Add crest cell, titled crest and with a span as big as the number of
        //crest factors, if there are crests
        if (this.query.factors!.crest.length!==0)
            new cell(anchor, 'th','read_only', this.query.factors!.crest.length, 'Crest');
        //
        //Add one crumb cell that is as wide as the number of cells in the
        //bottom-most row, a.k.a., pivot, if tehere are crub cells
        if (this.pivots.length!==0)
            new cell(anchor, 'th','read_only', this.pivots.length, 'Crumb');
        //
        //Add one summary cell that as wide as the number of  summaries, if there
        //are summaries    
        if(this.query.summaries.right.length!==0)
            new cell(anchor, 'th','read_only', this.query.summaries.right.length, 'Summary');
        //
        //If all the factors are 0, then this is a dimensioness scalar. This is
        //unusual. Report it.
        if (
            this.query.factors!.crest.length===0
            && this.pivots.length==0
            && this.query.summaries.right.length==0
        ) throw new schema.mutall_error('A dimensioness scalar not expected');    
    } 

    //Show the i'th intermediate header row; the index is that of the factor
    //the match this position in the crumb factors 
    show_intermediate_row(factor:string, index:number):void{

        //Create the intermediate row under the header element
        const tr:HTMLTableRowElement = this.element.insertRow();
        //
        //Create an anchor for the cells
        const anchor:io.anchor = {element:tr, page:this.sheet};
        //
        //Add one empty crest cell with a span as big as the number of
        //crest factors
        new cell(anchor, 'th','read_only', this.query.factors!.crest.length);
        //
        //Add as many crumb cells as there are cell ids for the factor that 
        //matches this index
        Array.from(this.cell_ids.values())[index].forEach(cell_id=>new crumb_cell(this, factor, index, anchor, cell_id));
        //
        //Add an empty summary cell that as wide as the number of summaries
        new cell(anchor, 'th','read_only', this.query.summaries.right.length);
    }

    //Show the bottom-most row in the header. It pivots the header and body regions
    //of a matrix. Its row index is -1 if there are no crumb 
    //factors
    show_pivot_row(index:number):void{
        //
        //Create the pivot row under the header element
        const tr:HTMLTableRowElement = this.element.insertRow();
        //
        //Create an anchor for the cells
        const anchor:io.anchor = {element:tr, page:this.sheet};
        //
        //Add as many crest cells as there are factors. They have text labels 
        //that match their ids
        this.query.factors!.crest.forEach(factor=>{
            //
            //Create the bottommost crest cell in the header region 
            const Cell = new cell(anchor, 'th','read_only', 1, factor, factor);
            //
            //Add the ondrag start listener
            Cell.td.ondragstart = (ev)=>this.factors_start_drag(ev,'crest', index);
            //
            //Add the ondrop over listener and stop its default behaviour because 
            //it interferes with the drop operation. See the MDN reference manual 
            Cell.td.ondragover = (ev) => ev.preventDefault();
            //
            //Attach the ondrop even listener
            Cell.td.ondrop = (ev)=>{
                //
                //Update the factors structur, after the drop
                this.query.update_factors_ondrop(ev, 'crest', index);
                //
                //Repaint the whole sheet. THIS MUST BE CALLED FROM TEH SHEET CLASS
                this.sheet.show();
            }    
        });
        
        //
        //Get the factor at the goven index
        const factor:factor_type = this.sheet.query.factors!.crumb[index];
        //
        //Add as many crumb cells as there are cell ids for the factor that 
        //matches this index. Skip this step if there are no crumb cells. This is
        //indicated by the negatove 
        if (index!==-1)
            Array.from(this.cell_ids.values())[index].forEach(cell_id=>new crumb_cell(this, factor, index, anchor, cell_id));
        //
        //Add as many summary cells as there are righ summaries
        this.query.summaries!.right.forEach(summary=>new cell(anchor, 'th','read_only', 1, summary, summary))
    }
      //
    //Creating an ondragstart listener for all thegiven factors index and the source
    //region
    public factors_start_drag(ev:DragEvent, region:region_type, index:number){
        //
        //Set the region type (as the key) to the drag event
        ev.dataTransfer!.setData('region', region);
        //
        //Set the factors index to the drag event
        ev.dataTransfer!.setData('index', String(index));
       
    }


}

//The body class models the body region of a table matrix
class body extends panel {
    //
    //The htmlement that represents the body
    public element: HTMLTableSectionElement;

    //The body needed the header
    constructor(sheet:sheet){
        super(sheet);
        //
        //Set the body element from the web page
        this.element = <HTMLTableSectionElement>this.get_element('body');
    }

    //Create the body section with filled in data
    public async  show():Promise<void>{
        //
        //Use the examiner query to get the body data
        const data:Array<schema.fuel> = await this.query.get_body_data(); 
        //
        //Create the empty table by adding as many rows (to the body element) 
        //as there re data rows
        data.forEach((row)=>this.create_empty_row(row)); 
        //
        //Use the empty table to fill it with data. Driven by the data, populate 
        //the data rows
        data.forEach((data_row, rowIndex)=>this.populate_row(data_row, rowIndex))
    }
    
    //Create an empty row of data (to be filled in later)
    private create_empty_row(row:schema.fuel):void{
        //
        //Create an empty row (tr)
        const tr:HTMLTableRowElement = this.create_element('tr', this.element);
        //
        //Create an anchor for the cells
        const anchor:io.anchor = {element:tr, page:this.sheet};
        
        //
        //Create empty cells under the crest region
        this.query.factors!.crest.forEach(crest=>new cell(anchor, 'th', 'read_only',1, "",  crest));
        //
        //Create empty cells under the crumb region of the bottom most row
        this.sheet.matrix.header.pivots.forEach(cell_id=>new cell(anchor, 'td', this.get_io_type(cell_id, row), 1));
    }
    
    //Get the io type given a cell id
    private get_io_type(cell_id:cell_id, row:schema.fuel):io.io_type{
        //
        //In which regon is the measurement?
        const region: region_type = this.get_measurement_region();
        //
        //What is the actual measurement name? Search for it in the given region
        const name:string = this.get_measurement_name(region, cell_id, row); 
        //
        //Get the measurement's io (from the measurement map); it must exist
        const Io:io.io_type|undefined= this.query.measurements.get(name);
        if(Io===undefined)
            throw new schema.mutall_error(`The measurement named '${name}' is not found in the measurements`)
        //
        //Return the io
        return Io;
    }
    //
    //Get the cell's  string id as a concatenatin of all the values in the 
    //map
    private get_id(cell_id:cell_id):string{
        return Array.from(cell_id.values()).join("/");
    }

    //Search for the measurement factor in all the region. Stop the search if
    //found; if not, report error
    get_measurement_region():region_type{
        //
        //Define the regions to search for measurements
        const regions:Array<region_type> = ['crown', 'crest', 'crumb'] ; 
        //
        //Loop through all the regions...
        for(const region of regions){
            //
            //If the teh region has the measurement then return it
            if (this.query.factors![region].includes('measurement')) return region;
        }
        //
        //At theis point the measurement factor was not found. Report error
        throw new schema.mutall_error(`No measurement factor found in any region`);
    } 

    //Find the measurement name from the given region. 
    get_measurement_name(region:region_type, cell_id:cell_id, row:schema.fuel):string{
        //
        //Define the measurement name
        let mname:schema.basic_value|undefined;
        //
        switch(region){
            case 'crown':
                //Get the measurement from one of the filters (named measurement)
                //This will throw exception if no selection is found
                return sheet.current.get_selected_value('measurement');
            case 'crest':
                //Get the measurement name from the data row
                mname = row['measurement'];
                //
                //Report an eror if not found
                if (mname!==undefined) return String(mname);
                // 
                throw new schema.mutall_error(`No measurement found in crest region`);

            case 'crumb':
                //Get the measurement name from the column cell id
                mname = cell_id.get('measurement');
                //
                //Report an eror if not found
                if (mname!==undefined) return mname;
                // 
                throw new schema.mutall_error(`No measurement found in crumb region`);
            default:
                //Somethin is unusual. Report errror
                throw new schema.mutall_error(`Region ${region} is not expected to hold measurement`);
        }
    } 

     
    //
    //Fill the crest and crumb sections of a body row. The data is in the fuel 
    //and the table row to fill has the given index
    private populate_row(data_row:fuel, row_index:number):void{
        //
        //Get the body row, i.e., the tr
        const tr: HTMLTableRowElement = (<HTMLTableSectionElement> this.element).rows[row_index];
        //
        //Populate the tr with the crest cells
        this.query.factors!.crest.forEach(factor =>this.populate_cell(factor, data_row[factor], tr));
        //
        //populate the tr with the crumb cells
        //
        //Get the crumb data; it is a json string in the raw_values 
        //Convert it into an array
        const Ids:Array<{id:string, value:lib.basic_value}> = JSON.parse(String(data_row.raw_values));
        //
        //Destructure the id/value pairs to populate every crumb cell
        Ids.forEach(({id, value})=>this.populate_cell(id, value, tr)); 
    }
    
    //
    //Populating a cell in the  crumb section of the body region
    private populate_cell(id:string, value:lib.basic_value,tr:HTMLTableRowElement):void{
        //
        //Look for a cell (in the bottomost of the header) whose id matches the
        //given one
        const td_header = <HTMLTableCellElement>this.get_element(id);
        //
        //Get its column index
        const cellIndex:number = td_header.cellIndex;
        //
        //Get the column, as a td,  that matches the index from the tr
        const td_body = tr.cells[cellIndex];
        //
        //Use the td to get the io that is associated with that it
        const Io = io.io.get_io(td_body);
        //
        //Set the value of the io to that of the pair
         Io.value=value;
    }
}


//This is the basic building block for our worksheet
class cell extends view.view {
    //
    //This ie the element that represents the table cell.
    public td:HTMLTableCellElement;
    //
    //The i/o type of this cell is important for editiong purposes
    public io?: io.io;
    //
    constructor(
        parent:io.anchor, 
        cell_type:'th'|'td', 
        io_type: io.io_type,
        colspan?:number,
        text?:string,
        id?:string
    ){
       
        super();
        //
        //Destructure the anchor to get parent elementand page of the cell
        const {element, page} = parent;
        //
        //Create a the element that represents the  cell
        this.td = this.create_element(cell_type, element, {colSpan:colspan, textContent:text, id:id});
        //
        //
        //Get the io's anchor is an element in a page view
        const anchor:io.anchor = {element:this.td, page};
        //
        this.io = io.io.create_io(anchor, io_type);
        
    }

    //Implementation of some basic cell methods. These methods are trivial for
    //a normal cell; they are not for a crumb cell
    get colspan():number{
        return this.td.colSpan;
    }

    set colspan(n:number){
        this.td.colSpan=n;
    }

    get text():string|null{
        return this.td.textContent;
    }

    set text(n:string|null){
        this.td.textContent=n;
    }
    
    get id():string{
        return this.td.id;
    }

    set id(id:string){
        this.td.id=id;
    }
    
}

class crumb_cell extends cell{
    //
    //
    constructor(
        public header:header,
        public factor_name:string,  
        public factor_index:number,
        anchor:io.anchor, 
        cell_id:cell_id
    ){
       
        super(anchor, 'th', 'read_only');
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
    get_colspan(factor:number):number{
         //
        //Let a the number of cells in bottom most row, i.e., the width of the matrix
        const a = this.header.pivots.length;

        //b is number of cells for the given factor
        const b = Array.from(this.header.cell_ids.values())[factor].length;
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
    get_id(cell_id:cell_id):string{
        //
        //Get the values from the cell_id map
        const id = Array.from(cell_id.values()).join("/")
        //
        //Return the id
        return id;
    }
    //
    //Get the text to be inserted in the crumb cells
    get_text(cell_id:cell_id):string{
        //
        //Use the factor of this cell to access the matching cell_id key
        //Its value is the required text
        const text:string|undefined = cell_id.get(this.factor_name);
        //
        if (text===undefined) 
            throw new schema.mutall_error(`No crumb factor with name '${this.factor_name}' found`);
        //
        //Return the text
        return text;
    }
} 

//This class supports the viewinmg of a sheet in different modes, e.g. edit or
//normal modes 
class mode{
    //
    constructor(public style_sheet:HTMLStyleElement){}
    //
    //Show the matrix body in either normal or edit modes. Technically, this means
    //2 things:-
    //- If the mode selected is normal, look for the normal rule and set it to 
    //flex and edit to none
    //- If the mode selected is edit, look for the edit rule set it to flex and 
    //nomal to none
    execute( mode:'normal'|'edit'):void{
        //
        //Get your css declarations for controlling the view mode
        const edit :CSSStyleDeclaration = this.mode_get_css_style_declaration('.edit');
        const normal :CSSStyleDeclaration = this.mode_get_css_style_declaration('.normal');
        //
        switch(mode){
            
            //If the mode selected is normal...
            case 'normal':
                
                //...use the normal declararion to set its display property to 
                //flex 
                normal.setProperty('display','flex');
                //
                //...use for the edit declararion and set its display property to 
                //none 
                edit.setProperty('display','none');
                break;
            //    
            //If the mode selected is edit
            case 'edit':
                //...use  the edit declaration and set its display property to 
                //flex 
                edit.setProperty('display','flex');
                //
                //...use for the edit declaration set its display property to 
                //none 
                normal.setProperty('display','none');
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
    private mode_get_css_style_declaration(selector_text:'.normal'|'.edit'):CSSStyleDeclaration{
        //
        //Get the style element that controls the view mode
        const style_element: HTMLStyleElement = this.style_sheet;
        //
        //Use the element to get the associated  Css stylesheet
        const css_stylesheet: CSSStyleSheet = style_element.sheet!;
        //
        //Get the css rulelist from the stylesheet
        const css_rulelist: CSSRuleList = css_stylesheet.cssRules;
        //
        //Get the css rule that matches the requested selector text
        const rule: CSSStyleRule = this.mode_get_rule(selector_text,css_rulelist);
        //
        //Get and return the css normal declaration
        const declaration: CSSStyleDeclaration = rule.style; 
        
        return declaration;
    }
    
    //Get the rule (from the given list of rules) whose selector text matches 
    //the given selector
    private mode_get_rule(selector:string, list:CSSRuleList):CSSStyleRule{
        //
        //Convert the list into an array so that we can use the for/of
        //methods for searching the selectpr text
        const list_array:Array<CSSRule> = Array.from(list);
        //
        //For each css style rule....
        for (const rule of list_array ){
            //
            //Cast the general rule to the specific CSSStyle rule
            const rule2= <CSSStyleRule>rule;
            //
            //Compare the selector text with the one we want and if it matches
            //then return the css rule otherwise go to the next rule
            if (rule2.selectorText===selector) return rule2;
         }
        //At this point there is no error that matches the selector text, 
        //so something must have gone wrong, stop this function and report an 
        //error to that effect
         throw `Cannot find a css rule with selector ${selector}`;
    }
}


//A class for modelling crown filters. Extending the library view allows us to 
//access library methods for views  
class filter extends panel{
    //
    //The label element of a filter for the select element
    public label:HTMLLabelElement;
    //
    //The span element used for labeling the selector as well as  holding
    //drag/drop labels
    public span:HTMLSpanElement;
    //
    //The selector for filter values
    public select:HTMLSelectElement;
    //
    constructor(
        //
        //The name and index of the filter factor
        public factor:string, 
        public index:number,
        //
        //The legend that groups all the filter elements
        public legend:HTMLLegendElement,
        //
        sheet:sheet 
    ){
        super(sheet);
        //
        //Use the filters fieldset in the crown section to add the label element
        this.label = this.create_element('label', this.legend);     
        //
        //Set the span element
        this.span = this.create_span_element();
        //
        //Set the select element 
        this.select = this.create_select_element();
    }

    //Create teh span element of a filter and attach drag/drop events
    create_span_element():HTMLSpanElement{
        //
        //Use the label element to add a span tag showing the name
        //of the item
        const span = this.create_element('span', this.label,{textContent:this.factor});
        //
        //Add the ondrag start listener
        span.ondragstart = (ev)=>this.factors_start_drag(ev,'crown', this.index);
        //
        //Add the ondrop over listener and stop its default behaviour because 
        //it interferes with the drop operation. See the MDN reference manual 
        span.ondragover = (ev) => ev.preventDefault();
        //
        //Add the drop listener to the filter span tag to repaint the entire
        //worksheet when a factor is droped on the filter
        span.ondrop = (ev)=>{
            //
            //Update factors, the destination of the drop being in a crown regon
            this.query.update_factors_ondrop(ev, 'crown', this.index); 
            //
            //Refreash the entire sheet
            this.show();
        };
        //
        return span;
    }

    //
    //Creating an ondragstart listener for all thegiven factors index and the source
    //region
    public factors_start_drag(ev:DragEvent, region:region_type, index:number){
        //
        //Set the region type (as the key) to the drag event
        ev.dataTransfer!.setData('region', region);
        //
        //Set the factors index to the drag event
        ev.dataTransfer!.setData('index', String(index));
       
    }
    
    //Create the filter selector element
    create_select_element():HTMLSelectElement{
        //
        //Use the same label element to add the input element whose id is the
        // same as item
        const select:HTMLSelectElement = this.create_element('select', this.label, {id:this.factor});
        //
        //Add the onchange event listener to repaint the entire matrix 
        //based on the change 
        select.onchange = ()=>{
            //
            //Repaint all the filters in the crown
            this.sheet.crown.repaint_filters();
            //
            //If the option value is not found, then clear body and abort the selection
            if (this.sheet.crown.paginator.selectedIndex===-1) {
                //
                //Clear the body
                this.sheet.matrix.body.element.innerHTML = '';
                //
                //Show the restore button
                this.sheet.crown.restore_button.hidden = false;
                //
                //Abort the selection 
                return;
            };
            //
            //Otherwise, refresh the entire sheet (without repainting the crown)
            this.sheet.re_show();
        }
        //
        return select
        
    }


    //Fill the given selector with options. The options are the levels associated
    //with the given factor
    show():void{
        //
        //Check thet tahe levels are set before using them
        if (this.query.levels===undefined) throw new schema.mutall_error('Levels are not set');
        //
        //Add the filter options
        //For each factor level...
        for (const value of this.query.levels[this.factor]!){
            //
            //Create the option element for the selector
            this.create_element(
                //
                //The name of the element
                'option',
                //
                //Add the option to the selector
                this.select,
                //
                {
                    //
                    //Set Option value to the item selected 
                    value: String(value),
                    //
                    //Set the text content of the option to the result from the sql
                    textContent: String(value)
                }    
            )
        }
    }
} 

