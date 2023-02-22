//Import app from the outlook library.
//
//Resolves reference to the asset.products data type
import * as outlook from '../../../outlook/v/code/outlook.js';
//
//Resolves the app than main extends
import * as app from "../../../outlook/v/code/app.js";
//
//Import the test msg class.
import * as msg from "./msg.js"
//
//Resolves the tree and ear classes
import * as tree from "../../../schema/v/code/tree.js";
import * as ear from "../../../schema/v/code/ear.js";
//
//Import server.
import * as server from "../../../schema/v/code/server.js";

//Resolve references to a database
import * as schema from "../../../schema/v/code/schema.js";

//import {initiate_contract} from "./initiate_contract.js";

import * as lib from "../../../schema/v/code/library";

import * as io from "../../../schema/v/code/io.js";


//Fuel is an object that is indexed by any string key
type fuel = {[index:string]:lib.basic_value};

//
export default class main extends app.app {
    //
    //Initialize the main application.
    constructor(config: app.Iconfig) {
        super(config);
    }
    
    //
    //Retuns all the products that are specific to this application. They are
    //used to exapnd those from the base application
    get_products_specific(): Array<outlook.assets.uproduct> {
        return [
          
            {
                title: "Actions",
                id: 'actions',
                solutions: [
                    {
                        title: "View due assignments",
                        id: "view_due_assignments",
                        listener: ["event", () => this.vue_due_assignments()]
                    },
                    {
                        title: "Manage Events",
                        id: "events",
                        listener: ["crud", 'event', ['review'], '+', "mutall_users"]
                    },
                    {
                        title: "Manage Messages",
                        id: "messages",
                        listener: ["crud", 'msg', ['review'], '+', "mutall_users"]
                    },
                    {
                        title: "Create Message",
                        id: "create_msg",
                        listener: ["event", ()=>{this.new_msg()}]
                    },
                    {
                        title: "Row Students",
                        id: "row_students",
                        listener: ["event", async ()=>{
                                //
                                //Create the exam results view, i.e., page;
                                const exam_1 = new row_students(this);
                                //
                                //Display the exam results view 
                                await exam_1.administer();
                            }]
                    },
                    {
                        title: "Row Students Stream",
                        id: "row_students_stream",
                        listener: ["event", async ()=>{
                                //
                                //Create the exam results view, i.e., page;
                                const exam_2 = new row_students_stream(this);
                                //
                                //Display the exam results view 
                                await exam_2.administer();
                            }]
                    },
                    {
                        title: "Page School Students",
                        id: "page_school_students",
                        listener: ["event", async ()=>{
                                //
                                //Create the exam results view, i.e., page;
                                const exam_4 = new page_school_students(this);
                                //
                                //Display the exam results view 
                                await exam_4.administer();
                            }]
                    },
                    {
                        title: "View Form",
                        id: "view_form",
                    listener: ["event", async ()=>{
                            //
                            //Create the exam results view, i.e., page;
                            const form = new view_form(this);
                            //
                            //Display the exam results view 
                            await form.administer();
                        }]
                    }                   
                ]
            },
            
            {
                title: "Manage Hierarchical Data",
                id: 'hierarchies',
                solutions: [
                    {
                        title: "View Directory",
                        id: "view_directory",
                        listener: ["event", async () => await this.view_directory()]
                    },
                    {
                        title: "View XML File",
                        id: "view_xml",
                        listener: ["event", async ()=>await this.view_xml()]
                    },
                    {
                        title: "View Accounts",
                        id: "view_accounts",
                        listener: ["event", async ()=>await this.view_records()]
                    },
                    {
                        title: "View CAQ",
                        id: "view_caq",
                        listener: ["event", async ()=>await this.view_caq()]
                    },
                    {
                        title: "View Products",
                        id: "view_products",
                        listener: ["event", async ()=>await this.view_services()]
                    },
                    {
                        title: "Viirectory",
                        id: "vieirectory",
                        listener: ["event", async () => await this.view_directory()]
                    }
                ]    
            },
            {
                title: "Manage Hierarchical Data",
                id: 'hierarchies',
                solutions: [
                    {
                        title: "View Directory",
                        id: "view_directory",
                        listener: ["event", async () => await this.view_directory()]
                    },
                    {
                        title: "View XML File",
                        id: "view_xml",
                        listener: ["event", async ()=>await this.view_xml()]
                    },
                    {
                        title: "View Accounts",
                        id: "view_accounts",
                        listener: ["event", async ()=>await this.view_records()]
                    },
                    {
                        title: "View CAQ",
                        id: "view_caq",
                        listener: ["event", async ()=>await this.view_caq()]
                    },
                    {
                        title: "View Products",
                        id: "view_products",
                        listener: ["event", async ()=>await this.view_services()]
                    }
                ]
            },
            
          
        ]
     }
    //
    //Allow the user to create a new message and save it in the database.
    async new_msg(): Promise<void> {
        //
        //1. Create a pop that facilitates sending a new message.
        const Msg = new msg.msg(this);
        //
        //Collect all the data from the user.
        const result: msg.Imsg | undefined = await Msg.administer();
        //
        //Check the validity of the data.
        if (result === undefined) return;
        //
        //Use the questionnare in php class to save the data to the database.
        //
    }
    //
    //List all assignments that are due and have not been reported.
    //Ordered by Date. 
    vue_due_assignments(): void {
        alert("This method is not implemented yet.")
    }
    
    //View the root directory using the tree system
    async view_directory():Promise<void>{
        //
        //Formulate the root nolde
        
        //The root directory is named.... 
        const path:string = "d:/mutall_projects";
        //
        //Get root content of the directory; its not a file 
        const root = new tree.directory.root(path, false);
        //
        //Create a new explorer, using this main page as the mother. Initially,
        //open the /chama folder 
        const Explorer = new tree.explorer(root, this, ['/','chama', 'v','code']);
        //
        //Do the administration and ignore the selection
        await Explorer.administer();

    }
    
    //View an xml document
    async view_xml():Promise<void>{
        //
        //Formulate the (xml) root node
        
        //Get the filename
        const filename:string= "d:/mutall_projects/tracker/v/test/log.xml";
        //
        //Read the file content
        const xml:string = await server.exec(
            'path',
            [filename, true],
            'get_file_contents',
            []
        );
        //
        //Get root content of the xml document 
        const root = new tree.xml.root(xml);
        //
        //Create a new explorer, using this main page as the mother. Display
        //the attributes in the tree view 
        const Explorer = new tree.explorer(root, this);
        //
        //Do the administration and ignore the selection
        await Explorer.administer();

    }
    
    //View records from a hierarchical table in a database
    async view_records():Promise<void>{
        //
        //Formulate the (record) root node
        
        //Formulate the subject
        const subject:tree.subject = {
            dbname:'mutall_users',
            ename:'account'
        };
        //
        //Get root content of a record. Use the 'name' field to access the
        //tagnames. Assume that the process is recursive
        const root = new tree.record.root(subject, 'name', true);
        //
        //Create a new explorer, using this main page as the mother. 
        const Explorer = new tree.explorer(root, this);
        //
        //Do the administration and ignore the selection
        await Explorer.administer();
    }
    
    //View related (non-hierarchical) records from a database based
    //on the mutall-compliant E-A-R model, to support the CAQ project
    async view_caq():Promise<void>{
        //
        //Formulate the root node
        //
        //Define the starting entity name for the  explorer
        const ename = 'school';
        
        //Get the named entity from the current 
        const entity = this.dbase!.entities[ename];
        //
        //Its an error if the entity id not defined
        if (entity===undefined)
            throw new schema.mutall_error(`Entity '${ename}' cannot be found in database ${this.dbase!.name}`);
        //
        //Create the root node
        const root = new ear.root(entity);
        //
        //Create a new explorer, using this main page as the mother.
        const Explorer = new tree.explorer(root, this);
        //
        //Do the administration and ignore the selection
        await Explorer.administer();
    }

    //For saving the last service selected in this application
    public selection?:tree.service.content;

    //View mutall products in a using a tree view
    async view_services(){
        //
        //Convert the this products into tree fashion
        const products:tree.service.products = Array.from(this.products.values());
        //
        //Create the root product node with a defined selection. Do we need
        //to initialize it or not? Perhaps we do to complete its definition 
        //before use. Consider re-using teh last slection if any
        const root = new tree.service.content(
            //
            //The root node is named services
            "services",
            //
            //The root node has no properties
            {},
            //
            //The root node corresponds to the un-indexed (list of) products 
            products,
            //
            //Consider the root node as a product
            true,
            //
            //Te root node has no listener
            undefined,
            //
            //
            //The parent of a root node is undefined
            undefined,
            
        );
        //
        //Do the exploration, and return the new selection
        const Explorer = new tree.explorer(
            //
            //The root product
            root, 
            //
            //The mother page for explorer
            this, 
            //
            //The menu that comes to view initially
            ['hierarchies','view_products']
        );
        //
        //Perform the administraton
        const selection = await Explorer.administer();
        //
        //Save the selection for the next time round, if adminsitrationwas not 
        //aborted 
        if (selection!==undefined) this.selection = <tree.service.content>selection;    

    }

    
}
    //display the registration form
class view_form extends outlook.baby<void>{
    //
    //class constructor
    constructor(mother:main){
        super(mother,'./interns_reg-form copy.html');
    }

    async check(): Promise<boolean> {
        return true;
    }
    async get_result(): Promise<void> {
    }

    //
    //Modify the form template so that the body has the data we
    //are interested in. 
    public async show_panels(): Promise<void>{
    }

}

//This represents one row of page 
type page_selection = fuel;

//Jpint is really not a factpr as it were, but is a field of page selector
type factor= 'school'|'year'|'class'|'exam'|'stream'|'student'|'date'|'joint'|'subject';
//
//Draggable factors
type draggable = {
    filter : Array<factor>,
    crumblet : Array<factor>,
    crestlet : Array <factor>
};
type draggable_key = keyof draggable;

//Tabulate exam results .......View exam results in a given sitting
abstract class exam_results extends outlook.baby<void>{
    
    //
    //The the table we want to fill with the exam results (when we load the page)
    public matrix?:HTMLTableElement;
    //
    //The data used for filling the tables header is set when we load the page
    public subject_data?:Array<{name:string, id:string}>;
    //
    //The data to used to fill the tables body is set when we load the page
    public body_data?:Array<fuel>;   
     //
    //The row that determines the horizontal size of a tables
    public header?:HTMLTableRowElement;
    
    //The page data
    public paginator_data?:Array<page_selection>;
    //
    public paginator?:HTMLSelectElement;
    //
    //
    public draggable:draggable;
    //
    //
    //The base query
    public base_query?:string;
    //
    //Restore button
    public restore? : HTMLButtonElement;
    //
    //The last valid selected index of the paginator
    public last_index? :number; 
    
    //Filters are an array of selector elements indxed by a factor
    public filters:{[index:string]:HTMLSelectElement}={};
    
    //Tabulate exem results using a set of page and row factors
    constructor(mother:main,draggable:draggable){
        super(mother, "./table.html");
        this.draggable = draggable;
    }
    
    async check(): Promise<boolean> {
        return true;
    }
    async get_result(): Promise<void> {
    }
    
    
    public async show_panels() : Promise<void>{
        //
        await this.sheet_show();
    }
    
    //Create the table that the results will be populated
    public async sheet_show(): Promise<void>{
        //
        //Clear the sheet
        this.sheet_clear();
        //
        //Set the table element
        this.matrix =  <HTMLTableElement>this.get_element('matrix');
        //
        //Set the paginator element
        this.paginator = <HTMLSelectElement>this.get_element('paginator');
        //
        //Se the overall base query (its the shared by all oue other queries)
        this.base_query = await this.get_base_query();        
        //
        //Create the paginator and the filters in the crown
        await this.crown_show();
        //
        //Ensure that the first item on the page selector is selected
        this.paginator.selectedIndex = 0;
        //
        //Show table
        await this.matrix_show();
       
    }
    //
    // Sheet clear
    sheet_clear(){
        //
        //Remove options from the paginator
        this.get_element('paginator').innerText="";
        //
        //Clear the filter
        this.get_element('filters').innerHTML="";
        //
        //Clear the header
        this.get_element('header').innerHTML="";
        //
        //clear the body
        this.get_element('body').innerHTML="";
    }
    
    //Fill in the page filters with results from the queries executing
    //the factors
    async filter_fill_options():Promise <void>{
        //
        //Get the base quety
        const base = 
        `
            with page as (
                select
                   school.id as school,
                   year.value as year,
                   class.name as class,
                   exam.name as exam,
                   sitting.date as date,
                   stream.id as stream,
                   student.name as student,
                   subject.name as subject
               from score 
                   inner join candidate on score.candidate=candidate.candidate
                   inner join progress on candidate.progress =progress .progress
                   inner join student on progress.student = student.student
                   inner join year on progress.year = year.year
                   inner join stream on year.stream = stream.stream
                   inner join class on stream.class = class.class
                   inner join school on class.school = school.school
                   inner join performance on score.performance=performance.performance
                   inner join subject on performance.subject=subject.subject
                   inner join sitting on performance.sitting=sitting.sitting
                   inner join exam on sitting.exam=exam.exam
               )`;
               
        //
        //There as many filter selectors as there are filter factors 
        //For each page factor...
        for (const factor of this.draggable.filter){
            //
            //Get the selector that corresponds to this factor
            const filter:HTMLSelectElement=this.filters[factor];
            //
            //Compile the sql for the selector
            const sql = 
               `
               ${base}
               select distinct
                   ${factor} as fname
               from page;
               `;
            //
            //Execute the sql to get the selectot data
            const data:Array<{fname:lib.basic_value}> = await server.exec(
            'database',
            ['school_2', false], 
            'get_sql_data',
            [sql]
            );
            //
            //Use the data to fill the filter options
            //
            //For each data row...
            for(const row of data){
                //
                //Create the option element for the selector
                this.create_element(
                    //
                    //The name of the element
                    'option',
                    //
                    //Add the option to the selector
                    filter,
                    //
                    {
                        //
                        //Set Option value to the item selected 
                        value: String(row.fname),
                        //
                        //Set the text content of the option to the result from the sql
                        textContent: String(row.fname)
                    }    
                )
            }
        }
     }
    
    
    //
    //Reading the base query from the sqls folder
    async get_base_query():Promise <string>{
        //
        //Get the string query from the sqls folder that is in the ranking.sql
        const sql:string = `
            with
    #
    #PRESENT THE RAW VALUES NEEDED FOR CALCULATING THE TOTAL
    #
    #Getting the percentages on each subject
    percent as (
        select
            school.id as school,
            year.value as year,
            class.name as class,
            exam.name as exam,
            sitting.date as date,
            stream.id as stream,
            student.name as student,
            subject.id as subject,
            subject.name as subject_name,
            score.value as value,
            round(score.value/performance.out_of*100) as percent
        from score 
            inner join candidate on score.candidate=candidate.candidate
            inner join progress on candidate.progress =progress .progress
            inner join student on progress.student = student.student
            inner join year on progress.year = year.year
            inner join stream on year.stream = stream.stream
            inner join class on stream.class = class.class
            inner join school on class.school = school.school
            inner join performance on score.performance=performance.performance
            inner join subject on performance.subject=subject.subject
            inner join sitting on performance.sitting=sitting.sitting
            inner join exam on sitting.exam=exam.exam
        order by school,year,class,exam,date,stream,student,subject
    ),
    # 
    #Grading all the percent scores
    grading as(
        select percent.*,
            #
            #Add grading using the Expectation system
            case 
                when percent >=90 and percent <= 100 then 'E.E'
                when percent >=50 and percent < 90 then 'M.E'
                when percent >=30 and percent < 50 then 'A.E'
                else 'B.E'
            end as expectation,
            #
            #Add grading using the Abc system
            case 
                when percent >=80 and percent <= 100 then 'A'
                when percent >=75 and percent < 80 then 'A-'
                when percent >=71 and percent < 75 then 'B+'
                when percent >=65 and percent < 71 then 'B'
                when percent >=61 and percent < 65 then 'B-'
                when percent >=55 and percent < 61 then 'C+'
                when percent >=51 and percent < 55 then 'C'
                when percent >=45 and percent < 51 then 'C-'
                when percent >=41 and percent < 45 then 'D+'
                when percent >=35 and percent < 41 then 'D'
                when percent >=31 and percent < 35 then 'D-'
                else 'E'
            end as abc                      
        from percent
    ),
    #
    #Collect the raw values as a json object
    raw_values as (
        select
            #
            #Select all the fields from percent table
            grading.*,
            #
            #Compile the object using 4 keys, viz., subject, score, percent and
            #grading(using the expectation format)
            json_object('subject',subject, 'value',value, 'percent',percent,'grade',expectation) as raw_value
        from grading
    ),
    #
    #Get the total summary of all the scores for each student in each sitting
    #including the raw values
    total as (
         select 
            school,
            year,
            class,
            exam,
            stream,
            date,
            student,
            #
            #Collect all the raw values into an array
            json_arrayagg(raw_value) as raw_values,
            #
            #Sum of all the percentages for a given sitting
            sum(percent) as total
        from raw_values
        group by school,year,class,exam,stream, date,student
    ),
    #
    #Ranking the students within a sitting
    rank_students as (
        select total.*,
            rank() OVER w as ranking,

            #
            #NOT GIVING OUT THE CORRECT EXPECTED VALUES WHEN THERE IS ORDERING
            count(*) over (partition BY  ${this.draggable.filter.join(',')}) as count
        from total
        window w as (partition BY  ${this.draggable.filter.join(',')} order by total desc)
    ),
    ######################################-
    #
    #CALCULATING THE MEAN SCORE FOR EACH SUBJECT
    #
    #Getting the mean standard score for each subject
    mean as (
         select
            school,
            year,
            class,
            exam,
            stream,
            date,
            subject,
            sum(percent)/count(percent) as mean,
            count(*)
        from percent
        group by school,year,class,exam,stream, date,subject
         
    ),
    #
    #Rank the subjects within a sitting
    rank_subjects as(
        select mean.*,mean,
            rank() OVER w as ranks
        from mean
        window w as (partition BY school,year,class,exam,stream, date order by mean desc)
    )
    
        `;
        //
        //Return the sql string
        return sql;
    }
    
    
            
    //
    //Show the items on the page section. Here is an example of an item
    //in terms of HTML tags
    /*
        <label>
            <span>School</span>
            <select />
        </label>
     */
    async crown_show():Promise<void>{
        //
        //Get the crown section
        const crown:HTMLElement = this.get_element('crown');
        //
        //Fill the paginator selector and add the onchange event listener to refresh
        //the page
        await this.paginator_show();
        //
        //Create the filters
        //
        //Thers are as many filters as there are filter factors
        const items: Array<factor> = this.draggable.filter;
        //
        //Get the filters section
        const filters:HTMLElement = this.get_element('filters');
        //
        //Use the fieldset to create a legend
        //const legend :HTMLElement = this.create_element('legend',filters,{textContent:"Filters"});
        //
        //For each crown factpr create a filter
        items.forEach((item,index)=>this.filter_show(item, index, filters))
        //
        //Creating a button for restoring
        this.restore = this.create_element('button',filters,{
            textContent : "Restore Last Page with Data",
            hidden:true
        });
        //
        //Add the restore listeer to the button
        this.restore.onclick= ()=>this.matrix_restore();
        //
        //Fill the filter selectors with optionds
        await this.filter_fill_options();
        
    }
    
    //Create a filter as a labeled select element
    filter_show(item:string,index:number, filters:HTMLElement):void{
        //
        //Use the page section to add the label element
        const label:HTMLElement = this.create_element('label', filters);
        
        //
        //Use the label element to add a span tag showing the name
        //of the item
        const span = this.create_element('span',label,{textContent:item, draggable:true} );
        //
        //Add the ondrag start listener
        span.ondragstart = (ev)=>this.draggable_start_drag(ev,'filter',index);
        //
        //Add the ondrop over listener and stop its default behaviour because 
        //it interferes with the drop operation. See the MDN reference manual 
        span.ondragover = (ev) => ev.preventDefault();
        //
        //Add the drop events
        span.ondrop = (ev)=>this.draggable_drop_drag(ev,'filter',index);
        //
        //Use the same label element to add the input element whose id is the same as
        //item
        const filter:HTMLSelectElement = this.create_element('select', label, {id:item});
        //
        //Add the onchange event listener to the filter
        filter.onchange = ()=>this.matrix_onfilter_repaint()
        //
        this.filters[item] = filter;
    }
    
    //
    //Creating an ondragstart listener for all the draggables
    draggable_start_drag(ev:DragEvent,key:draggable_key,index:number){
        
        //
        ev.dataTransfer!.setData('key', key);
        ev.dataTransfer!.setData('index', String(index));
       
    }
    //
    //Creating an ondragdrop listener for all the draggables which works as follows:-
    draggable_drop_drag(ev:DragEvent,dest_key:draggable_key,dest_index:number){
        //
        //Determine the source of the data
        const src_key:draggable_key = <draggable_key>ev.dataTransfer!.getData('key');
        const src_index = +ev.dataTransfer!.getData('index');
        //
        //From the source factors, remove one element at the given source index
        const Sources:Array<factor> = this.draggable[src_key].splice(src_index, 1);
        //
        //To the destinatiion factors, add the rempved sources at the destination index
        this.draggable[dest_key].splice(dest_index, 0, ...Sources);
        //
        //Refreash the entire sheet
        this.sheet_show();
    }
    
    matrix_restore():void{
        //
        //Get the paginator and set its index to the last index
        this.paginator!.selectedIndex = this.last_index!;
        //
        //Refresh the matrix
        this.matrix_show();
        //
        //Hide the restore button once the page is restored
        this.restore!.hidden = true;
    }
    
    
    //
    //Repaint the table using the current settings of the all the page filters
    matrix_onfilter_repaint():void{
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
        //2.1 Get the paginator (selector)
        const paginator:HTMLSelectElement = <HTMLSelectElement>this.get_element('paginator');
        //
        //2.2 Set the paginator value to the new option value
        paginator.value = value;
        //
        //If the option value is not found, then clear body then abort the selection
        if (paginator.selectedIndex===-1) {
            //
            //Clear the body
            this.matrix_clear();
            //
            //Show the respore button
            this.restore!.hidden = false;
            //
            //Abort the selection 
            return;
        };
        //
        //Otherwise, refresh the table
        this.matrix_show();
    }
    
    //Clear the body incase the option value is not found
    matrix_clear(){
        //
        //Empty the table header
        this.matrix!.tHead!.innerHTML="";
        //
        //Then empty the body
        this.matrix!.tBodies[0].innerHTML = "";
        
        
    }
    //This returns the value of the identfield selector
    get_item_value(id:string):string{
        //
        //Get the identified selector
        const selector: HTMLSelectElement = <HTMLSelectElement>this.get_element(id);
        //
        //Get its value
        const value: string = selector.value;
        //
        //Return the value
        return value;
    }
    //
    //Creating an object with an array of factors and their values
    get_item_data():fuel{
        //
        //Start with an empty fuel
        const result:fuel = {};
        //
        //For each filter facor....
        for (const factor of this.draggable.filter){
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
    
    //Display the table that matches the current sitting number
    async matrix_show():Promise<void>{ 
        //
        //Save the current selection index for future reference
        this.last_index = this.paginator!.selectedIndex;
        //
        //Set the subject data using the subject sql.
        this.subject_data  = await this.get_subject_data();
        //
        //Set the filter values located in the page section
        this.filters_set_value();
        //
        //Show the row and the column headers
        this.header_show();
        //
        //Show the table's body
        this.body_show();
        //
        //When we have the footer, e.g., mean score values, it will be shown here
        //this.footer_show();
    }
    
    
    //
    //Get the data required for painting the page selector
    async paginator_get_data():Promise<Array<page_selection>>{
        //
        //There is no [aginator data if there are no flters
        if (this.draggable.filter.length===0) return [];
        //
        //Compile the sql that exracts the page selector
        const sql=`
            ${this.base_query}
            select distinct
                ${this.draggable.filter.join(',')},
                concat_ws('/', ${this.draggable.filter.join(',')} ) as joint 
            from
                rank_students`; 
        //
        //Execute the sql to retrieve the actual data
        let data= <Array<page_selection>>await server.exec(
            'database',
            ['school_2', false], 
            'get_sql_data',
            [sql]
        );
        //
        //Return the extracted data
        return data;
       
    } 
    
    //Fill the page selector options with results from out executing the page
    //selector query and add the onchange event listener to refresh the page
    async paginator_show():Promise <void>{ 
        //
        //Get the crown data
        this.paginator_data = await this.paginator_get_data();    
        //
        //Get the page selector element
        const paginator = <HTMLSelectElement>this.get_element('paginator');
        //
        //Use the results to add options to the selector
        this.paginator_fill_options();
        //
        //Add the onchange event listener
        paginator.onchange = async()=>await this.matrix_show();
    }
    
   
     
    //Set the filter values to match the current selection
    async filters_set_value():Promise<void>{
       //
        //Get the current selection index from the paginator
        const current_selection:number = this.paginator!.selectedIndex;
        //
        //Use the selection index to get the corresponding page data row
        const row:page_selection = this.paginator_data![current_selection];
        //
        //For each filter item....
        for (const item of this.draggable.filter){
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
    
    
    //
    //Use the the given data  to add options to the given selector
    //Example of a selector filled with options
    /*
        <option value="school='kaps' and year='2014' and class='8' and stream='R'... etc">KAPS/2019/8/R</option>
        <option value="school='aps' and year='2019' and...">KAPS/2019/7/Y</option>
     */
    paginator_fill_options():void{
        //
        //For each data element...
        for (const page of this.paginator_data!){
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
        }
    }
    
    //It returns the condition for selecting one page. E.g.,
    //school='kaps' and year='2014' and class='8' and stream='R'... etc
    //The page data looks like:-
    //{school:'kaps', year:2014, class:8...}
   get_page_condition(page:fuel):string{
        //
        //Start with an empty result list of factor/value pairs
        const result:Array<factor>=[];
        //
        //For each filter factor...
        for(const key of this.draggable.filter!){
            //
            //Get the factor/value pair, formated in the way we would like it 
            //for the condition e.g. year='2014'
            const pair = key + '=' + `'`+page[key]+`'`;
            //
            //Add the factor/value pair into a result list
            result.push(<factor>pair);
        }
        //Use the result list to join the factor/value pairs using the 
        //'and' oparator
        return result.join(' and ');
                
    }
    
    //Get the subject data using the subject sql.
    async get_subject_data():Promise<Array<{name:string, id:string}>>{
        //
        //Compile the sql that extracts the subject query
        const sql=`
            ${this.base_query}
            select distinct
                subject as id,
                subject_name as name
            from
                percent
            where ${this.paginator!.value}`;
        //
        //Execute the sql to the the data
        let data:Array<{name:string, id:string}> = await server.exec(
            'database',
            ['school_2', false], 
            'get_sql_data',
            [sql]
        );
        //
        //Return the data
        return data;
    }
    
    //Get the body data using the ranking sql.
    async body_get_data():Promise <Array<fuel>>{
        //
        //Complie the sql that extracts the body query
        const sql=
        `
            ${this.base_query}
            select
                rank_students.*
            from
                rank_students
            where
                ${this.paginator!.value}`;
         
        //Execute the sql to retrieve the actual data
        let data= await server.exec(
            'database',
            ['school_2', false], 
            'get_sql_data',
            [sql]
        );
        //
        //Return the extracted data
        return data;
    }
    
    
    
    //Use the subject data to show the header.
    header_show():void{
        //
        //lear the table header
        this.get_element("header").innerHTML="";
        //
        //Show the top row(3 columns, viz., id, raw_values, summary)
        this.partition();
        //
        //Show mid-row (student, subj1, subj2, ...., subjN, total, rank
        this.crumblets();
        //
        //Show the score columns comprising of value/grade/percent triples
        this.measurement_show();
    }
    //4. Use the body data to show the body.
    async body_show():Promise<void>{
        //
        //Get the body section and clear it
        this.get_element('body').innerHTML="";
        //
        //Set the body data using the ranking sql.
        this.body_data = await this.body_get_data();
        //
        //Created the empty table matrix
        this.body_create_empty();
        //
        //Populate the matrix with the body values
        this.body_fill();
    }
    
    //
    //Show the top row. It has 3 columns, viz., id, raw_values, summary. The id
    //column has a span of 1. The raw values column has a span of number of 3
    //times subjects and the summary has a span of 2. The titles for these 3 
    //sections are 'id', 'raw values' and summary, respectively  
    partition():void{
        //
        //Create the (top) section row
        const tr:HTMLTableRowElement =this.matrix!.tHead!.insertRow();
        //
        //1. Add the id column to the row with a span of the same size as
        //the number of row factors, and show 'id'
        this.create_element('th', tr, {colSpan:this.draggable.crestlet.length, textContent:'Id'});       
        //
        //Add the raw_values column to the row. Note:The column span for the 
        //raw_values cell3 times the number of subjects
        this.create_element('th', tr, {colSpan:this.subject_data!.length*3, textContent:'Score Values'});       
        // 
        //Add the summary column to the row
        this.create_element('th', tr, {colSpan:2, textContent:'Summary'});       
    } 
       
    //show the subject row that has student row with 1 span, subjects area which 
    //should have as many columns as there are subjects and each column should have
    //3 spans and summary row with 2 spans
    crumblets():void{
        //
        //Create the subject row
        const tr: HTMLTableRowElement = this.matrix!.tHead!.insertRow();
        //
        //Show in the row, the row header column, with a span of teh same size as
        //the number of wrow factors
        this.create_element('th', tr, {colSpan: this.draggable.crestlet.length});
        //
        //Show as many columns as there are subjects, all with a span of 3 and
        //with subjecy as the text content
        this.show_subject_cells(tr);
        //
        //Show in the row, the last empty column with a span of 2 
        this.create_element('th', tr, {colSpan:2});
    }
    
    //Show as many columns as there are subjects, all with a span of 3 and
    //with subject as the text content
    show_subject_cells(tr:HTMLTableRowElement):void{
        //
        //For each subject...
         for(const{name} of this.subject_data!){
            //
             //Create a cell with 3 columns and the given name
            this.create_element('th', tr, {colSpan:3, textContent:name});
         }
    }
    
    //Created the empty table matrix based on the columns of the header row and 
    //throws in the table's body
    body_create_empty():void{
        //
        //For each body row...
        for(let row=0; row<this.body_data!.length; row++){
            //
            //Create a new row
            const tr = this.matrix!.tBodies[0].insertRow();
            //
            //For each header column...
            for(let col=0; col<this.header!.cells.length; col++ ){
                //
                //The first column is a row header cell, th
                if (col===0) {
                    
                    const td:HTMLTableCellElement=this.create_element('th', tr);
                    //
                    //Define an anchpr for io
                    const anchor: io.anchor = {element:td, page:this};
                    //
                    //Attach an input io to the td
                    new io.input('text',anchor);
                }    
                //
                //The rest are normal (td) cells
                else {
                    const td:HTMLTableCellElement = this.create_element('td', tr);
                    //
                    //Define an anchpr for io
                    const anchor: io.anchor = {element:td, page:this};
                    //
                    //Attach an input io to the td
                    new io.input('text',anchor);
                };
                
            }
        }
    }
    
    //Show the header row that determines the horizontal dimension of the table
    measurement_show():void{
        //
        //Create the score type row
        this.header = this.matrix!.tHead!.insertRow(); 
        //
        //Show the crestles
        this.draggable.crestlet.forEach((item, index) => this.crestlet_show(item,index));
        //
        //Show as many columns as the product of subjects and score types
        this.show_score_cells();
        //
        //Show the total header
        this.create_element('th', this.header, {id:'total', textContent:'Total'});
        //
        //Show the rank header
        this.create_element('th', this.header, {id:'ranking', textContent:'Rank'});
    }
    
    crestlet_show(item:string,index:number){
        //
        //Create a crestlet and make it draggable 
        const crestlet = this.create_element('th', this.header, {
            id:item, 
            textContent:item,
            draggable:true
        });
        //
        //Add the drop events
        crestlet.ondragstart = (ev)=>this.draggable_start_drag(ev,'crestlet',index);
        //
        //Add the ondropover listener on crestlet_factors; the only reason is 
        //to stop the default behaviour which interferes with the drop operation
        crestlet.ondragover = (ev) => ev.preventDefault();
        //
        //Add the ondrop listener on crestlet_factors
        crestlet.ondrop = (ev)=>this.draggable_drop_drag(ev,'crestlet',index);
    }
    //Construct and display the cells in the score row, the 3rd row of our table
    show_score_cells(){
        //
        //For each subject....
        for(const subject of this.subject_data!){
            //
            //For each score type...
            for (const name of ['value', 'percent', 'grade']){
                //
                //Formulate the id of the cell
                const id = `${subject.id}_${name}`;
                //
                //Create a header cell, with the given name and id 
                this.create_element('th', this.header, {id:id, textContent:name});
            }
        }
    }
    
    //Fill the empty table with the available data for table's body
    body_fill(){
        //
        //For each body row...
        for(let row=0; row<this.body_data!.length; row++){
            //
            //Get the referenced table body row
            const tr = this.matrix!.tBodies[0].rows[row];
            //
            //Destructure the body row
            const row_data = this.body_data![row];
            //
            //Set the row header cells
            for (const rh of this.draggable.crestlet){
                this.td_set(rh, row_data[rh], tr);
            }
            //
            //Set the cells for score type names
            this.set_score_cells(String(row_data.raw_values), tr);
            //
            //Set the total cell
            this.td_set('total', row_data.total, tr);
            //
            //Set the ranking cell
            this.td_set('ranking', row_data.ranking, tr);
        }
    }
    
    //Lookup the identified header cell and set it the matching body cell
    //to the given value
    td_set(id:string, value:lib.basic_value, tr:HTMLTableRowElement):void{
        //
        //Get the identified header cell
        const td_header = this.get_element(id) as HTMLTableCellElement;
        //
        //Get the matching cell from the body row
        const td_body = tr.cells[td_header.cellIndex];
        //
        //Get the ion corresponding to the td
        const Io = < io.input>io.io.get_io(td_body);
        //
        //Set its value to the given one
        Io.value=value;
        
    }
    
    
    //Set the body cells that are part of the score values
    set_score_cells(raw_values:string, tr:HTMLTableRowElement):void{
        //
        //Convert the string to an array of subject values
        const subjects:Array<{subject:string, value:number, percent:number, grade:string}>
            = JSON.parse(raw_values);
       //
       //For each subject....
       for(const subject of subjects){
           //
           //For each named score type
           for(const name of  ['value', 'percent', 'grade'] as Array<keyof typeof subject>){
               //
               //Formulate the cell id
               const id = `${subject.subject}_${name}`;
               //
               //Set the identified ccell
               this.td_set(id, subject[name], tr);
           }
       }               
    }
       
}

//Tabulate exem results using the page factors 'school', 'year', 'class', 'exam',
// 'stream', 'date' as  and row factors as student
class row_students extends exam_results{
    
    //
    //The 
    constructor(mother:main){
        //
         const draggable:draggable={
            filter:['school', 'year', 'class', 'exam', 'date'],
            crestlet:['stream','student'],
            crumblet:['subject']
        } 
        super(mother, draggable);
    }
    

}
//Tabulate exem results using the page factors 'school', 'year', 'class', 'exam',
// 'date' as  and row factors as student and stream
class row_students_stream extends exam_results{
    //
    //
     constructor(mother:main){
        const draggable:draggable={
            filter:['school', 'year'],
            crestlet:['student', 'class','stream', 'exam', 'date'],
            crumblet:['subject']
        } 
        super(mother, draggable);
    }  
    

   
    
}


//Tabulate exem results using the page factors 'school', 'class', 'exam',
// 'date' as  and row factors as student and stream
class page_school_students extends exam_results{
    //
    //
     constructor(mother:main){
        const draggable:draggable={
            filter:['school', 'year'],
            crestlet:['student', 'class','stream', 'exam', 'date'],
            crumblet:['subject']
        } 
        super(mother, draggable);
    }   
   
    
};
   
    