//Defining the data types that drive the CRUD functionality of the tabulation system

import {fuel, basic_value} from "../../../schema/v/code/schema.js";

//The complete data set
type Isheet = {
    //A paginator is an array of...
    //{pass:'kaps/7/KNEC/'2019-05-03', factors:{school:'kaps', class:7, exam:'KNEC', date:'2019-05-03'}
    //NB the factors drive the selection of a filter
    paginator:Array<{pass:string, factors:fuel}>,
    //
    //A filter isn array of..
    //{school:['kaps'],class:[1,2,3,4,5],exam:['knec','kcpe'],measurement:['value','percent','grade']}
    filter:Array<{[factor:string]:Array<basic_value>}>,
    //
    matrix:{
    
        header:Array<{
            crest:Array<string>, 
            crumb:Array<{pass:string, factors:fuel}>, 
            summary:Array<string>
        }>,
        // 
        body:Array<{
            crest:{pass:string, factors:fuel}, 
            crumb:Array<{pass:string, factors:fuel, cell:Icell}>,
            summary:fuel
        }>,
        //
        footer:{crumb:Array<Ifootercrumb>, summary:fuel}
    }    
};

type Icell = {
    value:basic_value,//obtained from dbase/query
    color?:string, //If desired
    pk?:number,//For raw data, not calculated
    udf?:fuel //For the onhover event
}


type Ifootercrumb = {
    summaries:Array<summaries>
    identifier:Array<string>
}
