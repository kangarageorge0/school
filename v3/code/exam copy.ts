//Import app from the outlook library.
//
//Resolves reference to the asset.products data type
import * as outlook from '../../../outlook/v/code/outlook.js';
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

//This represents one row of page 
type page_selection = fuel;

//Joint is really not a factpr as it were, but is a field of page selector
type query_factor_type= 'school'|'year'|'class'|'exam'|'stream'|'student'|'date'|'joint'|'subject';
//
//Any factor in the exam system
type factor_type=query_factor_type|'measurement';
//
type region_type = 'crown'|'crumb'|'crest';
//
//Draggable factors
//{crown : Array<factor_type>,crumb : Array<factor_type>,crest : Array <factor_type>
export type factors = {
    [key in region_type]:Array<factor_type>
};


//TYpes of summaries supported by the Exam system
type summary_type = 'total'|'count'|'ranking'|'mean';

type summary = {
    right:{[key in summary_type]:boolean}, 
    bottom:{[key in summary_type]:boolean}
 } 

//The levels for each factor. It has a structure that looke slike, eg.,
//{school:['kaps', year:[1019, 2020, 2022}, subject:['kiswahili','maths',..] 
type levels = {[key in factor_type]:Array<lib.basic_value>};
//
//A cell is an object that can be indexed by as many factor types as are necessary
type cell_id = Partial<{[key in factor_type]:string}>;

//Tabulate exam results .......View exam results in a given sitting
export class sheet extends outlook.view{
    //
    //The the table we want to fill with the exam results (when we load the page)
    public matrix?:HTMLTableElement;
    //
    //The data to used to fill the tables body is set when we load the page
    public fuel?:Array<fuel>;   
    
    //The page data
    private paginator_data?:Array<page_selection>;
   
    //
    private paginator:HTMLSelectElement;
    //
    //These are factors that can be dragged between different regions 
    //(i.e., crestlets,crumblets and filters) of the worksheet
    public factors?:factors;
    //
    //These are the factors that define the summaries to be shownon the right 
    //and buttom margins of the worksheet
    public summary:summary={
        right:{total:true,count:false,mean:false,ranking:true},
        bottom:{total:false,count:false,mean:false,ranking:false}
    } 
    
    //The levels for each factor. It has a structure that looke slike, eg.,
    //{school:['kaps', year:[1019, 2020, 2022}, subject:['kiswahili','maths',..] 
    public levels?:levels;
    //
    //The base query
    private base_query?:string;
    //
    //Restore button
    private restore? : HTMLButtonElement;
    //
    //Save button
    private save? :HTMLButtonElement;
    //
    //The last valid selected index of the paginator
    private last_index? :number; 
    //
    //Crumb cells
    private crumb_cell_ids?:Array<Array<cell_id>> ;
    
    //Filters are an array of selector elements indxed by a factor
    private filters:{[index:string]:HTMLSelectElement}={};
    
    //
    //These are the Css style declaration for controlling the viewing mode
    private css_normal?:CSSStyleDeclaration;
    private css_edit?:CSSStyleDeclaration;
    //
    //The header section
    public header:header;
    //
    //The body section of thos sheet
    public body:body;
    //
    //Tabulate exem results using a set of page and row factors
    constructor(){
        //
        //Initializing the parent view 
        super();
        //
        //Set the table element
        this.matrix =  <HTMLTableElement>this.get_element('matrix');
        //
        //Set the paginator element
        this.paginator = <HTMLSelectElement>this.get_element('paginator');
        //
        //Initialiaize the header
        this.header = new header();
        //
        //Initialize the body
        this.body = new body();
        
     }


     //Show all the sections of a sheet: the crow, the header, the body and the tail
     public async show():Promise<void>{
        //
        //Read the base query from file ranking.sql
        const basequery = await server.exec(
            'database', 
            ['school_2', false], 
            'read_sql', 
            ['e:/mutall_projects/school/v/sql/ranking.sql']
        );
        //
        //Getting the factors
        //const factors: Array<factor_type> = ['school','year','class','exam','stream','student','date','joint','subject','measurement'];
        //
        //Getting the levels
        //const levels = {[key in factor_type]:Array<lib.basic_value>};
        //
        //Formulate teh quiery that retrieves the data
        const Query = new examiner(basequery,'grading', this.factors, this.levels, measurements);
        //
        //Execute the query to get the data (fuel)
        this.fuel = await Query.execute();
        //
        //Show the matrix sections
        //
        //Show the header section
        this.header.show();
        //
        //Show the body section
        this.body.show();

     }


     
    //Create the table that will be populated the results 
    public async show1(): Promise<void>{
         //
        //Set the overall base query (it is shared by all other queries)
        this.base_query = await this.sheet_get_base_query();   
        //
        //Clear the sheet
        this.sheet_clear();
        //
        //Get the factor levels
        this.levels=await this.sheet_get_factor_levels();
        //
        //Set the crumb cells
        this.crumb_cell_ids = <Array<Array<Partial<{[f in factor_type]:string}>>>>this.crumb_get_cells();
        //
        //Create the paginator and the filters in the crown
        await this.crown_show();
        //
        //Ensure that the first item on the page selector is selected
        this.paginator.selectedIndex = 0;
        //
        //Show table matrix
        await this.matrix_show();
       
    }
    
    async check(): Promise<boolean> {
        return true;
    }
    async get_result(): Promise<void> {
    }
    
    //Get all the levels of all the fact0rs that are in this sheet
    private async sheet_get_factor_levels():Promise <levels>{
        //
        //Start with an empty set of regions
        const levels:Partial<levels> = {};
        //
        //For every region, get its get its factors and levels
        for (const region_str in this.factors){
            //
            const region = <region_type>region_str;
            //
            //Get the factors of this region
            const factors:Array<factor_type> = this.factors[region];
            //
            //For each factor,get its levels
            for(const factor_str of factors){
                //
                const factor = <factor_type>factor_str;
                //
                //Compile the sql for retrieving the levels of the named factor
                //The query is base on the same table that we use for calculting
                //score percentages
                const sql = 
                   `
                   ${this.base_query}
                   select distinct
                       ${factor} as fname
                   from percent;
                   `;
                //
                //Execute the sql to levels of the named factor
                const data:Array<{fname:lib.basic_value}> = await server.exec(
                    'database',
                    ['school_2', false], 
                    'get_sql_data',
                    [sql]
                );
                //
                //The data will of the form:-
                //[{fname:2019}, {fname:2020}, {fname:2021} BUT whet we want is
                //[2019, 2020, 2121]
                //Convert the array of fname objects to an array of basic values
                const basic_values: Array<lib.basic_value>= data.map((x) => x.fname);
                //
                //Add the levels to th result, under the property region and factor 
                //names
                //levels[factor] = basic_values;
                levels[factor] = basic_values;
            }
        }
        //
        //Return levels
        return <levels>levels;
    }
    
    
    private mode_show(){
        //
        //Set your css declartoions fro controlling the view mode
        this.css_edit = this.mode_get_css_style_declaration('.edit');
        this.css_normal = this.mode_get_css_style_declaration('.normal');
        //
        //Add the event listener to the mode radio buttoms
        //
        //Get the edit radion button element
        const edit_button: HTMLInputElement = <HTMLInputElement>this.get_element('edit'); 
        //
        //Add the onclick event listener to the radio button
        edit_button.onclick  = () => this.mode_execute('edit');
        //
        //Get the normal radio button element
        const normal_button: HTMLElement = this.get_element('normal'); 
        //
        //Add the onclick event listener to the radio button
        normal_button.onclick  = () => this.mode_execute('normal');
        //
        //Get the normal radio button element
        const save_button: HTMLElement = this.get_element('save'); 
        
        //
               
    }
    
    //
    //Get the given css declaration that matches the given rule
    private mode_get_css_style_declaration(selector_text:'.normal'|'.edit'):CSSStyleDeclaration{
        //
        //Get the style element that controls the view mode
        const style_element: HTMLStyleElement = <HTMLStyleElement>this.get_element('mode');
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
        //Try to convert the list into an array so that we can use the for/of
        //method
        const list_array:Array<CSSRule> = Array.from(list);
        //
        //For each css style rule,,,,
        for (const rule of list_array ){
            //
            //Cast the rule to a CSSSStyle rume
            const rule2= <CSSStyleRule>rule;
            //
            //Compare the selector text with the one i want and if it matches
            //then return the css rule otherwise go to the next rule
            if (rule2.selectorText===selector) return rule2;
         }
        //At this point there is no error that matches the selector text, 
        //so something must have gone wrong, stop this function and report an 
        //error to that effect
         throw `Cannot find a css rule with selector ${selector}`;
    }
    
    
    //If the mode selected is normal, look for the normal rule and set it to 
    //flex and edit to none and if the mode selected is edit, look for the 
    //edit rule set it to flex and nomal to none
    private mode_execute( mode:'normal'|'edit'):void{
        //
        switch(mode){
            
            //If the mode selected is normal...
            case 'normal':
                //...look for the normal rule and set its display property to 
                //flex 
                this.css_normal!.setProperty('display','flex');
                //
                //...look for the edit rule and set its display property to 
                //none 
                this.css_edit!.setProperty('display','none');
                break;
            //    
            //If the mode selected is edit
            case 'edit':
                //...look for the edit rule and set its display property to 
                //flex 
                this.css_edit!.setProperty('display','flex');
                //
                //...look for the edit rule and set its display property to 
                //none 
                this.css_normal!.setProperty('display','none');
                break;
        }
    }
    
    //
    // Sheet clear
    private sheet_clear(){
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
    //
    //Reading the base query from the sqls folder
    private async sheet_get_base_query():Promise <string>{
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
            count(*) over (partition BY  ${this.factors!.crown.join(',')}) as count
        from total
        window w as (partition BY  ${this.factors!.crown.join(',')} order by total desc)
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
        private async crown_show():Promise<void>{
        //
        //Fill the paginator selector and add the onchange event listener to refresh
        //the page
        await this.paginator_show();
        //
        //Show the edit or normal mode
        this.mode_show();
        //
        //Create the filters
        //
        //Thers are as many filters as there are filter factors
        const items: Array<factor_type> = this.factors!.crown;
        //
        //Get the filters section
        const filters:HTMLElement = this.get_element('filters');
        //
        //Use the fieldset to create a legend
        //const legend :HTMLElement = this.create_element('legend',filters,{textContent:"Filters"});
        //
        //For each crown factpr create a filter
        items.forEach((item,index)=>this.filter_show(item, index, filters));
        //
        //Creating a button for restoring
        this.restore = this.create_element('button',filters,{
            textContent : "Restore Last Page with Data",
            hidden:true
        });
        //
        //Add the restore listeer to the button
        this.restore.onclick= ()=>this.matrix_restore();
        
        
    }
    
    //Create a filter as a labeled select element
    private filter_show(item:factor_type,index:number, filters:HTMLElement):void{
        //
        //Use the crown section to add the label element
        const label:HTMLElement = this.create_element('label', filters);
        
        //
        //Use the label element to add a span tag showing the name
        //of the item
        const span = this.create_element('span',label,{textContent:item, factors:true} );
        //
        //Add the ondrag start listener
        span.ondragstart = (ev)=>this.factors_start_drag(ev,'crown',index);
        //
        //Add the ondrop over listener and stop its default behaviour because 
        //it interferes with the drop operation. See the MDN reference manual 
        span.ondragover = (ev) => ev.preventDefault();
        //
        //Add the drop events
        span.ondrop = (ev)=>this.factors_drop_drag(ev,'crown',index);
        //
        //Use the same label element to add the input element whose id is the same as
        //item
        const filter:HTMLSelectElement = this.create_element('select', label, {id:item});
        //
        //Add the onchange event listener to the filter
        filter.onchange = ()=>this.matrix_onfilter_repaint()
        //
        this.filters[item] = filter;
        //
        //Check thet tahe levels are set before using them
        if (this.levels===undefined) throw new schema.mutall_error('Levels are not set');
        //
        //Add the filter options
        //For each factor level...
        for (const value of this.levels[item]){
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
                    value: String(value),
                    //
                    //Set the text content of the option to the result from the sql
                    textContent: String(value)
                }    
            )
        }
 
    }
    
    //
    //Creating an ondragstart listener for all the factorss
    private factors_start_drag(ev:DragEvent,key:region_type,index:number){
        
        //
        ev.dataTransfer!.setData('key', key);
        ev.dataTransfer!.setData('index', String(index));
       
    }
    //
    //Creating an ondragdrop listener for all the factorss which works as follows:-
    private factors_drop_drag(ev:DragEvent,dest_key:region_type,dest_index:number){
        //
        //Determine the source of the data
        const src_key:region_type = <region_type>ev.dataTransfer!.getData('key');
        const src_index = +ev.dataTransfer!.getData('index');
        //
        //From the source factors, remove one element at the given source index
        const Sources:Array<factor_type> = this.factors![src_key].splice(src_index, 1);
        //
        //To the destinatiion factors, add the rempved sources at the destination index
        this.factors![dest_key].splice(dest_index, 0, ...Sources);
        //
        //Refreash the entire sheet
        this.show();
    }
    
    private matrix_restore():void{
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
    private matrix_onfilter_repaint():void{
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
    private matrix_clear(){
        //
        //Empty the table header
        this.matrix!.tHead!.innerHTML="";
        //
        //Then empty the body
        this.matrix!.tBodies[0].innerHTML = "";
        
        
    }
    //This returns the value of the identfield selector
    private get_item_value(id:string):string{
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
    private get_item_data():fuel{
        //
        //Start with an empty fuel
        const result:fuel = {};
        //
        //For each filter facor....
        for (const factor of this.factors!.crown){
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
    //
    //Display the table that matches the current sitting number
    private async matrix_show():Promise<void>{ 
         //
        //Save the current selection index for future reference in case we need to 
        //restore the previous matrix
        this.last_index = this.paginator!.selectedIndex;
        //
        //Set the subject data using the subject sql.
        this.matrix_data  = await this.matrix_get_data();
        //
        //Set the filter values located in the crown region
        this.crown_set_filter_values();
        //
        //Show the row and the column headers
        this.header_show();
        //
        //Show the table's body
        this.body_show();
        //
        //When we have the footer, e.g., mean score values, it will be shown here
        this.footer_show();
    }
    
    
    //
    //Get the data required for painting the page selector
    private async paginator_get_data():Promise<Array<page_selection>>{
        //
        //There is no [aginator data if there are no flters
        if (this.factors!.crown.length===0) return [];
        //
        //Compile the sql that exracts the page selector
        const sql=`
            ${this.base_query}
            select distinct
                ${this.factors!.crown.join(',')},
                concat_ws('/', ${this.factors!.crown.join(',')} ) as joint 
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
    private async paginator_show():Promise <void>{ 
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
    private async crown_set_filter_values():Promise<void>{
       //
        //Get the current selection index from the paginator
        const current_selection:number = this.paginator!.selectedIndex;
        //
        //Use the selection index to get the corresponding page data row
        const row:page_selection = this.paginator_data![current_selection];
        //
        //For each filter item....
        for (const item of this.factors!.crown){
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
        private paginator_fill_options():void{
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
    private get_page_condition(page:fuel):string{
        //
        //Start with an empty result list of factor/value pairs
        const result:Array<factor_type>=[];
        //
        //For each filter factor...
        for(const key of this.factors!.crown!){
            //
            //Get the factor/value pair, formated in the way we would like it 
            //for the condition e.g. year='2014'
            const pair = key + '=' + `'`+page[key]+`'`;
            //
            //Add the factor/value pair into a result list
            result.push(<factor_type>pair);
        }
        //Use the result list to join the factor/value pairs using the 
        //'and' oparator
        return result.join(' and ');
                
    } 
    
    
    //Get the data for this matrix depending on the crumb factors.
    private async matrix_get_data():Promise<Array<{name:string, id:string}>>{
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
    private async body_get_data():Promise <Array<fuel>>{
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
    private header_show():void{
        //
        //Clear the table header
        this.get_element("header").innerHTML="";
        //
        //Show the top row(3 columns, viz., id, raw_values, summary)
        this.header_show_partition();
        //
        //Show the crumblets. There weill be as many crumb;ets as there are
        //facrors in the crumb region
        this.factors!.crumb.forEach(factor => this.header_show_crumblet(factor));
        
    }
    //4. Use the body data to show the body.
    private async body_show():Promise<void>{
        //
        //Get the body section and clear it
        this.get_element('body').innerHTML="";
        //
        //Set the body data using the ranking sql.
        this.body_data = await this.body_get_data();
        //
        //Created the empty table matrix
        this.body_data.forEach(row=>this.body_create_empty_row());
        //
        //Populate the matrix with the body values
         this.body_data.forEach((row, index)=>this.body_fill_row(index, row));
    }

    //Create sn empty row of the body region
    private body_create_empty_row():void{
        //
        //Create an empty row (tr)
        const tr:HTMLTableRowElement = this.create_element('tr', this.get_element('body'))
        //
        //Create empty cells under the crest region
        this.factors!.crest.forEach(crestlet=>new cell(tr, 'th', 1, "", "read_only", crestlet));
        //
        //Create empty cells under the crumb region
        this.crumb_bottom_most_cell_ids.forEach(cell_id=>new cell(tr, 'td', 1, "", this.body_get_io(cell_id), String(cell_id)));
        //
        //Create empty cells under the sumary region
        this.get_summary_cells.forEach(cell_id=>new cell(tr, 'td', 1, "", "read_only", String(cell_id)));
        //
    }
    
    //Get the cell ids of bottom most row of the crumb
    get crumb_bottom_most_cell_ids():Array<cell_id>{
        //
        //If there are ano crub factors, then theer are no cells
        if (this.factors!.crumb.length===0) return [];
        //
        //Get the index of the bottom most row of the crub region
        const index:number = this.factors!.crumb.length-1;
        //
        //Use the index to get the cell_ids in that row
        const cell_ids:Array<cell_id> = this.crumb_cell_ids![index];
        //
        //Return the count of the cell ids
        return cell_ids;
    } 
    
    //Get the cell ids of the bottom most summary region
    private get_summary_cells(which:'right'|'bottom'):Array<string>{
        //
        //Get the settings for the right margin
        const settings:{total:boolean,count:boolean,mean:boolean,ranking:boolean} = this.summary[which];
        //
        //Get all the fetting factors
        const factors:Array<string> = Object.keys(settings);
        //
        //Select only those factors that are marked as true
        return factors.filter(f=>(settings[f as keyof typeof settings]));
    } 
    

    //Fill the given row witj the given data
    private body_fill_row(rowIndex:number, data:fuel):void{
        //
        //Get the tr that matthes the row index
        const tr: HTMLTableRowElement = (<HTMLTableSectionElement> this.get_element('body')).rows[rowIndex];
        //
        //Collect all the id/value pairs implied by the data row
        const pairs:Array<{id:string, value:lib.basic_value}> = [...this.body_collect_id_value_pairs(data)];
        //
        //For each pair, set the io value to the one in the pair
        pairs.forEach(pair=>this.body_fill_cell(tr, pair));
    }
    
    //Collect all the id/value pairs implied by the data row
     private *body_collect_id_value_pairs(data:fuel):Generator<{id:string, value:lib.basic_value}>{
        //
        //Set through all the columns of the fuel, generating an id/value pair
        //where applicable
        for(const factor in data){
            //
            //Treat all factors as id's, except the raw_values one
            if (factor!=='raw_values'){
                //
                //Generate the crest-based id/value pairs directly from data
                const pair = {id:factor, value:data[factor]};
                //
                yield pair;
            }else{
                //
                //Generated the crumb-based id/value pairs from the row_values
                //
                //Get the raw values string
                const values_str:string = data[factor] as string;
                //
                //Convert the string to a javascript arr object
                const ids:Array<{id:string, value:lib.basic_value}> = JSON.parse(values_str);
                //
                //Step throuhg he array and for yeaech element, genarted the
                //id/value pair
                for(const id of ids) yield id;
            }
        }
    }

    //Fill the specified cell with the given data
    private body_fill_cell(tr:HTMLTableRowElement, pair:{id:string, value:lib.basic_value}):void{
        //
        //Destructure the pair to reveal its id and value
        const {id, value} = pair;
        //
        //Look for a cell (in the bottomost of the header) whose id matches the
        //given one
        const td_header = this.get_element(id) as HTMLTableCellElement;
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

    //
    //Show the top row. It has 3 columns, viz., id, raw_values, summary. The id
    //column has a span of 1. The raw values column has a span of number of 3
    //times subjects and the summary has a span of 2. The titles for these 3 
    //sections are 'id', 'raw values' and summary, respectively  
    private header_show_partition():void{
        //
        //Create the (top) section row
        const tr:HTMLTableRowElement =this.matrix!.tHead!.insertRow();
        //
        //1. Add the id column to the row with a span of the same size as
        //the number of row factors, and show 'id'
        this.create_element('th', tr, {colSpan:this.factors!.crest.length, textContent:'Id'});       
        //
        //Add the raw_values column to the row. Note:The column span for the 
        //raw_values the product of all the levels of all the crumblet factors
        this.create_element('th', tr, {colSpan:this.partition_get_col_span(), textContent:'Score Values'});       
        // 
        //Add the summary column to the right margin of table. 
        //There will be as many columns as those that are enabled
        this.create_element('th', tr, {colSpan:this.summary_get_count('right'), textContent:'Summary'});       
    } 
    //
    //Get the product of the the number of levels for each factor in the crumb
    //region (to that will determain the length of the crumb)
    public partition_get_col_span():number{
       //
        //Get the factors in the crumb region, eg, ...factors:Array<factor_type>=['school','year','class']
        const factors: Array<factor_type> = this.factors!.crumb;
        //
        //Get the levels for each of the factors in the crumb region, eg., levels:Array<factor_type>=[[kaps],[2019,2020,2023],1,2,3,4]]
        const levels:Array<Array<lib.basic_value>> = factors.map(factor=>this.levels![factor]);
        //
        //Get the counts of the levels for each factor in the crumb region eg., counts=[1,2,5]
        const counts: Array<number> = levels.map(l => l.length);
        //
        //Get the products of all the counts
        const product:number = counts.reduce((acc, cv)=>acc*cv);
        //
        //Return the product
        return product
    }
    //
    //Calculate the number of summary factors(on the right) that are enabled 
    private summary_get_count(type:keyof summary):number{
        //
        //Get the summary values. The strutre of summary is {right:x, bottom:x}
        //The structure of xi slike: {ranking:true, count:false, etc...}
        const values: Array<boolean> = Object.values(this.summary[type]);
        //
        //Isolate those that are enableed. They are the true cases
        const enableds: Array<boolean> = values.filter(value=>value);
        //
        //Counr the result
        const count: number = enableds.length;
        //
        //Return the result
        return count;
    }
       
    //show the subject row that has student row with 1 span, subjects area which 
    //should have as many columns as there are subjects and each column should have
    //3 spans and summary row with 2 spans
    private header_show_crumblet(factor:factor_type):void{
        //
        //Create the crumblet row
        const tr: HTMLTableRowElement =(<HTMLTableSectionElement>this.get_element("header")).insertRow();
        //
        //Get the index of he given factor, from the crumb region
        const index: number = this.factors!.crumb.indexOf(factor);
        //
        //Get the index of the bottommost factor
        const last_index = this.factors!.crumb.length-1;
        //
        //If this is the bottommost row ... 
        if (index===last_index){
            //
            //Add the cells in the crest region
            //There will be as many as there are crest factors all with a span 
            //of one and their text values being factor names
            this.factors!.crest.forEach(crestlet=> 
                new cell(tr, 'th', 1, crestlet, 'read_only', crestlet)
            ); 
            //
            //Add the cells in the crumnb section, the number is determined by the 
            //number of crumblets below the current one
            this.crumb_bottom_most_cell_ids.forEach(cell_id=>{
                //
                const value1:string|undefined = cell_id[factor];  
                //
                const value2:string = value1===undefined ? '':value1; 
                //
                //Get the cell's id
                const id: string = this.factors!
                    //
                    //Get the crumb facrors
                    .crumb
                    //
                    //Map the factors to their corresponding values
                    .map(f=>cell_id[f])
                    //
                    //Join the values with a slash separator
                    .join("/");
                //
                //Create the crumblet cell
                new cell(tr, 'th', 1, value2, 'read_only', id);
            })
            
            //
            //Add the cells in the summary selection
            //There will be as many as there are available summary all with a 
            //span of one and their text values matching the summary names
            this
                .get_summary_cells('right')
                .forEach(summary=>new cell(tr, 'th', 1, summary, 'read_only'));
        }
        //  
        //Else if it is not the bottom most, then
        else{
             //
            //Add one cell in the crest region with a span size that matches 
            //the crest size
            new cell(tr, 'th', this.factors!.crest.length,'', 'read_only');       
            //
            //
            //Add the cells in the crumnb section, the number is determined by the 
            //number of crumblets below the current one
            this.crumb_cell_ids![index].forEach(cell_id=>{
                //
                //Col span is the number of cells in the bottomost row divided
                //by the number of cell for this factor
                const colspan = this.crumb_width
                    /this.crumb_cell_ids![index].length ;
                //
                //If a factor does not have an associated value then there must be
                //a problem; report it
                const value:string|undefined = cell_id[factor];
                if (value===undefined) throw new schema.mutall_error('Crumb factpr with no value found');      
                //
                //Create the crumblet cell
                new cell(tr, 'th', colspan, value, 'read_only');
            });  
            //
            //Add one cell in the summary region with a span size that matches 
            //the available sammuries
            new cell(tr, 'th', this.summary_get_count('right'),'', 'read_only');
        }
    }
    
    //
    //Show the cells for the  crumblet identified by the given index and factor   //number of crumblets below the current one
    header_show_crumblet_cells(tr:HTMLTableRowElement, index:number, factor:factor_type){ 
        //
        //Get the crumblet cell ids at the given index
        const cell_ids:Array<cell_id> = this.crumb_cell_ids![index];
        //
        //Step through all the cells of the given factr on the crumb region
        //and create them
        cell_ids.forEach(cell_id=>{
            //
            //Let a the number of cells in bottom most row, i.e., the width of the matrix
            const a: number = this.crumb_width;

            //b is number of cells for the given factor
            const b: number = this.crumb_cell_ids![index].length;
            //
            //The column span of a cruiblet cell ios the number of cvells ij the bottm
            //row divided by yje number celld for this factor
            const colspan:number = a/b; 
            //
            //Create the crumblet cell
            new cell(tr, 'th', colspan, factor, 'read_only', String(cell_id));
        });
        
    }

    //The crumb width is the number of cell ids in the bottom most row of the
    //crumn region
    get crumb_width():number{
        //
        //Take care of when there are no crumbs: The width must be one
        if (this.factors!.crumb.length===0) return 1;
        //
        //Get the index of the bottom most row of the crub region
        const index:number = this.factors!.crumb.length-1;
        //
        //Uset the index to get the cell_ids in that row
        const cell_ids:Array<cell_id> = this.crumb_cell_ids![index];
        //
        //Return the count of the cell ids
        return cell_ids.length;
    }

    //
    //Add the cells in the crumnb section, the number is determined by the 
    //number of crumblets below the current one
    private crumb_get_cells():Array<Array<Partial<cell_id>>>{ 
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
                {f2:'l11', f1:'l11'}, 
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
        const all_cells: Array<Array<Partial<{[f in factor_type]: string}>>> 
              = this.factors!.crumb.map((crumblet:factor_type, index:number)=>{
            
            //Slice from factors, starting from 0 to i+1, to get anscestors. The ancestor
            //of f1 (inclusing self) is [f1], of f2 are [f2,f1] and of f3 are [f3,f2,f1]
                 const ancestors: Array<factor_type> = this.factors!.crumb.slice(0, index+1);
            //
            //
            const levels:{[key in factor_type]:Array<string>} = <{[key in factor_type]:Array<string>}>this.levels;
            //
            //Define the function for genarating cells for a given factor
            function generate_cells( 
                previous_cells:Array<Partial<{[f in factor_type]:string}>>, 
                current_factor:factor_type
            ):Array<Partial<{[f in factor_type]:string}>>{
                //
                //Start with an empty list of cells
                const cells:Array<Partial<{[f in factor_type]:string}>> = [];
                //
                //For the first time round (when there are no previous cells)......
                if (previous_cells.length==0){
                    //
                    //For each level of the currrent factor
                    levels[current_factor]!.forEach((level)=>{
                        //
                        //Construct a new cell
                        const new_cell: Partial<{[f in factor_type]:string}> = {};
                        //
                        //Add the new factor level
                        new_cell[current_factor] = level;
                        //
                        //All the new cell to the list
                        cells.push(new_cell);
                    });
                } else{
                    //For subsquent cases.....
                    //
                    //For each previous cell...
                    previous_cells.forEach((cell:Partial<{[f in factor_type]:string}>)=>{
                        //
                        //For each level of the currrent factor
                        levels[current_factor]!.forEach((level)=>{
                            //
                            //Construct a new cell from the the ancestor one
                            const new_cell: Partial<{[f in factor_type]:string}> = {...cell}
                            //
                            //Add the new factor level
                            new_cell[current_factor] = level;
                            //
                            //All the new cell to the list
                            cells.push(new_cell);
                        })           
                    });
                }    
                //
                //Return the cells
                return cells;
            }
            //
            //Reduce each ancestor of this factor to an array of its corresponding cells 
            //as illustrated above. Start with an empty list of cells. Note: there are
            //2 versions of reduce. The initial value must be provided to help typescript
            //pick the version we want
            const cells:Array<Partial<{[f in factor_type]:string}>> = ancestors.reduce(generate_cells, []);
            //
            //Return teh reduction
            return cells;
        });
        //
        //Rteurn the cells
        return all_cells;

    }
    //
    //Show as many columns as there are subjects, all with a span of 3 and
    //with subject as the text content
    private show_subject_cells(tr:HTMLTableRowElement):void{
        //
        //For each subject...
         for(const{name} of this.matrix_data!){
            //
             //Create a cell with 3 columns and the given name
            //this.create_element('th', tr, {colSpan:3, textContent:name});
            new cell(tr, 'th',3,name, 'read_only', '');
         }
    }
    
   
    
    //Show the header row that determines the horizontal dimension of the table
    private measurement_show():void{
        //
        //Create the score type row
        this.header = this.matrix!.tHead!.insertRow(); 
        //
        //Show the crestles
        this.factors!.crest.forEach((item, index) => this.crestlet_show(item,index));
        //
        //Show as many columns as the product of subjects and score types
        this.show_score_cells();
        //
        //Show the total header
        this.create_element('th', this.header, {id: 'total', textContent: 'Total',disabled:true});
        //new cell(this.header, 'th',1,'Total', 'read_only', 'total');
        //
        //Show the rank header
        this.create_element('th',this.header, {id:'ranking',textContent:'Rank',disabled:true});
    }
    
    private crestlet_show(item:string,index:number){
        //
        //Create a crestlet and make it factors 
        const crestlet = this.create_element('th', this.header, {
            id:item, 
            textContent:item,
            factors:true
        });
        //
        //Add the drop events
        crestlet.ondragstart = (ev)=>this.factors_start_drag(ev,'crest',index);
        //
        //Add the ondropover listener on crestlet_factors; the only reason is 
        //to stop the default behaviour which interferes with the drop operation
        crestlet.ondragover = (ev) => ev.preventDefault();
        //
        //Add the ondrop listener on crestlet_factors
        crestlet.ondrop = (ev)=>this.factors_drop_drag(ev,'crest',index);
    }
    //Construct and display the cells in the score row, the 3rd row of our table
    private show_score_cells(){
        //
        //For each subject....
        for(const subject of this.matrix_data!){
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
    
        
}

//This is the basic building block for our worksheet
class cell extends outlook.view {
    //
    //This is the tab;le row element that is the parent of the td/th cell
    public tr:HTMLTableRowElement;
    //
    //This ie the element that represents the table cell. Its type depend
    public td:HTMLTableCellElement;
    //
    //The i/o type of this cell is important for editiong purposes
    public io?: io.io;
    //
    //Unique identifier for a cell, partculary needed for the most bottom row
    //of the header 
    public cell_id?:string;
    //
    constructor(
        tr:HTMLTableRowElement, 
        cell_type:'th'|'td', 
        colspan:number,
        text:string,
        io_type: io.io_type,
        id?:string
    ){
       
        super();
        this.tr = tr;
        //
        //Create a the dierd cell
        this.td = this.create_element(cell_type, tr, {colSpan:colspan, textContent:text});
        //
        this.io = io.io.create(io_type, this.td);
        this.cell_id = id;
    }
    
}

//
//The Crown class
class crown extends outlook.view {
    constructor(){
        super();
    }

    public show():void{
        //
    }
}

//
//The header class
class header extends outlook.view {
    public element:HTMLTableSectionElement;

    constructor(
        public matrix : HTMLTableSectionElement, 
        public factors:factors,
        public levels:levels,
        public summary : summary 
        )
        
        {
        super();
        //
        //Set the body element from the web page
        this.element = <HTMLTableSectionElement>this.get_element('header');
        
        
    }

    public show(): void {
        //
        //Show the partition row
        this.show_partition_row();
        //
        //Show the intermediate crumb row
        this.show_crumb_rows();
        //
        //Show the bottom most row
        this.show_bottom_most_row();
    }
    //
    //Show the top row. It has 3 columns, viz., id, raw_values, summary. The id
    //column has a span of 1. The raw values column has a span of number of 3
    //times subjects and the summary has a span of 2. The titles for these 3 
    //sections are 'id', 'raw values' and summary, respectively  
    private show_partition_row():void{
        //
        //Create the (top) section row
        //this.element.insertRow()
        const tr:HTMLTableRowElement =this.element.insertRow();
        //
        //1. Add the id column to the row with a span of the same size as
        //the number of row factors, and show 'id'
        this.create_element('th', tr, {colSpan:this.factors!.crest.length, textContent:'Id'});       
        //
        //Add the raw_values column to the row. Note:The column span for the 
        //raw_values the product of all the levels of all the crumblet factors
        this.create_element('th', tr, {colSpan:this.partition_get_col_span(), textContent:'Score Values'});       
        // 
        //Add the summary column to the right margin of table. 
        //There will be as many columns as those that are enabled
        this.create_element('th', tr, {colSpan:this.summary_get_count('right'), textContent:'Summary'});       
    }
    //Get the product of the the number of levels for each factor in the crumb
    //region (to that will determain the length of the crumb)
    private partition_get_col_span():number{
        //
         //Get the factors in the crumb region, eg, ...factors:Array<factor_type>=['school','year','class']
         const factors: Array<factor_type> = this.factors!.crumb;
         //
         //Get the levels for each of the factors in the crumb region, eg., levels:Array<factor_type>=[[kaps],[2019,2020,2023],1,2,3,4]]
         const levels:Array<Array<lib.basic_value>> = factors.map(factor=>this.levels![factor]);
         //
         //Get the counts of the levels for each factor in the crumb region eg., counts=[1,2,5]
         const counts: Array<number> = levels.map(l => l.length);
         //
         //Get the products of all the counts
         const product:number = counts.reduce((acc, cv)=>acc*cv);
         //
         //Return the product
         return product
     }
     //
     //Calculate the number of summary factors(on the right) that are enabled 
     private summary_get_count(type:keyof summary):number{
         //
         //Get the summary values. The strutre of summary is {right:x, bottom:x}
         //The structure of xi slike: {ranking:true, count:false, etc...}
         const values: Array<boolean> = Object.values(this.summary[type]);
         //
         //Isolate those that are enableed. They are the true cases
         const enableds: Array<boolean> = values.filter(value=>value);
         //
         //Counr the result
         const count: number = enableds.length;
         //
         //Return the result
         return count;
     }

}
//
//The body class
class body extends outlook.view {
    //
    //The htmlement that repersebts the body
    public element: HTMLTableSectionElement;

    constructor(){
        super();
        //
        //Set the body element from the web page
        this.element = <HTMLTableSectionElement>this.get_element('body');
    }

    //Create the body sexction and fill up with data
    public show():void{
        //
        //Get the number of data rows
        const rows:number = this.get_data_size();
        //
        //Create the empty table by asading as many rows (to the body element) as there
        //are data rows
         this.create_empty_body(rows);
        //
        //Use the empty table to fill it with data
        this.fill();
    }
}

//
//The footer class
class footer extends outlook.view {
    constructor(){
        super();
    }
}

//This class holds all the code for constructing data query
class examiner extends outlook.view{
    //
    //The 
    public base?:string;

    constructor(
        //
        //The  With statement as read directly from the external sql file. E.g.,
        //with ...., grading as (...). ....
        public basequery:string,
        //
        //The name of the cte in the basequery which we use for tabulation, e.g. grading.
        public name:string,
        //
        //All the non-measurement factors referenced by the named cte
        public factors:factors,
        //
        //Levels of the above factors 
        public levels:Array<{factor:factor_type, value:string}>,
        //
        //Measurement levels, e.g., score, percent, abc, expectation
        public measuerements:Array<string>
    ){
        super();
    }

    //
    async execute():Promise<Array<fuel>>{
        //
        //Compile complete code for getting the data
        const sql:string =
            //
            // Adding our base query from the ranking file
            `${this.basequery},`
            //
            //Creating ctes from the derived factors
            + [...this.get_cte()].join(", ") 
            //
            //Add the select statement
            + ` select * from crest`;
        //
        return await server.exec('database', ['school_2'],'get_sql_data', [sql]);    
    }

    //The generator for all the cts that make up the examiner query
    *get_cte():Generator<string>{  
        //
        //The union of all te tables that yield a measuerement
        yield this.get_measurement_cte();
        //
        //Crown filetring query
        yield this.get_crown_cte() 
        //
        //The crumb query for summarising measurements
        yield this.get_crumb_cte();
        //
        //Use crest factors for grouping the rows
        yield this.get_crest_cte();
        
    }

    //Returns the cte used for taking care of crown (filter) factors in our with statement
    //The cte has the following shape:
    //    crown as ( select measurements.* from measurements where school='kaps' and year=2019) 
    //where crown is the name of the current cte and measurement is the name of a previous one
    //If there are no crown factprs then teh where clause should not be included 
    get_crown_cte():string{
        //
        //Work out the where condition, e.g., school='kaps' and year=2019, by collection 
        //all teh factor/value pairs that make up the whre clause
        const conditions:Array<string> = this.levels.map(pair=>`${pair.factor}='${pair.value}'`);
        //
        //Compile the pairs into a condition string by joinin them with an 'and' operator
        const condition = conditions.join(' and ');
        //
        //Compile the where clause
        const where:string = this.factors.crown.length===0 ? "" : ` where ${condition}`;
        //
        //Compile the complete cte    
        return `crown as (select measurements.* from measurements ${where})`;
    }

    //Examples of a factor/value pair is
    //school = 'kap'
    //The values come from the crown filters
    get_factor_value_pairs(factor:factor_type):{factor:string, value:string}{
        //
        //NB. The crown filters are identified by their factr names
        const select:HTMLSelectElement = <HTMLSelectElement>this.get_element(factor);
        //
        //Ensure that there is a selection
        if (select.selectedIndex===-1) throw new schema.mutall_error(`Please select a ${factor}`)
        //
        return {factor:factor, value:select.value}
        
    }
        //Use crest factors for grouping the rows
        get_crest_cte():string{
            //
            //get the crest factors
            const crest_factors:Array<factor_type> = this.factors.crest;
            //
            //Join the factors so that they can be used in the sql
            const crest = crest_factors.join(',');
            
            //
            //If there are no crest factors remove the group by statement
            if(crest_factors.length===0){
                return `crest as (
                    select  json_arrayagg(value2) as raw_values from crumb
                )`;
            } 
            else{
                return `crest as (
                    select ${crest}, json_arrayagg(value2) as raw_values from crumb group by ${crest}
                )`;
            }
           
        }
        //
        //The crumb query for summarising measurements
        /*
         crumb as (
            select
                crown.*,
                json_object(
                    'id', concat_ws('/', class, exam, date,subject,measurement),
                    'value',value
                ) as value2        
            from crown    
        )
        */
        get_crumb_cte():string{
            //
            //get the crest factors
            const crumb_factors:Array<factor_type> = this.factors.crumb;
            //
            //Join the factors so that they can be used in the sql
            const crumb = crumb_factors.join(',');
            //
            //Consider the options of when there are no crumb factors. Note the null id
            if(crumb_factors.length===0){
                return `crumb as (
                    select
                        crown.*,
                        json_object(
                            'id', null,
                            'value',value
                        ) as value2
                    from crown    
                ),`
            }
            // 
            //else when the factors are there
            else{
                return `crumb as (
                    select
                        crown.*,
                        json_object(
                            'id', concat_ws('/', ${crumb}),
                            'value',value
                        ) as value2
                     from crown    
                ),`
            }
        }
        //
        // Measurements cte that unions the measurements
        /*
        return `measurement as (
            select  school,year,class,exam,stream,date,subject, 'score' as measurement, score as value from  grading
            union all
            select  school,year,class,exam,stream,date,subject, 'percent' as measurement, percent as value from  grading
            union all
            select  school,year,class,exam,stream,date,subject, 'expectation' as measurement, expectation as value from  grading
            union all
            select  school,year,class,exam,stream,date,subject, 'abc' as measurement, abc as value from  grading`
        )*/
        get_measurement_cte():string{
            //
            //Get the measurement levels
            const measurements:Array<string> = this.measuerements;
            //
            //The must be at least one measurement for tabulation
            if (measurements.length===0) throw new schema.mutall_error('There are no measurements to tabulate');
            //
            //Map the measurements to the union sub-statements
            const substatements:Array<string> = measurements.map(measurement=>{
                //
                //Collect all the factors in our tabulatin query
                const factors:Array<string> = [...this.collect_factor_names()];
                //
                //Return the substatement
                return `select 
                    ${factors.join(', ')}, 
                    '${measurement}' as measurement, 
                    ${measurement} as value 
                from ${this.name}`;
            });
            //
            //Join the sub-statements with a 'union all' oparator
            const select:string = substatements.join(' union all '); 
           //
            return `measurements as ( ${select})`;
        }

        //Collect factor names
        *collect_factor_names():Generator<string>{
            //
            //Step through all the factor regions
            for(const region in this.factors){
                //
                //Get the factprs in that region
                const factors:Array<factor_type> = this.factors[<region_type>region];  
                //
                for(const factor of factors){
                    //
                    yield '`' + factor + '`';
                }          
            }        
        }    
}
   
    