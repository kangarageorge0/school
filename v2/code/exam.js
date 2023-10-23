//
import { page } from "../../../outlook/v/code/view.js";
//Import server.
import * as server from "../../../schema/v/code/server.js";
//Resolve reference to the sheet class
import * as query from "./query.js";
//
import * as sheet from "./sheet.js";
//View the exemresults
export class exam extends page {
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
        //Define the shape of the pivot query
        //
        //Define the desired facor structure
        const factors = {
            crown: ['school', 'year', 'class', 'exam', 'date'],
            crest: ['stream', 'student'],
            crumb: ['subject', 'measurement']
        };
        //The measurement levels and their io tyypes
        const measurements = new Map([
            ['value', 'number'],
            ['percent', 'read_only'],
            ['expectation', 'read_only']
        ]);
        //
        //No margin summaries
        const summaries = { right: [], bottom: [] };
        //
        const shape = { factors, measurements, summaries };
        //
        //Use the base sql to create the examiner query
        const Query = new query.crosstab('school', basesql, 'grading', 'percent', shape);
        //
        //Use the query to create a new sheet using the user defined factors and
        //measrements
        const Sheet = new sheet.sheet(Query);
        //
        //Show the sheet
        await Sheet.show();
    }
}
