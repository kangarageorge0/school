//Load data from a range in an Excel worksheet to a database
//
//Create an instance of the excel class
import {workbook, layout} from "./excel.js";
const xl = new workbook('example.xlsx');
//
//Load the example file from the current folder
const result:Array<layout> = await xl.load_data(); 
//
//Report the results before writing them to a database
console.log(result);


