//Resolves reference to the asset.products data type
import * as view from '../../../outlook/v/code/view.js';
//
//Import the io
import * as io from "../../../schema/v/code/io.js";
//
//Import server.
import * as server from "../../../schema/v/code/server.js";

//Resolve references to a database
import * as schema from "../../../schema/v/code/schema.js";
import * as lib from "../../../schema/v/code/library"; 

//
//Sections are vertically aligned. Examples are: header, body, footer and 
//matrix. The classes in this system are derived from these sections
//
//Regions areas of a sheet that have a horizontal alignment 
export type region_type = 'crown'|'crumb'|'crest'|'summary';
//
//Generalize a factor type to a string
export type factor_type=string;
//
//Types of summaries supported by the Exam system
export type summary_type = 'total'|'count'|'ranking'|'mean';
//
//These are factors that can be dragged between different regions 
//(i.e., crest,crumb and crown) of the worksheet. It is an array of 
//factor names, indexed by the region type. E.g., crown:['year, 'class']
//crumb:['measurement','subject']
export type factors = { [key in region_type]:Array<factor_type> };
//
//The measurement factor level names and their io types, e.g., 
//score:['input', 'number'], percent:'readonly'
export type measurements = Map<string, io.io_type>;
//
//The list of the desired left and bottom summaries (to be computed 
//automatically). E.g., left:['total', 'count'], bottom:['total]
export type summaries = {right:Array<summary_type>,bottom:Array<summary_type>}
//
//The shape of a pivot query which a user can influence
export type shape = {
    //
    //The layout of the factors, including the special one, measurement
    factors:{[key in region_type]:Array<factor_type>},
    //
    //The measurement factor level names and their io types, e.g., 
    //score:['input', 'number'], percent:'readonly'. NB. The order is important
    measurements:Map<string, io.io_type>,
    //
    //The list of the desired left and bottom summaries (to be computed 
    //automatically). E.g., left:['total', 'count'], bottom:['total]
    summaries:{right:Array<summary_type>,bottom:Array<summary_type>}
}
//
//This class holds all the code for constructing data query
export class query extends view.view{
    //
    //The shape of this pivot query
    
    //The levels for each factor. It has a structure that looks like, e.g.,
    //{school:['kaps'], year:[1019, 2020, 2022}, subject:['kiswahili','maths',..] 
    public levels:Partial<{[key:factor_type]:Array<lib.basic_value>}>={};
    //
    //For pagination purposes, we need to limit the number of retrieved rows
    //from a given offset.
    public limit:number = 40; //Why the choice of this default value?
    public offset:number=0;
    //
    constructor(
        //
        //The main dataase on which the pivot query is executed
        public dbname:string, 
        //
        //The ctes that are relevany for this query
        public basequery:string, 
        //
        //The name of the ct in the base query that drives fills body region of
        //a worksheet
        public body:string,
        //
        //The structure of factors, measurements and summaries that define the
        //shepe of a pivot query 
        public shape?:shape
    ){
        super();
    }

    //define getters and setters of this query. This simplifies access common
    //query properties: facyprs, measurements and summaries 
    get factors(){return this.shape!.factors}; 
    set factors(f){this.shape!.factors=f};
    
    get summaries(){return this.shape!.summaries}; 
    set summaries(f){this.shape!.summaries=f};
    
    get measurements(){return this.shape!.measurements}; 
    set measurements(f){this.shape!.measurements=f};
    
    //Complete the construction of this query by setting all properties
    //that need access to the server, i.e., asynchronuos access
    async initialize():Promise<void>{
        //
        //If the user has a prefered shape, use it; otherwise, derive a shape 
        //from the query
        this.shape = this.shape ?? await this.get_default_shape();
        //
        //Populate the factor levels "map", for each region.
        for(let region of (['crown', 'crest', 'crumb'] as Array<region_type>)) 
            await this.populate_factor_levels(region);
    }
    
    //Derive a shape from a pivot query
    async get_default_shape():Promise<shape>{
        //
        //Get the metadata from the body cte and separate the factors from 
        //measurements, using __sperator. (A future versin will have specific
        //separators for crest, crumb, measurement and summary sections
        const metadata:{factors:Array<string>, measurements:measurements} = await this.get_metadata();
        //
        //By default, all factors from the body cte are rest factors; crumb and
        //crown factors are empty
        const factors = {
            //
            //In future, we should eparate crest from crub factors in the base 
            //query. For now, assume all factors are crest-based
            crown:[],
            crest:metadata.factors,
            //
            //Traditionally, measurement is a crumb factor. In the next version
            //we should separate measurements from summaries
            crumb:['measurement'],
            summary:[]
        };
        //
        const measurements:measurements = metadata.measurements;
        //
        //Deriving bottom summaries require cte base on the base query. THis 
        //needs to be thouth about more carefully. It is basically summaries of
        //the base query without any factors and therfore no group by cte
        //E.g., `$basesql select sum(x) as f1, count(y) as f2, mean(j) as f2 crest`
        //so that fi is the i'th bottom summary factor 
        const summaries:summaries  = {right:[], bottom:[]};
        //
        //Return the derived shape
        return {factors, measurements, summaries};
    }

    //
    //Update the factors structure on droping the indexed factor to the named
    //region. The source is containd in the drag event
    update_factors_ondrop(ev:DragEvent,dest_key:region_type,dest_index:number){
        //
        //Determine the source of the data
        if(ev.dataTransfer===null)throw new schema.mutall_error('dataTransfer not set');
        const src_key = <region_type>ev.dataTransfer.getData('region');
        //
        //Get the factor's index; it is a number
        const src_index:number = +ev.dataTransfer.getData('index');
        //
        //From the source factors, remove one element at the given source index
        const Sources:Array<factor_type> = this.factors[src_key].splice(src_index, 1);
        //
        //To the destinatiion factors, add the removed sources at the destination index
        this.factors[dest_key].splice(dest_index, 0, ...Sources);
    }
    
//Populate the levels map with factor levels from the given region
private async populate_factor_levels(region:region_type){
    //
    //Get the factors of this region
    const factors:Array<factor_type> = this.factors![region];
    //
    //They must BE factors defined for the region, even if it is an empty list
    if (factors===undefined) throw new schema.mutall_error(`Region ${region} has no entry in teh levels map`);
    //
    //For each factor, get its levels
    for(const factor of factors) this.levels[factor]=await this.get_factor_levels(factor);
}

//Retrievs the levels of the given factor
private async get_factor_levels(factor:factor_type):Promise<Array<lib.basic_value>>{
    //
    //Measurements are  specially treated
    if (factor==='measurement'){
        const mlevels:Array<string> = Array.from(this.shape!.measurements.keys());
        return mlevels;
    }
    //For any other factor, use the base query to obtan the levels
    //
    //Compile the sql for retrieving the levels of the named factor
    //The query is base on the same table that we use for calculting
    //score percentages
    const sql = 
        `
        ${this.basequery}
        select distinct
            ${factor} as fname
        from percent;
        `;
    //
    //Execute the sql to levels of the named factor
    const data:Array<{fname:lib.basic_value}> = await server.exec(
        'database',
        //
        //Create the (incomplete, i.e., false parameter) database, execute the 
        //sql to return the data
        [this.dbname, false], 
        'get_sql_data',
        [sql]
    );
    //
    //The data will of the form:-
    //[{fname:2019}, {fname:2020}, {fname:2021} BUT whet we want is
    //[2019, 2020, 2121]
    //Convert the array of fname objects to an array of basic values
    return  data.map(({fname}) => fname);
}


    //
    //Get the metadata from the body cte and separate the factpos from 
    //measurements, using __sperator
    async get_metadata():Promise<{factors:Array<string>, measurements:measurements}>{
        //
        const columns: Array<lib.metadata> = await server.exec(
            'database',
            [this.dbname, false],
            'get_column_metadata',
            [`${this.basequery} table ${this.body}`]
        );
        //
        //Use the __separator extract factors and measurememts
        //
        //Get the separator position
        const i: number = columns.findIndex(C=>C.name==='__separator');
        //
        //Its an error if the searator cannot be found
        if (i===-1) throw new schema.mutall_error('No __separator column found');
        //
        //Factors are the first i elements 
        const factors: Array<string> = columns.slice(0, i).map(C => C.name);
        //
        //Measurements are the elements after the sepaator
        //Format the measurements, to editable from non-editable ones
        const measurements = this.get_measurement(i+1, columns);
        //
        return {factors, measurements};
    }
    
    //Get the measurements by using the presence or absence of the table
    //element from the column was drived
    get_measurement(i:number, columns:Array<lib.metadata>): measurements{
        //
        //Get the remaing colums after the separator
        const cols:Array<lib.metadata> = columns.slice(i);
        //
        //
        //Create the measueremnt map...
        const M = new Map();
        //
        //Convert the columns to measurements
        cols.forEach(C => {
            //
            //...that tracks the io type
            const Io = C.table===null ? 'read_only':{element:"input", type:'text'};
            //
            //...of a measurfement
            M.set(C.name, Io);
        });
        //
        //Retrun the measurements
       return M;
    }
    
    //Returns the data for filling up the body
    async get_body_data():Promise<Array<schema.fuel>>{
        //
        //Compile complete code for getting the data
        const sql:string =
            //
            // Adding our base query from the ranking file
            `${this.basequery},
            `
            //
            //Creating ctes from the derived factors
            + [...this.get_cte()].join(", ") 
            //
            //Add the final select statement
            //
            //Limit the number of rows as this might get very large very easily.
            //In future, consider scrolling -- the same way we do with the CRUD
            //interface        
            + ` 
              select * from crest limit ${this.limit} offset ${this.offset}`;
        //
        //Create the (incomplete, i.e., false parameter) database, execute the 
        //sql to return the data
        return await server.exec('database', [this.dbname],'get_sql_data', [sql]);    
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
        const conditions:Array<string> = this.factors!.crown.map(factor=>{
            //
            const pair = this.get_factor_value_pairs(factor);
            return `${pair.factor}='${pair.value}'`
        });
        //
        //Compile the pairs into a condition string by joinin them with an 'and' operator
        const condition = conditions.join(' and ');
        //
        //Compile the where clause
        const where:string = this.factors!.crown.length===0 ? "" : ` where ${condition}`;
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
        if (select.selectedIndex==-1) throw new schema.mutall_error(`Please select a ${factor}`)
        //
        return {factor:factor, value:select.value}
        
    }
    
    //Use crest factors for grouping the rows
    get_crest_cte():string{
        //
        //Get the crest factors
        const crest_factors:Array<factor_type> = this.factors!.crest;
        //
        //Join the factors so that they can be used in the sql
        const crest = crest_factors.join(',');
        //
        //If there are no crest factors remove the group by statement
        const select = crest_factors.length===0
            ? `select  json_arrayagg(value2) as raw_values from crumb`
            : `select ${crest}, json_arrayagg(value2) as raw_values from crumb group by ${crest}`;
        //
        //Rteirn the cte    
        return `crest as (${select})`;
    }
        
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
        const crumb_factors: Array<factor_type> = this.factors!.crumb;
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
            )`
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
            )`
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
        const measurements:Array<string> = Array.from(this.shape!.measurements.keys());
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
            from ${this.body}`;
        });
        //
        //Join the sub-statements with a 'union all' oparator
        const select:string = substatements.join(`\n union all `); 
       //
        return `\nmeasurements as ( ${select})`;
    }

    //Collect factor names
    *collect_factor_names():Generator<string>{
        //
        //Step through all the factor regions
        for(const region in this.factors){
            //
            //Get the factors in that region
            const factors:Array<factor_type> = this.factors[<region_type>region];  
            //
            for(const factor of factors){
                //
                //Exclude the 'measurement' factor
                if (factor==='measurement') continue;
                //
                yield '`' + factor + '`';
            }          
        }        
    }    
}