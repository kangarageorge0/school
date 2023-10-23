//
import {page} from "../../../outlook/v/code/view.js"
//
import * as io from "../../../schema/v/code/io.js";
//Import server.
import * as server from "../../../schema/v/code/server.js";

//Resolve reference to the sheet class
import * as query from "../../../school/v/code/query.js";
//
import * as sheet from "../../../school/v/code/sheet.js";
//Resolve references to a database
import * as schema from "../../../schema/v/code/schema.js";
//
//import * as metavisuo from "../../../metavisuo_23/v/code/metavisuo.js"
//
import * as questionnaire from "../../../schema/v/code/questionnaire.js";
//
//import * as XLSX from 'xlsx';

//View the exemresults
export class exam extends page{
    //
   public sheet?:sheet.sheet;
    //
    //class constructor
    constructor(){
        super();
    }

    //Show the exam results
    public async show_panels(): Promise<void>{
       //
        //Get the base query customised for exam results
        const basesql= await server.exec(
            'path',
            ['/school/v/queries/ranking.sql', true],
            'get_file_contents',
            []
        );
        //
        //Define the starting shape of the crosstab query
        //
        //Define the desired factor structure
        const factors:query.factors= {
            crown:['school', 'year', 'class', 'exam', 'date'],
            crest:['student','stream'],
            crumb:['measurement','subject']
        };
        //
        //Define the measurement levels and their io types
        const measurements:query.measurements = new Map([
            ['value', { io_type: 'number'}],
            ['percent', { io_type: 'read_only'}],
            ['abc', { io_type: 'read_only'}],
            ['expectation', { io_type: 'read_only',colored:true }]
          ]);
        //
        //One margin summary, totals
        const summaries:query.summaries = {right:['sum', 'count','avg'], bottom:['sum', 'count', 'avg']};
        //
        //Now define the shape
        const shape:query.shape = {factors, measurements, summaries};
        //
        //Use the base sql to create the crosstab query
        const Query = new query.crosstab('school', basesql, 'grading', 'percent', shape);
        //
        //Use the query to create a new sheet using the user defined factors and
        //measrements
        this.sheet = new sheet.sheet(Query);
        //
        //Complete the construction by evoking asynchronous proceses
        await this.sheet.initialize();
        //
        //Show the sheet
        await this.sheet.show();
    }
    
    //Refreshing means updating the query summaries and re-howing the the current
    //sheet
    public async refresh():Promise<void>{
        //
        //Set the sheets query summaries (from the html)
        this.sheet!.query.summaries= this.sheet!.read_summary();
        //
        //Re-show the sheet
        await this.sheet!.show();
    }
    //
    //Save the current changes to the database
    //We are going to use the questionnaire to save the data to the database
    public async save():Promise<void>{
        //
        //Collect the changes as layouts
        const layouts:Array<questionnaire.layout> = [...this.collect_changes()];
        //
        //Create the questionnaire using the school db
        //Use the most common methode to load the database, result is ok or error
        const results:'ok'|string = await server.exec(
            "questionnaire",//the name of the PHP class to use
            ["school"],//constructor arguments
            "load_common",//method to run
            [layouts]//method arguments
        );
        //
        //Report the result
        alert(results);
    }
    
    //
    //Collect the changes made by checking the value that are different from the
    // previous ones, use an onchange to get the changed values, then create a
    //layout the will use the library to save the changes
    *collect_changes():Generator<questionnaire.layout>{
        //
        //Get the tds (from the body/crumb section) that have been modified
        //assuming that an event listener has been attached to a td that is 
        //being changed. Such a td will be marked as edited
        const tds: Array<HTMLTableCellElement> = Array.from(this.document.querySelectorAll('.edited'));
        //
        //Create the layouts from the tds
        for(const td of tds) yield *this.collect_layouts(td);99
    }
    
    //Collect the 2 layouts of associated with a td in the body/crumb section
    *collect_layouts(td:HTMLElement):Generator<questionnaire.layout>{
        //
        //Get value of the td via its io
        const value = io.io.get_io(td).value;
        //
        //Get the primary key
        const pk:number =this.get_pk();        
        //
        //Collect the score.value layout
        yield [value, 'score', 'value'];
        //
        //Collect the score paimaru key layout
        yield[pk, 'score', 'score'];
    }
    //
    //Get the primary key. This will be gotten from the sql where  we have to
    //add a column that gets the primary key and then save it so that we can
    //easily access it
    private get_pk():number{
        //
        //
    }
    //
    //We are using the sheetJs library to get the worksheets and load the data
    public async load_excel_data():Promise<void>{
        //
        //Get the excel file to load
        const file:File = this.get_xl_file();
        //
        //Get the worksheet to load
        const worksheet:XLSX.WorkSheet = this.get_worksheet(file);
        //
        //Get the named range to load the data
        const range:XLSX.Range = this.get_range(worksheet);
        //
        //Read the data to load as layouts
        const layouts:Array<questionnaire.layout> = this.get_xl_data(range);
        //
        //Create the questionnaire using the school db
        //Use the most common methode to load the database, result is ok or error
        const results:'ok'|string = await server.exec(
            "questionnaire",//the name of the PHP class to use
            ["school"],//constructor arguments
            "load_common",//method to run
            [layouts]//method arguments
        );
        //
        //Report the result
        alert(results);
    }
    //
    //Show database using metavisuo
    metavisuo(){
        //
        //Get the matrix body and set it as empty
        const sheet: HTMLElement = this.get_element('sheet');
        sheet.innerHTML='';
        //
        //
        const Metavisuo = new metavisuo.metavisuo()
        Metavisuo.show_panels();
    }
    //
    //Create an empty worksheet for all the available classes when a new exam 
    //is done, so we add the new exam to the database and a new date, then we do
    // a query to get all the factors plus the added date and exam and it will
    //return a matrix with an empty value because the data will not be there
    public async create_empty_worksheet():Promise<void>{
        //
        //Create crown
        this.sheet!.crown.show()
        //
        //Clear the matrix so as to create a new empty one
        this.sheet!.matrix.clear();
        //
        //Show the header which is the same as previous
        this.sheet!.matrix.header.show();
        //
        //Then we create an empty matrix
        //First get the data
        //const data = this.sheet!.matrix.body.get_data();
        //
        //
        //Use the sheet's query to get the body data
        const data:Array<schema.fuel>=await this.sheet!.matrix.body.get_data();
        //
        //Create the empty table by adding as many rows (to the body element) 
        //as there are data rows
        data.forEach((row) => this.sheet!.matrix.body.create_empty_row(row));
    }
        
    
}
