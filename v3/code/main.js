//Import app from the outlook library.
//
//Resolves reference to the asset.products data type
import * as outlook from '../../../outlook/v/code/outlook.js';
//
//Resolves the app than main extends
import * as app from "../../../outlook/v/code/app.js";
//
//Import the test msg class.
import * as msg from "./msg.js";
//
//Import server.
import * as server from "../../../schema/v/code/server.js";
//Resolve reference to the sheet class
import { sheet } from "./sheet.js";
import { query } from "./query.js";
//
export default class main extends app.app {
    //
    //Initialize the main application.
    constructor(config) {
        super(config);
    }
    //
    //Retuns all the products that are specific to this application. They are
    //used to exapnd those from the base application
    get_products_specific() {
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
                        listener: ["event", () => { this.new_msg(); }]
                    },
                    {
                        title: "View Exam Results",
                        id: "view_exam_results",
                        listener: ["event", async () => {
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
        ];
    }
    //
    //Allow the user to create a new message and save it in the database.
    async new_msg() {
        //
        //1. Create a pop that facilitates sending a new message.
        const Msg = new msg.msg(this);
        //
        //Collect all the data from the user.
        const result = await Msg.administer();
        //
        //Check the validity of the data.
        if (result === undefined)
            return;
        //
        //Use the questionnare in php class to save the data to the database.
        //
    }
}
//View the exemresults
class view_exam_results extends outlook.baby {
    //
    //class constructor
    constructor(mother) {
        super(mother, './table.html');
    }
    async check() {
        return true;
    }
    async get_result() {
    }
    //Show the exam results
    async show_panels() {
        //
        //Get the base query customised for exam results
        const basesql = await server.exec('path', ['/school/queries/ranking.sql', true], 'get_file_contents', []);
        //
        //Use the base sql to create the examiner query
        const Query = new query('school', basesql, 'grading');
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