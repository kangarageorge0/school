//Resolves reference to the asset.products data type
import * as view from '../../../outlook/v/code/view.js';
//
//Import server.
import * as server from "../../../schema/v/code/server.js";
//Resolve references to a database
import * as schema from "../../../schema/v/code/schema.js";
//
//The crosstab is a special type of a query; we plan to have others
export class crosstab extends view.view {
    dbname;
    base_ctes;
    body_cte;
    factors_cte;
    shape;
    //
    //For pagination purposes, we need to limit the number of retrieved rows
    //from a given offset.
    limit = 200; //Why the choice of this default value?
    offset = 0;
    //
    constructor(
    //
    //The main dataase on which the pivot query is executed
    dbname, 
    //
    //The ctes that are the basis of this crosstab query
    base_ctes, 
    //
    //The body cte is used as in this case
    /*
    select  school,year,class,exam,stream,date,subject, 'score' as measurement, score as value from  grading
    union all
    select  school,year,class,exam,stream,date,subject, 'percent' as measurement, percent as value from  grading
    ...
    In this v+vase, grading is the body query
    */
    body_cte, 
    //
    //The name of the cte in the base query that identifies the factors to
    //be cross tabled. In teh case of the exam, it is teh percent cte. 
    factors_cte, 
    //
    //The structure of factors, measurements and summaries that define the
    //shape of a pivot query 
    shape) {
        super();
        this.dbname = dbname;
        this.base_ctes = base_ctes;
        this.body_cte = body_cte;
        this.factors_cte = factors_cte;
        this.shape = shape;
    }
    //define getters and setters of this query. This simplifies access common
    //query properties: factors, measurements and summaries 
    get factors() { return this.shape.factors; }
    ;
    set factors(f) { this.shape.factors = f; }
    ;
    get summaries() { return this.shape.summaries; }
    ;
    set summaries(s) { this.shape.summaries = s; }
    ;
    get measurements() { return this.shape.measurements; }
    ;
    set measurements(m) { this.shape.measurements = m; }
    ;
    //
    //Property for checking if measurements are in the crown
    get summary_required() { return !this.factors.crown.includes('measurement'); }
    ;
    //Compile the measurements ctes. It is an exention of the base ctes with the
    //meassurement cte
    get measurements_ctes() {
        return `${this.base_ctes}, \n${this.measurement_cte}`;
    }
    //retiurns teh measurement cte*/
    //Complete the construction of this query by setting all properties
    //that need access to the server, i.e., asynchronuos access
    async initialize() {
        //
        //If the user has a prefered shape, use it; otherwise, derive a shape 
        //from the query
        this.shape = this.shape ?? await this.get_default_shape();
    }
    //Derive a shape from a pivot query
    async get_default_shape() {
        //
        //Get the metadata from the body cte and separate the factors from 
        //measurements, using __sperator. (A future versin will have specific
        //separators for crest, crumb, measurement and summary sections
        const metadata = await this.get_metadata();
        //
        //By default, all factors from the body cte are rest factors; crumb and
        //crown factors are empty
        const factors = {
            //
            //In future, we should separate crest from crub factors in the base 
            //query. For now, assume all factors are crest-based
            crown: [],
            crest: metadata.factors,
            //
            //Traditionally, measurement is a crumb factor. In the next version
            //we should separate measurements from summaries
            crumb: ['measurement'],
            summary: []
        };
        //
        const measurements = metadata.measurements;
        //
        //Deriving bottom summaries require cte base on the base query. THis 
        //needs to be thouth about more carefully. It is basically summaries of
        //the base query without any factors and therfore no group by cte
        //E.g., `$basesql select sum(x) as f1, count(y) as f2, mean(j) as f2 crest`
        //so that fi is the i'th bottom summary factor 
        const summaries = { right: [], bottom: [] };
        //
        //Return the derived shape
        return { factors, measurements, summaries };
    }
    //
    //Get the metadata from the body cte and separate the factors from 
    //measurements, using __sperator
    async get_metadata() {
        //
        const columns = await server.exec('database', [this.dbname, false], 'get_column_metadata', [`${this.base_ctes} table ${this.factors_cte}`]);
        //
        //Use the __separator extract factors and measurememts
        //
        //Get the separator position
        const i = columns.findIndex(C => C.name === '__separator');
        //
        //Its an error if the searator cannot be found
        if (i === -1)
            throw new schema.mutall_error('No __separator column found');
        //
        //Factors are the first i elements 
        const factors = columns.slice(0, i).map(C => C.name);
        //
        //Measurements are the elements after the sepaator
        //Format the measurements, to editable from non-editable ones
        const measurements = this.get_measurement(i + 1, columns);
        //
        return { factors, measurements };
    }
    //Get the measurements by using the presence or absence of the table
    //element from the column was drived
    get_measurement(i, columns) {
        //
        //Get the remaing colums after the separator
        const cols = columns.slice(i);
        //
        //
        //Create the measueremnt map...
        const M = new Map();
        //
        //Convert the columns to measurements
        cols.forEach(C => {
            //
            //...that tracks the io type
            const Io = C.table === null ? 'read_only' : { element: "input", type: 'text' };
            //
            //...of a measurfement
            M.set(C.name, Io);
        });
        //
        //Retrun the measurements
        return M;
    }
    //The generator for all the crown, crest and crumb ctes that make up the 
    //completes the all_ctes of the crosstab
    *get_cte() {
        //
        //Crown filetring query
        yield this.get_crown_cte();
        //
        //The crumb query for summarising measurements
        yield this.get_crumb_cte();
        //
        //Use crest factors for grouping the rows
        yield this.get_crest_cte();
        //
        //Footer query
        yield this.get_bottom_cte();
    }
    //Returns the cte used for taking care of crown (filter) factors in our with statement
    //The cte has the following shape:
    //    crown as ( select measurements.* from measurements 
    //      where school='kaps' and year=2019) 
    //where crown is the name of the current cte and measurement is the name of a previous one
    //If there are no crown factprs then teh where clause should not be included 
    get_crown_cte() {
        //
        //Work out the where condition, e.g., school='kaps' and year=2019, by collection 
        //all teh factor/value pairs that make up the whre clause
        const conditions = this.factors.crown.map(factor => {
            //
            const pair = this.get_factor_value_pairs(factor);
            return `${pair.factor}='${pair.value}'`;
        });
        //
        //Compile the pairs into a condition string by joinin them with an 'and' operator
        const condition = conditions.join(' and ');
        //
        //Compile the where clause
        const where = this.factors.crown.length === 0 ? "" : ` where ${condition}`;
        //
        //Compile the complete cte    
        return `
            crown as (
                select 
                    measurements.* 
                from measurements 
                ${where}\n\t)\n`;
    }
    //Examples of a factor/value pair is
    //school = 'kap'
    //The values come from the crown filters
    get_factor_value_pairs(factor) {
        //
        //NB. The crown filters are identified by their factor names
        const select = this.get_element(factor);
        //
        //Ensure that there is a selection
        if (select.selectedIndex == -1)
            throw new schema.mutall_error(`Please select a ${factor}`);
        //
        return { factor: factor, value: select.value };
    }
    //Construct a crest cte. 
    /*
    Here is the generic form:-
    select
        [crest_factor,...]
        json_arrayagg(crumb.value2) as raw_values,
        [$summary(crumb.value[->>'$.value']),...]
    from
        crumb
    group by
        [crest_factor,...]
    
    Here is an actual cte-
    
    select
        username,
        json_arrayagg(value2) as raw_values,
        SUM(value->>'$.value') AS SUM,
        COUNT(value) AS count,
        AVG(JSON_EXTRACT(value, '$.value')) AS AVG
    from
        crumb
    group by
        username
    */
    get_crest_cte() {
        //
        //Get the crest factors and join them so that they can be used in the sql
        const crest = this.factors.crest.join(', ');
        //
        //Get the right margin summaries
        const summaries = this.get_summaries_using('right');
        //
        //If there are no crest factors remove the group by statement
        const select = this.factors.crest.length === 0
            ? `select  
                    json_arrayagg(value2) as raw_values
                    ${summaries} 
                from crumb`
            : `select 
                    ${crest}, 
                    json_arrayagg(value2) as raw_values  
                    ${summaries}
                from 
                    crumb 
                    group by ${crest}`;
        //
        //Return the cte    
        return `
            crest as (
                ${select}
            )\n`;
    }
    /*
     The generic shape of the summary clause is:-
     
    [$summary(crumb.value[->>'$.value']),...]
    
    NB. The extraction operator depedms on whether the raw measurement is
    colored or not
    
    The actual sql fragments for colured and non-colored cases are:-
    
    1) SUM(value->>'$.value') AS SUM, COUNT(value->>'$.value') AS count,
    2) SUM(value) AS SUM, COUNT(value) AS count,
    round(avg(value),0)
    
    In the first case, the measurement is colred; in the next, it is not
   */
    get_summaries_using(summaries) {
        //
        //If the  measuerement id not on yhe crown, retirn an empty summary
        if (this.summary_required)
            return "";
        //
        //Get the right summary
        const names = this.summaries[summaries];
        //
        //If the value is a json object, extract it; otherwise use it as its
        const value = this.coloured_measurement() ? `value->>'$.value'` : `value`;
        //
        // Iterate over the checked items and create the corresponding case statements4
        //NB. Note the lrading comma!
        const sqls = names.map(name => `, round(${name}(${value}),0) as ${name}`);
        //
        //Note the abscence of the parpt, as it is part of mapping
        return sqls.join("");
    }
    ;
    //
    //Summaries are only sensible when they are in the crown section
    //To check if a measurement has the color attribute or not, we get the 
    //measurement in the crown, get its value, and using the measurement map,
    //extract the values io_type and color
    coloured_measurement() {
        //
        //Summaries can only be calculated if measurements are in the crown
        if (!this.factors.crown.includes('measurement')) {
            throw new schema.mutall_error('There are no measurements in the \n\
            crown hence no calculations can be done');
        }
        //
        //Get the selected measurement in the crown
        //Get the value of the measurement
        const element = this.get_element('measurement');
        const name = element.value;
        //
        //Get the selected value in the measurements map
        const item = this.measurements.get(name);
        //
        //if item is undefined
        if (item === undefined)
            throw new schema.mutall_error('item being tested for color is unidefined');
        //
        //if color is undefined return false else return the color
        return item.colored === undefined ? false : item.colored;
    }
    //
    //The crumb query for summarising measurements
    /*
   Here is the generic form:-
   select
       crown.*,
       json_object(
               'id', concat_ws('/', [crumb_factor,...]),
               'value',value
           ) as value2
   from
       crown
   
   Here is an actual cte-
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
    get_crumb_cte() {
        //
        //get the crest factors
        const crumb_factors = this.factors.crumb;
        //
        //Join the factors so that they can be used in the sql
        const crumb = crumb_factors.join(',');
        //
        //Consider the options of when there are no crumb factors. Note the null id
        if (crumb_factors.length === 0) {
            return `
                crumb as (
                select
                    crown.*,
                    json_object(
                        'id', null,
                        'value',value
                    ) as value2
                from crown    
            )`;
        }
        // 
        //else when the factors are there, use an underbar to separate the cell_id parts
        else {
            return `
                crumb as (
                select
                    crown.*,
                    json_object(
                        'id', concat_ws('_', ${crumb}),
                        'value',value
                    ) as value2
                 from crown    
            )`;
        }
    }
    //
    //'sum', SUM(value->>'$.value')|SUM(value),  
    //    'count', count(value->>'$.value')|count(value),
    //    'avg', round(avg(value->>'$.value'))|round(avg(value), 0)
    //     sum(value) as sum, count(value) as count, avg(value) as avg
    //The bottom cte for getting the bottom summaries
    /*select
        sum(value) as total,
        count(value) as count,
        'avg', round(avg(value->>'$.value'))|round(avg(value), 0),
        concat_ws('_', year,stream,subject) as id
     from crown
    group by concat_ws('_', year,stream,subject)*/
    get_bottom_cte() {
        //
        //Get the crest factors
        const crumb_factors = this.factors.crumb;
        //Get the right margin summaries
        const summaries = this.get_summaries('bottom');
        //
        //Join the factors so that they can be used in the sql
        const crumb = crumb_factors.join(',');
        //Consider the options of when there are no crumb factors.
        if (crumb_factors.length === 0) {
            throw new schema.mutall_error('There are no crumb factors');
        }
        // 
        //else when the factors are there, use an underbar to separate the cell_id parts
        else {
            return `
                bottom as (
                 select
                    json_object(
                        ${summaries}
                    ) as summaries,
                    concat_ws('_', ${crumb}) as id  
                 from crown
                group by concat_ws('_', ${crumb})    
            )`;
        }
    }
    /*
     The generic shape of the summary clause is:-
     
    [$summary(crumb.value[->>'$.value']),...]
    
    NB. The extraction operator depedms on whether the raw measurement is
    colored or not
    
    The actual sql fragments for colured and non-colored cases are:-
    
    1) SUM(value->>'$.value') AS SUM, COUNT(value->>'$.value') AS count,
    2) SUM(value) AS SUM, COUNT(value) AS count,
    
    In the first case, the measurement is colred; in the next, it is not
   */
    get_summaries(summaries) {
        //
        //Get the right summary
        const names = this.summaries[summaries];
        //
        //If the value is a json object, extract it; otherwise use it as its
        //'sum', SUM(value->>'$.value')|SUM(value)
        const value = this.coloured_measurement() ? `value->>'$.value'` : `value`;
        //
        // Iterate over the checked items and create the corresponding case statements
        const sqls = names.map(name => `'${name}',round(${name}(${value}),0)`);
        return sqls.join(", ");
    }
    ;
    //
    //The ctes, viz., crown, crund and cres,  that extend the base one. 
    //They are derived by executing some of the cte in the base. In particular
    //factors_cte is a cte that returns all the factors to be crosstabled 
    get all_ctes() {
        //
        //Compile the ctes to be used by both the header and body 
        //sections. Note this is not a query initialization job, as this must be
        //done every time we re-arrange factors of the cross tab
        //
        // Get the base ctes that were used for constructing the query plus the
        //measutrements one.
        return `${this.measurements_ctes},\n`
            //
            //Create crown, crum and crest ctes from the derived factors
            + [...this.get_cte()].join(",\n");
    }
    //
    //This Cte is a union of measurements. I has the following general structure:-
    /*
    
    select  [all factors],
        [Crumb_factor_levels] as measurement,  //set Crumb_factor_levels as a measurement
        [Crumb_factor_levels] as value from  grading //we get the value which is just a number or string
        union all
        select  school,year,class,exam,stream,date,subject, 'percent' as measurement, percent as value from  grading
        union all
        from grading
    )*/
    /* returns the cte with the value as an object
            select
                [all factors],
                'contribution' as measurement, //set contribution as a measurement
                contribution as value
                  //this is the value we come with from the previous table which
                  is an object json_object('value',color.amount, 'color',color.color) as contribution
            from status
     */
    get measurement_cte() {
        //
        //Get the measurement levels
        const measurements = Array.from(this.shape.measurements.keys());
        //
        //There must be at least one measurement for tabulation
        if (measurements.length === 0)
            throw new schema.mutall_error('There are no measurements to tabulate');
        //
        //Map the measurements to the union sub-statements
        const substatements = measurements.map(measurement => {
            //
            //Collect all the factors in our tabulatin query
            const factors = [...this.collect_factor_names()];
            //
            //Return the substatement
            return `select 
                ${factors.join(', ')}, 
                '${measurement}' as measurement,
                ${measurement} as value 
            from ${this.body_cte}`;
        });
        //
        //Join the sub-statements with a 'union all' oparator
        const select = substatements.join(`\n union all `);
        //
        return `
        measurements as (
            ${select}
        )`;
    }
    //Collect factor names
    *collect_factor_names() {
        //
        //Step through all the factor regions
        for (const region in this.factors) {
            //
            //Get the factors in that region
            const factors = this.factors[region];
            //
            for (const factor of factors) {
                //
                //Exclude the 'measurement' factor
                if (factor === 'measurement')
                    continue;
                //
                yield '`' + factor + '`';
            }
        }
    }
}
