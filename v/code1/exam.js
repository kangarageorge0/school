//
import { page } from "../../../outlook/v/code/view.js";
//
import * as io from "../../../schema/v/code/io.js";
//Import server.
import * as server from "../../../schema/v/code/server.js";
//Resolve reference to the sheet class
import * as query from "../../../school/v/code/query.js";
//
import * as sheet from "../../../school/v/code/sheet.js";
//
import * as metavisuo from "../../../metavisuo_23/v/code/metavisuo.js";
//View the exemresults
export class exam extends page {
    //
    sheet;
    //
    //class constructor
    constructor() {
        super();
    }
    //Show the exam results
    async show_panels() {
        //
        //Get the base query customised for exam results
        const basesql = await server.exec('path', ['/school/v/queries/ranking.sql', true], 'get_file_contents', []);
        //
        //Define the shape of the crosstab query
        //
        //Define the desired factor structure
        const factors = {
            crown: ['measurement', 'school', 'year', 'class', 'exam', 'date'],
            crest: ['student', 'stream'],
            crumb: ['subject']
        };
        //The measurement levels and their io types
        //        const measurements: query.measurements = new Map([
        //            ['value', 'number'], 
        //            ['percent', 'read_only'], 
        //            ['expectation', 'read_only']
        //        ]);
        const measurements = new Map([
            ['value', { io_type: 'number' }],
            ['percent', { io_type: 'read_only' }],
            ['expectation', { io_type: 'read_only', colored: true }]
        ]);
        //
        //One margin summary, totals
        const summaries = { right: ['sum', 'count', 'avg'], bottom: ['sum', 'count', 'avg'] };
        //
        //Now define the shape
        const shape = { factors, measurements, summaries };
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
    async refresh() {
        //
        //Set the sheets query summaries (from the html)
        this.sheet.query.summaries = this.sheet.read_summary();
        //
        //Re-show the sheet
        await this.sheet.show();
    }
    //
    //Save the current changes to the database
    //We are going to use the questionnaire to save the data to the database
    async save() {
        //
        //Collect the changes as layouts
        const layouts = [...this.collect_changes()];
        //
        //Create the questionnaire using the school db
        //Use the most common methode to load the database, result is ok or error
        const results = await server.exec("questionnaire", //the name of the PHP class to use
        ["school"], //constructor arguments
        "load_common", //method to run
        [layouts] //method arguments
        );
        //
        //Report the result
        alert(results);
    }
    //
    //Collect the changes made by checking the value that are different from the
    // previous ones, use an onchange to get the changed values, then create a
    //layout the will use the library to save the changes
    *collect_changes() {
        //
        //Get the tds (from the body/crumb section) that have been modified
        //assuming that an event listener has been attached to a td that is 
        //being changed. Such a td will be marked as edited
        const tds = Array.from(this.document.querySelectorAll('.edited'));
        //
        //Create the layouts from the tds
        for (const td of tds)
            yield* this.collect_layouts(td);
        99;
    }
    //Collect the 2 layouts of associated with a td in the body/crumb section
    *collect_layouts(td) {
        //
        //Get value of the td via its io
        const value = io.io.get_io(td).value;
        //
        //Get the primary key
        const pk = this.get_pk();
        //
        //Collect the score.value layout
        yield [value, 'score', 'value'];
        //
        //Collect the score paimaru key layout
        yield [pk, 'score', 'score'];
    }
    //
    //Get the primary key. This will be gotten from the sql where  we have to
    //add a column that gets the primary key and then save it so that we can
    //easily access it
    get_pk() {
        //
        //
    }
    //
    //We are using the sheetJs library to get the worksheets and load the data
    async load_excel_data() {
        //
        //Get the excel file to load
        const file = this.get_xl_file();
        //
        //Get the worksheet to load
        const worksheet = this.get_worksheet(file);
        //
        //Get the named range to load the data
        const range = this.get_range(worksheet);
        //
        //Read the data to load as layouts
        const layouts = this.get_xl_data(range);
        //
        //Create the questionnaire using the school db
        //Use the most common methode to load the database, result is ok or error
        const results = await server.exec("questionnaire", //the name of the PHP class to use
        ["school"], //constructor arguments
        "load_common", //method to run
        [layouts] //method arguments
        );
        //
        //Report the result
        alert(results);
    }
    //
    //Show database using metavisuo
    metavisuo() {
        //
        //Get the matrix body and set it as empty
        const sheet = this.get_element('sheet');
        sheet.innerHTML = '';
        //
        //
        const Metavisuo = new metavisuo.metavisuo();
        Metavisuo.show_panels();
    }
    //
    //Create an empty worksheet for all the available classes when a new exam 
    //is done, so we add the new exam to the database and a new date, then we do
    // a query to get all the factors plus the added date and exam and it will
    //return a matrix with an empty value because the data will not be there
    async create_empty_worksheet() {
        //
        //Create crown
        this.sheet.crown.show();
        //
        //Clear the matrix so as to create a new empty one
        this.sheet.matrix.clear();
        //
        //Show the header which is the same as previous
        this.sheet.matrix.header.show();
        //
        //Then we create an empty matrix
        //First get the data
        //const data = this.sheet!.matrix.body.get_data();
        //
        //
        //Use the sheet's query to get the body data
        const data = await this.sheet.matrix.body.get_data();
        //
        //Create the empty table by adding as many rows (to the body element) 
        //as there are data rows
        data.forEach((row) => this.sheet.matrix.body.create_empty_row(row));
    }
}
