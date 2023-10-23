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
//Import server.
import * as server from "../../../schema/v/code/server.js";

//Resolve reference to the sheet class
import {sheet}  from "./sheet.js";
import {crosstab, shape}  from "./query.js";

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
                        title: "View Exam Results",
                        id: "view_exam_results",
                        listener: ["event", async ()=>{
                            //
                            //Create the exam results view, i.e., page;
                            const exam = new view_exam_results(this);
                            //
                            //Display the exam results view 
                            await exam.administer();
                        }]
                    }, 
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
    
}

//View the exemresults
class view_exam_results extends outlook.baby<void>{
    //
    //class constructor
    constructor(mother:main){
        super(mother,'./table.html');
    }

    async check(): Promise<boolean> {
        return true;
    }
    async get_result(): Promise<void> {
    }

    //Show the exam results
    public async show_panels(): Promise<void>{
       //
        //Get the base query customised for exam results
        const basesql= await server.exec(
            'path',
            ['/school/queries/ranking.sql', true],
            'get_file_contents',
            []
        );
        //
        //Define teh shape of the crosstab
        const Shape:shape = {
            //
            //Factprs as droved from teh percent cte
            /*
            school.id as school,
            year.value as year,
            class.name as class,
            exam.name as exam,
            sitting.date as date,

            subject.id as subject,
            
            stream.id as stream,
            student.name as student,
            
            */
            //
            //The layout of the factors, including the special one, measurement
            factors:{
                crown:['school', 'year', 'class', 'exam', 'date'],
                crumb:['subject', 'measurement'],
                crest:['stream', 'student']
            },
            //
            //The measurement factor level names and their io types, e.g., 
            //score:['input', 'number'], percent:'readonly'. NB. The order is important
            //measurements:Map<string, io.io_type>,
            measurements:new Map([
                ['score', 'number'], 
                ['percent', 'read_only'], 
                ['expectation', 'read_only'], 
                ['abc', 'read_only']
            ]),
            //
            //The list of the desired left and bottom summaries (to be computed 
            //automatically). E.g., left:['total', 'count'], bottom:['total]
            summaries:{right:[],bottom:[]}
        }
        //
        //Use the base sql to create the examiner query
        const Query = new crosstab('school', basesql, 'grading', 'percent', Shape);
        //
        //Complete the constrictin of the examiner query by calling teh 
        //asynchronous methods
        await Query.initialize();
        //
        //Use the query to create a new sheet
        const Sheet = new sheet(Query);
        //
        //Show the sheet
        await Sheet.show();
    }

}


